/**
 * SlideSpeak PowerPoint Generation Service
 * 
 * Modular service for generating professional PowerPoint presentations
 * via the SlideSpeak API for FinanceCompass assessments and reports.
 */

import { z } from "zod";
import { db } from "../../db";
import { fcDocumentJobs, fcAssessments, fcCompanies, fcReports } from "@shared/finance-compass-schema";
import { eq } from "drizzle-orm";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("slidespeak-service");

const SLIDESPEAK_API_URL = "https://api.slidespeak.co/api/v1";

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 10000;

// Input validation schemas
const slideContentSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.array(z.string().max(2000)),
  notes: z.string().max(5000).optional(),
  layout: z.enum(["title", "content", "two_column", "chart", "comparison"]).optional(),
});

const presentationConfigSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(200).optional(),
  author: z.string().max(100).optional(),
  theme: z.enum(["professional", "modern", "corporate"]).optional(),
  slides: z.array(slideContentSchema).min(1).max(50),
  branding: z.object({
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    logoUrl: z.string().url().optional(),
  }).optional(),
});

const generatePresentationInputSchema = z.object({
  assessmentId: z.string().uuid(),
  requestedBy: z.string().optional(),
});

interface SlideContent {
  title: string;
  content: string[];
  notes?: string;
  layout?: "title" | "content" | "two_column" | "chart" | "comparison";
}

interface PresentationConfig {
  title: string;
  subtitle?: string;
  author?: string;
  theme?: "professional" | "modern" | "corporate";
  slides: SlideContent[];
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
  };
}

interface SlideSpeakResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  downloadUrl?: string;
  error?: string;
}

export class SlideSpeakService {
  private apiKey: string;
  
  constructor() {
    const key = process.env.SLIDESPEAK_API_KEY;
    if (!key) {
      log.warn("SLIDESPEAK_API_KEY not configured - PowerPoint generation will be unavailable");
    }
    this.apiKey = key || "";
  }

  private isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateBackoff(attempt: number): number {
    const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
    return Math.min(backoff, MAX_BACKOFF_MS);
  }

  private async makeRequestWithRetry(
    endpoint: string, 
    options: RequestInit = {},
    retries = MAX_RETRIES
  ): Promise<Response> {
    if (!this.isConfigured()) {
      throw new Error("SlideSpeak API key not configured");
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(`${SLIDESPEAK_API_URL}${endpoint}`, {
          ...options,
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...options.headers,
          },
        });

        // Don't retry on client errors (4xx), only on server errors (5xx) or network issues
        if (response.ok) {
          return response;
        }

        if (response.status >= 400 && response.status < 500) {
          const errorText = await response.text();
          throw new Error(`SlideSpeak API client error: ${response.status} - ${errorText}`);
        }

        // Server error - retry with backoff
        const errorText = await response.text();
        lastError = new Error(`SlideSpeak API server error: ${response.status} - ${errorText}`);
        
        if (attempt < retries - 1) {
          const backoffMs = this.calculateBackoff(attempt);
          log.info({ attempt: attempt + 1, retries, backoffMs }, "Retrying after backoff");
          await this.sleep(backoffMs);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Network errors - retry with backoff
        if (attempt < retries - 1) {
          const backoffMs = this.calculateBackoff(attempt);
          log.info({ attempt: attempt + 1, retries, backoffMs }, "Network error, retrying after backoff");
          await this.sleep(backoffMs);
        }
      }
    }

    throw lastError || new Error("SlideSpeak API request failed after retries");
  }

  async generatePresentation(config: PresentationConfig): Promise<SlideSpeakResponse> {
    // Validate input
    const validatedConfig = presentationConfigSchema.parse(config);

    const payload = {
      title: validatedConfig.title,
      subtitle: validatedConfig.subtitle,
      author: validatedConfig.author || "Constancia FinanceCompass",
      theme: validatedConfig.theme || "professional",
      slides: validatedConfig.slides.map(slide => ({
        title: slide.title,
        content: slide.content,
        speaker_notes: slide.notes,
        layout: slide.layout || "content",
      })),
      branding: validatedConfig.branding ? {
        primary_color: validatedConfig.branding.primaryColor,
        secondary_color: validatedConfig.branding.secondaryColor,
        logo_url: validatedConfig.branding.logoUrl,
      } : undefined,
    };

    const response = await this.makeRequestWithRetry("/presentations", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return response.json();
  }

  async checkStatus(presentationId: string): Promise<SlideSpeakResponse> {
    // Validate presentationId
    if (!presentationId || typeof presentationId !== 'string' || presentationId.length < 1) {
      throw new Error("Invalid presentation ID");
    }

    const response = await this.makeRequestWithRetry(`/presentations/${encodeURIComponent(presentationId)}`);
    return response.json();
  }

  async waitForCompletion(presentationId: string, maxWaitMs = 120000): Promise<SlideSpeakResponse> {
    const startTime = Date.now();
    const pollInterval = 3000;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const status = await this.checkStatus(presentationId);
        
        if (status.status === "completed" || status.status === "failed") {
          return status;
        }

        await this.sleep(pollInterval);
      } catch (error) {
        log.error({ err: error }, "Error checking status");
        // Continue polling unless we've exceeded max wait time
        if (Date.now() - startTime >= maxWaitMs) {
          throw error;
        }
        await this.sleep(pollInterval);
      }
    }

    throw new Error("Presentation generation timed out");
  }

  async createDocumentJob(
    assessmentId: string,
    documentType: string,
    inputData: Record<string, unknown>,
    requestedBy?: string
  ): Promise<string> {
    // Validate inputs
    if (!assessmentId || typeof assessmentId !== 'string') {
      throw new Error("Invalid assessment ID");
    }
    if (!documentType || typeof documentType !== 'string') {
      throw new Error("Invalid document type");
    }

    try {
      const [job] = await db.insert(fcDocumentJobs).values({
        assessmentId,
        documentType,
        provider: "slidespeak",
        inputData,
        requestedBy,
        status: "pending",
      }).returning();

      return job.id;
    } catch (error) {
      log.error({ err: error }, "Failed to create document job");
      throw new Error("Failed to persist document job to storage");
    }
  }

  async updateJobStatus(
    jobId: string,
    status: string,
    updates: Partial<{
      externalId: string;
      outputUrl: string;
      outputPath: string;
      fileSize: number;
      errorMessage: string;
      startedAt: Date;
      completedAt: Date;
    }>
  ): Promise<void> {
    if (!jobId || typeof jobId !== 'string') {
      throw new Error("Invalid job ID");
    }

    try {
      await db.update(fcDocumentJobs)
        .set({ status, ...updates })
        .where(eq(fcDocumentJobs.id, jobId));
    } catch (error) {
      log.error({ err: error }, "Failed to update job status");
      throw new Error("Failed to update job status in storage");
    }
  }

  async generateAssessmentPresentation(assessmentId: string, requestedBy?: string): Promise<string> {
    // Validate input
    const validated = generatePresentationInputSchema.parse({ assessmentId, requestedBy });

    const [assessment] = await db.select()
      .from(fcAssessments)
      .where(eq(fcAssessments.id, validated.assessmentId));

    if (!assessment) {
      throw new Error("Assessment not found");
    }

    let company = null;
    if (assessment.companyId) {
      [company] = await db.select()
        .from(fcCompanies)
        .where(eq(fcCompanies.id, assessment.companyId));
    }

    const [report] = await db.select()
      .from(fcReports)
      .where(eq(fcReports.assessmentId, validated.assessmentId));

    const jobId = await this.createDocumentJob(
      validated.assessmentId,
      "pptx_presentation",
      { assessmentId: validated.assessmentId, companyId: company?.id },
      validated.requestedBy
    );

    const slides = this.buildAssessmentSlides(assessment, company, report);

    try {
      await this.updateJobStatus(jobId, "processing", { startedAt: new Date() });

      const result = await this.generatePresentation({
        title: `Finance Transformation Assessment`,
        subtitle: company?.name || "Confidential",
        author: "Constancia FinanceCompass",
        theme: "professional",
        slides,
        branding: {
          primaryColor: "#0A1628",
          secondaryColor: "#00D4FF",
        },
      });

      await this.updateJobStatus(jobId, "processing", { externalId: result.id });

      const finalResult = await this.waitForCompletion(result.id);

      if (finalResult.status === "completed" && finalResult.downloadUrl) {
        await this.updateJobStatus(jobId, "completed", {
          outputUrl: finalResult.downloadUrl,
          completedAt: new Date(),
        });
      } else {
        await this.updateJobStatus(jobId, "failed", {
          errorMessage: finalResult.error || "Generation failed",
          completedAt: new Date(),
        });
      }

      return jobId;
    } catch (error) {
      await this.updateJobStatus(jobId, "failed", {
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      });
      throw error;
    }
  }

  private buildAssessmentSlides(
    assessment: typeof fcAssessments.$inferSelect,
    company: typeof fcCompanies.$inferSelect | null,
    report: typeof fcReports.$inferSelect | null
  ): SlideContent[] {
    const slides: SlideContent[] = [];

    slides.push({
      title: "Finance Transformation Assessment",
      content: [
        company?.name || "Your Organisation",
        `Assessment Date: ${new Date(assessment.createdAt).toLocaleDateString("en-GB")}`,
        "Prepared by Constancia FinanceCompass",
      ],
      layout: "title",
    });

    slides.push({
      title: "Executive Summary",
      content: [
        report?.executiveSummary || "This assessment evaluates your finance function's readiness for transformation.",
        `Overall Readiness Score: ${assessment.epmReadinessScore ?? "Pending"}%`,
        `Urgency Level: ${assessment.urgencyScore ?? "Pending"}/5`,
      ],
      layout: "content",
    });

    if (assessment.dimensionScores) {
      try {
        const scores = assessment.dimensionScores as Record<string, number>;
        slides.push({
          title: "Dimension Scores",
          content: Object.entries(scores).map(([dim, score]) => 
            `${dim.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}: ${score}/5`
          ),
          layout: "content",
        });
      } catch {
        // Skip dimension scores slide if data is malformed
      }
    }

    if (assessment.quickWins) {
      try {
        const wins = assessment.quickWins as string[];
        if (Array.isArray(wins) && wins.length > 0) {
          slides.push({
            title: "Quick Wins",
            content: wins.slice(0, 5).map(w => String(w)),
            layout: "content",
          });
        }
      } catch {
        // Skip quick wins slide if data is malformed
      }
    }

    if (assessment.recommendations) {
      try {
        const recs = assessment.recommendations as string[];
        if (Array.isArray(recs) && recs.length > 0) {
          slides.push({
            title: "Key Recommendations",
            content: recs.slice(0, 5).map(r => String(r)),
            layout: "content",
          });
        }
      } catch {
        // Skip recommendations slide if data is malformed
      }
    }

    slides.push({
      title: "Next Steps",
      content: [
        "Review detailed findings with your leadership team",
        "Prioritise transformation initiatives based on impact and effort",
        "Engage with Constancia for strategic guidance and implementation support",
        "Contact: info@constancia.io | www.constancia.com",
      ],
      layout: "content",
    });

    return slides;
  }

  async getJobStatus(jobId: string): Promise<typeof fcDocumentJobs.$inferSelect | null> {
    if (!jobId || typeof jobId !== 'string') {
      return null;
    }

    try {
      const [job] = await db.select()
        .from(fcDocumentJobs)
        .where(eq(fcDocumentJobs.id, jobId));
      return job || null;
    } catch (error) {
      log.error({ err: error }, "Error fetching job status");
      return null;
    }
  }

  async listJobsForAssessment(assessmentId: string): Promise<(typeof fcDocumentJobs.$inferSelect)[]> {
    if (!assessmentId || typeof assessmentId !== 'string') {
      return [];
    }

    try {
      return db.select()
        .from(fcDocumentJobs)
        .where(eq(fcDocumentJobs.assessmentId, assessmentId));
    } catch (error) {
      log.error({ err: error }, "Error listing jobs");
      return [];
    }
  }
}

export const slideSpeakService = new SlideSpeakService();
