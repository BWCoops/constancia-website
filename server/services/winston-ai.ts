import { db } from "../db";
import { winstonAiScans, blogPosts } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("winston-ai");

const WINSTON_API_BASE = "https://api.gowinston.ai/v2";
const WINSTON_AI_API_KEY = process.env.WINSTON_AI_API_KEY;

interface WinstonAIDetectionResponse {
  status: number;
  score: number;
  sentences?: Array<{
    text: string;
    score: number;
  }>;
  input?: string;
  attack_detected?: {
    zero_width_space: boolean;
    homoglyph_attack: boolean;
  };
  readability_score?: number;
  credits_used: number;
  credits_remaining: number;
  version?: string;
  language?: string;
}

interface WinstonPlagiarismResponse {
  status: number;
  scanInformation?: {
    service: string;
    scanTime: string;
    inputType: string;
  };
  result?: {
    score: number;
    sourceCounts: number;
    textWordCounts: number;
    totalPlagiarismWords: number;
    identicalWordCounts: number;
    similarWordCounts: number;
  };
  sources?: Array<{
    score: number;
    canAccess: boolean;
    url: string;
    title: string;
    plagiarismWords: number;
    identicalWordCounts: number;
    similarWordCounts: number;
    totalNumberOfWords: number;
    author?: string;
    description?: string;
    publishedDate?: number;
    plagiarismFound?: Array<{
      startIndex: number;
      endIndex: number;
      sequence: string;
    }>;
    is_excluded: boolean;
  }>;
  attackDetected?: {
    zero_width_space: boolean;
    homoglyph_attack: boolean;
  };
  citations?: string[];
  credits_used: number;
  credits_remaining: number;
}

interface ScanResult {
  scanId: string;
  blogPostId: string;
  scanType: "ai_detection" | "plagiarism" | "both";
  aiScore?: number;
  humanScore?: number;
  plagiarismScore?: number;
  creditsUsed: number;
  sentenceResults?: string;
  plagiarismSources?: string;
  status: "completed" | "failed" | "pending";
  errorMessage?: string;
}

function stripHtmlAndMarkers(content: string): string {
  let text = content
    .replace(/<[^>]*>/g, " ")
    .replace(/\[KEY_TAKEAWAY_GRID\][^[]*\[\/KEY_TAKEAWAY_GRID\]/gi, "")
    .replace(/\[SUCCESS_FACTORS\][^[]*\[\/SUCCESS_FACTORS\]/gi, "")
    .replace(/\[FIVE_PILLARS\][^[]*\[\/FIVE_PILLARS\]/gi, "")
    .replace(/\[IMPLEMENTATION_TIMELINE\][^[]*\[\/IMPLEMENTATION_TIMELINE\]/gi, "")
    .replace(/\[CHART:[^\]]*\][^[]*\[\/CHART\]/gi, "")
    .replace(/\[RESOURCE_LINK:[^\]]*\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  
  return text;
}

async function makeWinstonRequest<T>(
  endpoint: string,
  body: Record<string, unknown>,
  retries = 3
): Promise<T> {
  if (!WINSTON_AI_API_KEY) {
    throw new Error("Winston AI API key not configured");
  }

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${WINSTON_API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WINSTON_AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Winston AI API error: ${response.status} - ${errorText}`);
      }

      return await response.json() as T;
    } catch (error: any) {
      lastError = error;
      log.error({ err: error instanceof Error ? error : new Error(String(error.message)), attempt: attempt + 1 }, "Request attempt failed");
      
      if (attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Winston AI request failed after all retries");
}

export async function scanForAIContent(
  blogPostId: string,
  adminId: string
): Promise<ScanResult> {
  const [post] = await db.select({
    id: blogPosts.id,
    title: blogPosts.title,
    content: blogPosts.content,
  })
  .from(blogPosts)
  .where(eq(blogPosts.id, blogPostId))
  .limit(1);

  if (!post) {
    throw new Error("Blog post not found");
  }

  const cleanContent = stripHtmlAndMarkers(post.content);
  const textToScan = `${post.title}\n\n${cleanContent}`;

  const [scanRecord] = await db.insert(winstonAiScans).values({
    blogPostId,
    scanType: "ai_detection",
    status: "pending",
    scannedBy: adminId,
  }).returning();

  try {
    const response = await makeWinstonRequest<WinstonAIDetectionResponse>(
      "/ai-content-detection",
      {
        text: textToScan,
        sentences: true,
        language: "en",
      }
    );

    const humanScore = Math.round(response.score);
    const aiScore = Math.round(100 - response.score);

    await db.update(winstonAiScans)
      .set({
        aiScore,
        humanScore,
        creditsUsed: response.credits_used,
        sentenceResults: response.sentences ? JSON.stringify(response.sentences) : null,
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(winstonAiScans.id, scanRecord.id));

    return {
      scanId: scanRecord.id,
      blogPostId,
      scanType: "ai_detection",
      aiScore,
      humanScore,
      creditsUsed: response.credits_used,
      sentenceResults: response.sentences ? JSON.stringify(response.sentences) : undefined,
      status: "completed",
    };
  } catch (error: any) {
    await db.update(winstonAiScans)
      .set({
        status: "failed",
        errorMessage: error.message,
        completedAt: new Date(),
      })
      .where(eq(winstonAiScans.id, scanRecord.id));

    return {
      scanId: scanRecord.id,
      blogPostId,
      scanType: "ai_detection",
      creditsUsed: 0,
      status: "failed",
      errorMessage: error.message,
    };
  }
}

export async function scanForPlagiarism(
  blogPostId: string,
  adminId: string
): Promise<ScanResult> {
  const [post] = await db.select({
    id: blogPosts.id,
    title: blogPosts.title,
    content: blogPosts.content,
  })
  .from(blogPosts)
  .where(eq(blogPosts.id, blogPostId))
  .limit(1);

  if (!post) {
    throw new Error("Blog post not found");
  }

  const cleanContent = stripHtmlAndMarkers(post.content);
  const textToScan = `${post.title}\n\n${cleanContent}`;

  const [scanRecord] = await db.insert(winstonAiScans).values({
    blogPostId,
    scanType: "plagiarism",
    status: "pending",
    scannedBy: adminId,
  }).returning();

  try {
    const response = await makeWinstonRequest<WinstonPlagiarismResponse>(
      "/plagiarism",
      {
        text: textToScan,
        language: "en",
        country: "uk",
      }
    );

    const plagiarismScore = Math.round(response.result?.score ?? 0);

    await db.update(winstonAiScans)
      .set({
        plagiarismScore,
        creditsUsed: response.credits_used,
        sentenceResults: response.sources ? JSON.stringify(response.sources) : null,
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(winstonAiScans.id, scanRecord.id));

    return {
      scanId: scanRecord.id,
      blogPostId,
      scanType: "plagiarism",
      plagiarismScore,
      creditsUsed: response.credits_used,
      plagiarismSources: response.sources ? JSON.stringify(response.sources) : undefined,
      status: "completed",
    };
  } catch (error: any) {
    await db.update(winstonAiScans)
      .set({
        status: "failed",
        errorMessage: error.message,
        completedAt: new Date(),
      })
      .where(eq(winstonAiScans.id, scanRecord.id));

    return {
      scanId: scanRecord.id,
      blogPostId,
      scanType: "plagiarism",
      creditsUsed: 0,
      status: "failed",
      errorMessage: error.message,
    };
  }
}

export async function scanBlogPost(
  blogPostId: string,
  adminId: string,
  scanType: "ai_detection" | "plagiarism" | "both" = "both"
): Promise<ScanResult[]> {
  const results: ScanResult[] = [];

  if (scanType === "ai_detection" || scanType === "both") {
    const aiResult = await scanForAIContent(blogPostId, adminId);
    results.push(aiResult);
  }

  if (scanType === "plagiarism" || scanType === "both") {
    const plagiarismResult = await scanForPlagiarism(blogPostId, adminId);
    results.push(plagiarismResult);
  }

  return results;
}

export async function getScanHistory(blogPostId: string) {
  return await db.select()
    .from(winstonAiScans)
    .where(eq(winstonAiScans.blogPostId, blogPostId))
    .orderBy(winstonAiScans.createdAt);
}

export async function getAllScans(limit = 50) {
  return await db.select({
    id: winstonAiScans.id,
    blogPostId: winstonAiScans.blogPostId,
    scanType: winstonAiScans.scanType,
    aiScore: winstonAiScans.aiScore,
    humanScore: winstonAiScans.humanScore,
    plagiarismScore: winstonAiScans.plagiarismScore,
    seoScore: winstonAiScans.seoScore,
    seoRecommendations: winstonAiScans.seoRecommendations,
    creditsUsed: winstonAiScans.creditsUsed,
    status: winstonAiScans.status,
    errorMessage: winstonAiScans.errorMessage,
    scannedBy: winstonAiScans.scannedBy,
    createdAt: winstonAiScans.createdAt,
    completedAt: winstonAiScans.completedAt,
  })
  .from(winstonAiScans)
  .orderBy(winstonAiScans.createdAt)
  .limit(limit);
}

// ============================================
// PIPELINE-COMPATIBLE SCANNING FUNCTIONS
// These scan raw content during blog generation (before post creation)
// ============================================

export interface PipelineScanResult {
  passed: boolean;
  aiScore?: number;
  humanScore?: number;
  plagiarismScore?: number;
  creditsUsed: number;
  violations: Array<{
    ruleId: string;
    ruleName: string;
    severity: "error" | "warning" | "info";
    message: string;
    suggestedFix?: string;
    score?: number;
  }>;
  sentenceDetails?: Array<{ text: string; score: number }>;
  plagiarismSources?: Array<{ url: string; title: string; score: number }>;
  errorMessage?: string;
}

// Winston AI Guardrail thresholds
export const WINSTON_THRESHOLDS = {
  AI_DETECTION: {
    MAX_AI_SCORE: 30,           // Max acceptable AI score (0-100, higher = more AI-like)
    WARNING_AI_SCORE: 20,       // Warning threshold
    REQUIRE_REWRITE_SCORE: 40,  // Score that triggers auto-rewrite
  },
  PLAGIARISM: {
    MAX_PLAGIARISM_SCORE: 15,   // Max acceptable plagiarism percentage
    WARNING_PLAGIARISM_SCORE: 10, // Warning threshold
    REQUIRE_REWRITE_SCORE: 25,  // Score that triggers auto-rewrite
  },
};

/**
 * Scan raw content for AI-generated patterns (pipeline stage)
 * Use this during blog generation before post is created
 */
export async function scanContentForAI(
  content: string,
  title?: string
): Promise<PipelineScanResult> {
  if (!WINSTON_AI_API_KEY) {
    log.warn("API key not configured, skipping AI detection");
    return {
      passed: true,
      creditsUsed: 0,
      violations: [{
        ruleId: "winston-config",
        ruleName: "Winston AI Configuration",
        severity: "warning",
        message: "Winston AI API key not configured - AI detection skipped",
        suggestedFix: "Add WINSTON_AI_API_KEY to your secrets",
      }],
    };
  }

  const cleanContent = stripHtmlAndMarkers(content);
  const textToScan = title ? `${title}\n\n${cleanContent}` : cleanContent;

  try {
    log.info("Scanning content for AI patterns...");
    
    const response = await makeWinstonRequest<WinstonAIDetectionResponse>(
      "/ai-content-detection",
      {
        text: textToScan,
        sentences: true,
        language: "en",
      }
    );

    const humanScore = Math.round(response.score);
    const aiScore = Math.round(100 - response.score);
    const violations: PipelineScanResult["violations"] = [];

    // Apply guardrail checks
    if (aiScore >= WINSTON_THRESHOLDS.AI_DETECTION.REQUIRE_REWRITE_SCORE) {
      violations.push({
        ruleId: "winston-ai-critical",
        ruleName: "AI Content Critical",
        severity: "error",
        message: `Content AI score (${aiScore}%) exceeds critical threshold (${WINSTON_THRESHOLDS.AI_DETECTION.REQUIRE_REWRITE_SCORE}%) - requires rewrite`,
        suggestedFix: "Rewrite content with more human-like language patterns, varied sentence structures, and personal insights",
        score: aiScore,
      });
    } else if (aiScore >= WINSTON_THRESHOLDS.AI_DETECTION.MAX_AI_SCORE) {
      violations.push({
        ruleId: "winston-ai-high",
        ruleName: "AI Content High",
        severity: "error",
        message: `Content AI score (${aiScore}%) exceeds maximum threshold (${WINSTON_THRESHOLDS.AI_DETECTION.MAX_AI_SCORE}%)`,
        suggestedFix: "Add more personal insights, industry anecdotes, and varied writing patterns",
        score: aiScore,
      });
    } else if (aiScore >= WINSTON_THRESHOLDS.AI_DETECTION.WARNING_AI_SCORE) {
      violations.push({
        ruleId: "winston-ai-warning",
        ruleName: "AI Content Warning",
        severity: "warning",
        message: `Content AI score (${aiScore}%) approaching threshold (${WINSTON_THRESHOLDS.AI_DETECTION.MAX_AI_SCORE}%)`,
        suggestedFix: "Consider adding more unique perspectives and human-like writing patterns",
        score: aiScore,
      });
    }

    // Check for high-scoring sentences
    const highAiSentences = response.sentences?.filter(s => (100 - s.score) > 50) || [];
    if (highAiSentences.length > 5) {
      violations.push({
        ruleId: "winston-sentences",
        ruleName: "AI Sentence Patterns",
        severity: "warning",
        message: `${highAiSentences.length} sentences have high AI scores (>50%)`,
        suggestedFix: "Review and rewrite flagged sentences with more varied patterns",
      });
    }

    const passed = violations.filter(v => v.severity === "error").length === 0;

    log.info({ aiScore, humanScore, passed }, "AI Detection complete");

    return {
      passed,
      aiScore,
      humanScore,
      creditsUsed: response.credits_used,
      violations,
      sentenceDetails: response.sentences,
    };
  } catch (error: any) {
    log.error({ err: error instanceof Error ? error : new Error(String(error.message)) }, "AI detection failed");
    return {
      passed: false,
      creditsUsed: 0,
      violations: [{
        ruleId: "winston-error",
        ruleName: "Winston AI Error",
        severity: "error",
        message: `AI detection failed: ${error.message}`,
        suggestedFix: "Retry the scan or check Winston AI API status",
      }],
      errorMessage: error.message,
    };
  }
}

/**
 * Scan raw content for plagiarism (pipeline stage)
 * Use this during blog generation before post is created
 */
export async function scanContentForPlagiarism(
  content: string,
  title?: string
): Promise<PipelineScanResult> {
  if (!WINSTON_AI_API_KEY) {
    log.warn("API key not configured, skipping plagiarism check");
    return {
      passed: true,
      creditsUsed: 0,
      violations: [{
        ruleId: "winston-config",
        ruleName: "Winston AI Configuration",
        severity: "warning",
        message: "Winston AI API key not configured - plagiarism check skipped",
        suggestedFix: "Add WINSTON_AI_API_KEY to your secrets",
      }],
    };
  }

  const cleanContent = stripHtmlAndMarkers(content);
  const textToScan = title ? `${title}\n\n${cleanContent}` : cleanContent;

  try {
    log.info("Scanning content for plagiarism...");
    
    const response = await makeWinstonRequest<WinstonPlagiarismResponse>(
      "/plagiarism",
      {
        text: textToScan,
        language: "en",
        country: "uk",
      }
    );

    const plagiarismScore = Math.round(response.result?.score ?? 0);
    const violations: PipelineScanResult["violations"] = [];

    // Apply guardrail checks
    if (plagiarismScore >= WINSTON_THRESHOLDS.PLAGIARISM.REQUIRE_REWRITE_SCORE) {
      violations.push({
        ruleId: "winston-plagiarism-critical",
        ruleName: "Plagiarism Critical",
        severity: "error",
        message: `Plagiarism score (${plagiarismScore}%) exceeds critical threshold (${WINSTON_THRESHOLDS.PLAGIARISM.REQUIRE_REWRITE_SCORE}%) - requires rewrite`,
        suggestedFix: "Substantially rewrite content with original analysis and unique perspectives",
        score: plagiarismScore,
      });
    } else if (plagiarismScore >= WINSTON_THRESHOLDS.PLAGIARISM.MAX_PLAGIARISM_SCORE) {
      violations.push({
        ruleId: "winston-plagiarism-high",
        ruleName: "Plagiarism High",
        severity: "error",
        message: `Plagiarism score (${plagiarismScore}%) exceeds maximum threshold (${WINSTON_THRESHOLDS.PLAGIARISM.MAX_PLAGIARISM_SCORE}%)`,
        suggestedFix: "Rewrite flagged sections with original content and proper attribution",
        score: plagiarismScore,
      });
    } else if (plagiarismScore >= WINSTON_THRESHOLDS.PLAGIARISM.WARNING_PLAGIARISM_SCORE) {
      violations.push({
        ruleId: "winston-plagiarism-warning",
        ruleName: "Plagiarism Warning",
        severity: "warning",
        message: `Plagiarism score (${plagiarismScore}%) approaching threshold (${WINSTON_THRESHOLDS.PLAGIARISM.MAX_PLAGIARISM_SCORE}%)`,
        suggestedFix: "Review flagged sources and ensure proper paraphrasing",
        score: plagiarismScore,
      });
    }

    // Report source matches
    const significantSources = response.sources?.filter(s => s.score > 5) || [];
    if (significantSources.length > 0) {
      for (const source of significantSources.slice(0, 3)) {
        violations.push({
          ruleId: `winston-source-${source.url.substring(0, 20)}`,
          ruleName: "Plagiarism Source Match",
          severity: source.score > 20 ? "error" : "warning",
          message: `${source.score}% match with: ${source.title || source.url}`,
          suggestedFix: `Rewrite content that matches this source or add proper citation`,
          score: source.score,
        });
      }
    }

    const passed = violations.filter(v => v.severity === "error").length === 0;

    log.info({ plagiarismScore, sources: significantSources.length, passed }, "Plagiarism check complete");

    return {
      passed,
      plagiarismScore,
      creditsUsed: response.credits_used,
      violations,
      plagiarismSources: response.sources?.map(s => ({
        url: s.url,
        title: s.title,
        score: s.score,
      })),
    };
  } catch (error: any) {
    log.error({ err: error instanceof Error ? error : new Error(String(error.message)) }, "Plagiarism check failed");
    return {
      passed: false,
      creditsUsed: 0,
      violations: [{
        ruleId: "winston-error",
        ruleName: "Winston AI Error",
        severity: "error",
        message: `Plagiarism check failed: ${error.message}`,
        suggestedFix: "Retry the scan or check Winston AI API status",
      }],
      errorMessage: error.message,
    };
  }
}

/**
 * Run full Winston AI check (both AI detection and plagiarism)
 * Returns combined results with overall pass/fail
 */
export async function runFullWinstonCheck(
  content: string,
  title?: string
): Promise<{
  passed: boolean;
  requiresRewrite: boolean;
  aiResult: PipelineScanResult;
  plagiarismResult: PipelineScanResult;
  totalCreditsUsed: number;
  allViolations: PipelineScanResult["violations"];
}> {
  log.info("Running full content check...");

  const [aiResult, plagiarismResult] = await Promise.all([
    scanContentForAI(content, title),
    scanContentForPlagiarism(content, title),
  ]);

  const allViolations = [...aiResult.violations, ...plagiarismResult.violations];
  const hasErrors = allViolations.some(v => v.severity === "error");
  
  // Check if content requires a full rewrite
  const requiresRewrite = 
    (aiResult.aiScore ?? 0) >= WINSTON_THRESHOLDS.AI_DETECTION.REQUIRE_REWRITE_SCORE ||
    (plagiarismResult.plagiarismScore ?? 0) >= WINSTON_THRESHOLDS.PLAGIARISM.REQUIRE_REWRITE_SCORE;

  log.info({ passed: !hasErrors, requiresRewrite }, "Full check complete");

  return {
    passed: !hasErrors,
    requiresRewrite,
    aiResult,
    plagiarismResult,
    totalCreditsUsed: aiResult.creditsUsed + plagiarismResult.creditsUsed,
    allViolations,
  };
}
