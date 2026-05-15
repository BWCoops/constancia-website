import { db } from "../db";
import { redactEmail } from "../utils/log-privacy";
import { escapeHtml } from "../utils/html-escape";
import { blogPosts, resourceFiles, winstonAiScans, scheduledScans } from "@shared/schema";
import { SEO_TRENDS_2025 } from "@shared/seo-trends";
import { eq, desc } from "drizzle-orm";
import { scanBlogPost, scanForPlagiarism } from "./winston-ai";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("weekly-scan");

const MS_GRAPH_CLIENT_ID = process.env.MS_GRAPH_CLIENT_ID;
const MS_GRAPH_CLIENT_SECRET = process.env.MS_GRAPH_CLIENT_SECRET;
const MS_GRAPH_TENANT_ID = process.env.MS_GRAPH_TENANT_ID;
const SENDER_EMAIL = "info@constancia.io";
const ADMIN_EMAILS = ["grant.vanwyk@constancia.io", "bradley.cooper@constancia.io"];

interface ScanSummary {
  totalBlogs: number;
  totalResources: number;
  scannedBlogs: number;
  scannedResources: number;
  failedBlogs: number;
  failedResources: number;
  severeIssues: SevereIssue[];
  seoRecommendations: SEORecommendation[];
  aiDetectionFlags: AIDetectionFlag[];
  plagiarismFlags: PlagiarismFlag[];
}

interface SevereIssue {
  contentType: "blog" | "resource";
  contentId: string;
  title: string;
  issueType: "high_plagiarism" | "high_ai_content" | "low_seo_score" | "critical_marker";
  severity: "critical" | "warning";
  details: string;
}

interface SEORecommendation {
  contentType: "blog" | "resource";
  contentId: string;
  title: string;
  seoScore: number;
  recommendations: string[];
}

interface AIDetectionFlag {
  contentType: "blog" | "resource";
  contentId: string;
  title: string;
  aiScore: number;
  humanScore: number;
}

interface PlagiarismFlag {
  contentType: "blog" | "resource";
  contentId: string;
  title: string;
  plagiarismScore: number;
  sources: string[];
}

function analyzeSEORelevance(title: string, content: string, description?: string): {
  score: number;
  recommendations: string[];
} {
  const fullText = `${title} ${description || ""} ${content}`.toLowerCase();
  const recommendations: string[] = [];
  let score = 50;

  const matchedTrends = SEO_TRENDS_2025.filter(trend => 
    fullText.includes(trend.toLowerCase())
  );
  
  score += matchedTrends.length * 5;
  if (matchedTrends.length < 3) {
    recommendations.push(`Consider incorporating more trending topics like: ${SEO_TRENDS_2025.slice(0, 5).join(", ")}`);
  }

  if (title.length < 40) {
    recommendations.push("Title is too short. Aim for 50-60 characters for better SEO.");
    score -= 5;
  } else if (title.length > 70) {
    recommendations.push("Title is too long. Keep it under 60 characters for search visibility.");
    score -= 3;
  }

  if (!description || description.length < 120) {
    recommendations.push("Meta description is too short. Aim for 150-160 characters.");
    score -= 5;
  }

  const wordCount = content.split(/\s+/).length;
  if (wordCount < 1000) {
    recommendations.push("Content is shorter than 1000 words. Longer, comprehensive content ranks better.");
    score -= 10;
  } else if (wordCount > 2000) {
    score += 10;
  }

  const headingMatches = content.match(/#{1,3}\s+[^\n]+/g) || [];
  if (headingMatches.length < 3) {
    recommendations.push("Add more headings (H2, H3) to improve content structure and readability.");
    score -= 5;
  }

  const hasNumbers = /\d{4}/.test(title) || /202[4-6]/.test(content);
  if (!hasNumbers) {
    recommendations.push("Include current year references (2024, 2025, 2026) to signal freshness.");
    score -= 3;
  }

  const actionWords = ["guide", "how to", "best practices", "strategies", "tips", "complete", "ultimate"];
  const hasActionWords = actionWords.some(word => fullText.includes(word));
  if (!hasActionWords) {
    recommendations.push("Add action-oriented words like 'guide', 'how to', or 'best practices' to improve CTR.");
    score -= 3;
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    recommendations,
  };
}

function detectSevereIssues(
  contentType: "blog" | "resource",
  contentId: string,
  title: string,
  aiScore?: number,
  plagiarismScore?: number,
  seoScore?: number
): SevereIssue[] {
  const issues: SevereIssue[] = [];

  if (plagiarismScore !== undefined && plagiarismScore > 20) {
    issues.push({
      contentType,
      contentId,
      title,
      issueType: "high_plagiarism",
      severity: plagiarismScore > 40 ? "critical" : "warning",
      details: `Plagiarism score of ${plagiarismScore}% detected. Review and rewrite flagged sections.`,
    });
  }

  if (aiScore !== undefined && aiScore > 60) {
    issues.push({
      contentType,
      contentId,
      title,
      issueType: "high_ai_content",
      severity: aiScore > 80 ? "critical" : "warning",
      details: `AI-generated content score of ${aiScore}%. Consider humanizing the content.`,
    });
  }

  if (seoScore !== undefined && seoScore < 40) {
    issues.push({
      contentType,
      contentId,
      title,
      issueType: "low_seo_score",
      severity: "warning",
      details: `Low SEO relevance score of ${seoScore}%. Content may need optimization for current trends.`,
    });
  }

  return issues;
}

async function getGraphAccessToken(): Promise<string | null> {
  if (!MS_GRAPH_CLIENT_ID || !MS_GRAPH_CLIENT_SECRET || !MS_GRAPH_TENANT_ID) {
    log.warn("Microsoft Graph credentials not configured");
    return null;
  }

  try {
    const tokenUrl = `https://login.microsoftonline.com/${MS_GRAPH_TENANT_ID}/oauth2/v2.0/token`;
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: MS_GRAPH_CLIENT_ID,
        client_secret: MS_GRAPH_CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
      }),
    });

    if (!response.ok) {
      log.error({ statusCode: response.status }, "Failed to get Graph access token");
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error: any) {
    log.error({ err: new Error(error.message) }, "Error getting Graph token");
    return null;
  }
}

async function sendScanReportEmail(summary: ScanSummary): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getGraphAccessToken();
  if (!accessToken) {
    const error = "Cannot send email - Microsoft Graph credentials not configured or token acquisition failed";
    log.warn(error);
    return { success: false, error };
  }

  const hasSevereIssues = summary.severeIssues.length > 0;
  const criticalCount = summary.severeIssues.filter(i => i.severity === "critical").length;

  const subject = hasSevereIssues
    ? `[${criticalCount > 0 ? "CRITICAL" : "WARNING"}] Constancia Weekly Content Scan Report - ${new Date().toLocaleDateString("en-GB")}`
    : `Constancia Weekly Content Scan Report - ${new Date().toLocaleDateString("en-GB")}`;

  const adminBaseUrl = process.env.REPLIT_DOMAINS?.split(",")[0] || "https://constancia.io";
  
  const severeIssuesHtml = summary.severeIssues.length > 0 ? `
    <div style="background: #FEE2E2; border-left: 4px solid #DC2626; padding: 16px; margin: 16px 0; border-radius: 4px;">
      <h3 style="color: #DC2626; margin: 0 0 12px 0;">Severe Issues Detected (${summary.severeIssues.length})</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #FEF2F2;">
          <th style="text-align: left; padding: 8px; border-bottom: 1px solid #FECACA;">Content</th>
          <th style="text-align: left; padding: 8px; border-bottom: 1px solid #FECACA;">Issue</th>
          <th style="text-align: left; padding: 8px; border-bottom: 1px solid #FECACA;">Severity</th>
          <th style="text-align: left; padding: 8px; border-bottom: 1px solid #FECACA;">Action</th>
        </tr>
        ${summary.severeIssues.map(issue => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #FECACA;">
              <strong>${escapeHtml(issue.title)}</strong>
              <br/><span style="color: #666; font-size: 11px;">ID: ${escapeHtml(String(issue.contentId))}</span>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #FECACA;">${escapeHtml(issue.details)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #FECACA;">
              <span style="background: ${issue.severity === 'critical' ? '#DC2626' : '#F59E0B'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                ${issue.severity.toUpperCase()}
              </span>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #FECACA;">
              <a href="${adminBaseUrl}/admin/${issue.contentType === 'blog' ? 'blog-posts' : 'resources'}" style="color: #7FB8A3; text-decoration: none;">View in Admin</a>
            </td>
          </tr>
        `).join("")}
      </table>
    </div>
  ` : "";

  const seoRecsHtml = summary.seoRecommendations.length > 0 ? `
    <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 16px 0; border-radius: 4px;">
      <h3 style="color: #92400E; margin: 0 0 12px 0;">SEO Optimization Suggestions</h3>
      ${summary.seoRecommendations.slice(0, 10).map(rec => `
        <div style="margin-bottom: 12px; padding: 8px; background: white; border-radius: 4px;">
          <strong>${escapeHtml(rec.title)}</strong> (Score: ${rec.seoScore}/100)
          <ul style="margin: 8px 0 0 0; padding-left: 20px;">
            ${rec.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join("")}
          </ul>
        </div>
      `).join("")}
    </div>
  ` : "";

  const aiDetectionHtml = summary.aiDetectionFlags.length > 0 ? `
    <div style="background: #EDE9FE; border-left: 4px solid #8B5CF6; padding: 16px; margin: 16px 0; border-radius: 4px;">
      <h3 style="color: #6D28D9; margin: 0 0 12px 0;">AI Content Detection (${summary.aiDetectionFlags.length})</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #F5F3FF;">
          <th style="text-align: left; padding: 8px; border-bottom: 1px solid #DDD6FE;">Content</th>
          <th style="text-align: left; padding: 8px; border-bottom: 1px solid #DDD6FE;">AI Score</th>
          <th style="text-align: left; padding: 8px; border-bottom: 1px solid #DDD6FE;">Human Score</th>
          <th style="text-align: left; padding: 8px; border-bottom: 1px solid #DDD6FE;">Action</th>
        </tr>
        ${summary.aiDetectionFlags.map(flag => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #DDD6FE;">
              <strong>${flag.title}</strong>
              <br/><span style="color: #666; font-size: 11px;">ID: ${flag.contentId}</span>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #DDD6FE;">
              <span style="background: ${flag.aiScore > 60 ? '#DC2626' : '#F59E0B'}; color: white; padding: 2px 8px; border-radius: 4px;">${flag.aiScore}%</span>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #DDD6FE;">${flag.humanScore}%</td>
            <td style="padding: 8px; border-bottom: 1px solid #DDD6FE;">
              <a href="${adminBaseUrl}/admin/${flag.contentType === 'blog' ? 'blog-posts' : 'resources'}" style="color: #7FB8A3; text-decoration: none;">View in Admin</a>
            </td>
          </tr>
        `).join("")}
      </table>
    </div>
  ` : "";

  const plagiarismHtml = summary.plagiarismFlags.length > 0 ? `
    <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 16px; margin: 16px 0; border-radius: 4px;">
      <h3 style="color: #DC2626; margin: 0 0 12px 0;">Plagiarism Detection (${summary.plagiarismFlags.length})</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #FEE2E2;">
          <th style="text-align: left; padding: 8px; border-bottom: 1px solid #FECACA;">Content</th>
          <th style="text-align: left; padding: 8px; border-bottom: 1px solid #FECACA;">Score</th>
          <th style="text-align: left; padding: 8px; border-bottom: 1px solid #FECACA;">Action</th>
        </tr>
        ${summary.plagiarismFlags.map(flag => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #FECACA;">
              <strong>${flag.title}</strong>
              <br/><span style="color: #666; font-size: 11px;">ID: ${flag.contentId}</span>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #FECACA;">
              <span style="background: ${flag.plagiarismScore > 20 ? '#DC2626' : '#F59E0B'}; color: white; padding: 2px 8px; border-radius: 4px;">${flag.plagiarismScore}%</span>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #FECACA;">
              <a href="${adminBaseUrl}/admin/${flag.contentType === 'blog' ? 'blog-posts' : 'resources'}" style="color: #7FB8A3; text-decoration: none;">View in Admin</a>
            </td>
          </tr>
        `).join("")}
      </table>
    </div>
  ` : "";

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #12161D 0%, #7FB8A3 100%); padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Weekly Content Scan Report</h1>
        <p style="color: #C77A93; margin: 8px 0 0 0;">Automated scan completed on ${new Date().toLocaleString("en-GB")}</p>
      </div>
      
      <div style="background: #F8FAFC; padding: 24px; border: 1px solid #E2E8F0; border-top: none;">
        <h2 style="color: #1E293B; margin: 0 0 16px 0;">Scan Summary</h2>
        
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
          <div style="background: white; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0;">
            <div style="font-size: 28px; font-weight: bold; color: #12161D;">${summary.scannedBlogs}</div>
            <div style="color: #64748B; font-size: 14px;">Blogs Scanned</div>
          </div>
          <div style="background: white; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0;">
            <div style="font-size: 28px; font-weight: bold; color: #12161D;">${summary.scannedResources}</div>
            <div style="color: #64748B; font-size: 14px;">Resources Scanned</div>
          </div>
          <div style="background: white; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0;">
            <div style="font-size: 28px; font-weight: bold; color: ${summary.severeIssues.length > 0 ? '#DC2626' : '#10B981'};">${summary.severeIssues.length}</div>
            <div style="color: #64748B; font-size: 14px;">Issues Found</div>
          </div>
          <div style="background: white; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0;">
            <div style="font-size: 28px; font-weight: bold; color: #F59E0B;">${summary.failedBlogs + summary.failedResources}</div>
            <div style="color: #64748B; font-size: 14px;">Scan Failures</div>
          </div>
        </div>
        
        ${severeIssuesHtml}
        ${aiDetectionHtml}
        ${plagiarismHtml}
        ${seoRecsHtml}
        
        <div style="background: #ECFDF5; border-left: 4px solid #10B981; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <h3 style="color: #065F46; margin: 0 0 8px 0;">Next Steps</h3>
          <ul style="margin: 0; padding-left: 20px; color: #047857;">
            ${summary.severeIssues.length > 0 ? '<li>Review and address severe issues immediately</li>' : ''}
            <li>Review SEO recommendations and update content as needed</li>
            <li>Access the Admin Centre for detailed scan results</li>
            <li>Next scan scheduled in 7 days</li>
          </ul>
        </div>
      </div>
      
      <div style="background: #12161D; padding: 16px; border-radius: 0 0 8px 8px; text-align: center;">
        <p style="color: #9CA3AF; margin: 0; font-size: 12px;">
          This is an automated report from the Constancia Admin Centre.
          <br />Questions? Contact the development team.
        </p>
      </div>
    </div>
  `;

  let successCount = 0;
  let lastError = "";
  
  for (const email of ADMIN_EMAILS) {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              subject,
              body: { contentType: "HTML", content: htmlContent },
              toRecipients: [{ emailAddress: { address: email } }],
              internetMessageHeaders: [
                { name: "X-Hide-Contact-Card", value: "true" },
                { name: "X-Originating-Ip", value: "[]" }
              ]
            },
          }),
        }
      );

      if (response.ok) {
        log.info({ email: redactEmail(email) }, "Scan report email sent");
        successCount++;
      } else {
        lastError = `Failed to send email to ${email}: ${response.status}`;
        log.error({ email: redactEmail(email), statusCode: response.status }, "Failed to send email");
      }
    } catch (error: any) {
      lastError = `Error sending email to ${email}: ${error.message}`;
      log.error({ err: new Error(error.message), email: redactEmail(email) }, "Error sending email");
    }
  }
  
  if (successCount > 0) {
    return { success: true };
  }
  return { success: false, error: lastError || "No emails sent" };
}

async function sendImmediateAlert(issue: SevereIssue): Promise<void> {
  const accessToken = await getGraphAccessToken();
  if (!accessToken) {
    log.warn({ title: issue.title }, "Cannot send immediate alert - no access token");
    return;
  }

  const subject = `[URGENT] ${issue.issueType === 'high_plagiarism' ? 'Plagiarism' : 'Content Issue'} Detected - ${issue.title}`;
  
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #DC2626; padding: 16px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">Urgent Content Alert</h1>
      </div>
      <div style="background: #FEE2E2; padding: 24px; border: 1px solid #FECACA;">
        <h2 style="color: #991B1B; margin: 0 0 16px 0;">${issue.issueType.replace(/_/g, ' ').toUpperCase()}</h2>
        <p><strong>Content:</strong> ${issue.title}</p>
        <p><strong>Type:</strong> ${issue.contentType}</p>
        <p><strong>Details:</strong> ${issue.details}</p>
        <p style="margin-top: 16px; color: #991B1B;">
          <strong>Immediate action required.</strong> Please review this content in the Admin Centre.
        </p>
      </div>
    </div>
  `;

  for (const email of ADMIN_EMAILS) {
    try {
      await fetch(
        `https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              subject,
              body: { contentType: "HTML", content: htmlContent },
              toRecipients: [{ emailAddress: { address: email } }],
              importance: "high",
              internetMessageHeaders: [
                { name: "X-Hide-Contact-Card", value: "true" },
                { name: "X-Originating-Ip", value: "[]" }
              ]
            },
          }),
        }
      );
      log.info({ email: redactEmail(email), title: issue.title }, "Immediate alert sent");
    } catch (error: any) {
      log.error({ err: new Error(error.message) }, "Failed to send immediate alert");
    }
  }
}

export async function runComprehensiveWeeklyScan(
  triggeredBy: string = "scheduler"
): Promise<{ success: boolean; summary?: ScanSummary; error?: string }> {
  log.info("Starting comprehensive weekly scan...");

  const summary: ScanSummary = {
    totalBlogs: 0,
    totalResources: 0,
    scannedBlogs: 0,
    scannedResources: 0,
    failedBlogs: 0,
    failedResources: 0,
    severeIssues: [],
    seoRecommendations: [],
    aiDetectionFlags: [],
    plagiarismFlags: [],
  };

  try {
    const publishedBlogs = await db.select({
      id: blogPosts.id,
      title: blogPosts.title,
      content: blogPosts.content,
      excerpt: blogPosts.excerpt,
    })
    .from(blogPosts)
    .where(eq(blogPosts.isPublished, true));

    const publishedResources = await db.select({
      id: resourceFiles.id,
      title: resourceFiles.title,
      description: resourceFiles.description,
    })
    .from(resourceFiles)
    .where(eq(resourceFiles.isPublished, true));

    summary.totalBlogs = publishedBlogs.length;
    summary.totalResources = publishedResources.length;

    log.info({ totalBlogs: summary.totalBlogs, totalResources: summary.totalResources }, "Found content to scan");

    const [scanRecord] = await db.insert(scheduledScans).values({
      scanType: "weekly_comprehensive",
      status: "running",
      totalPosts: summary.totalBlogs + summary.totalResources,
      scannedPosts: 0,
      failedPosts: 0,
      startedAt: new Date(),
      triggeredBy,
    }).returning();

    for (const blog of publishedBlogs) {
      try {
        log.info({ title: blog.title }, "Scanning blog");

        const aiResults = await scanBlogPost(blog.id, triggeredBy, "ai_detection");
        const aiResult = aiResults[0];
        
        let plagiarismResult;
        try {
          plagiarismResult = await scanForPlagiarism(blog.id, triggeredBy);
        } catch (e) {
          log.info({ title: blog.title }, "Plagiarism scan skipped");
        }

        const seoAnalysis = analyzeSEORelevance(blog.title, blog.content, blog.excerpt);
        const roundedSeoScore = Math.round(seoAnalysis.score);

        const issues = detectSevereIssues(
          "blog",
          blog.id,
          blog.title,
          aiResult?.aiScore,
          plagiarismResult?.plagiarismScore,
          roundedSeoScore
        );

        const hasSevereIssue = issues.length > 0;
        const severityReasons = issues.map(i => `[${i.severity.toUpperCase()}] ${i.details}`).join("; ");

        if (aiResult) {
          await db.update(winstonAiScans)
            .set({
              seoScore: roundedSeoScore,
              seoRecommendations: JSON.stringify(seoAnalysis.recommendations),
              isSevere: hasSevereIssue,
              severityReason: severityReasons || null,
            })
            .where(eq(winstonAiScans.id, aiResult.scanId));
        }

        for (const issue of issues) {
          summary.severeIssues.push(issue);
          if (issue.severity === "critical") {
            await sendImmediateAlert(issue);
          }
        }

        if (seoAnalysis.recommendations.length > 0) {
          summary.seoRecommendations.push({
            contentType: "blog",
            contentId: blog.id,
            title: blog.title,
            seoScore: roundedSeoScore,
            recommendations: seoAnalysis.recommendations,
          });
        }

        if (aiResult?.aiScore && aiResult.aiScore > 40) {
          summary.aiDetectionFlags.push({
            contentType: "blog",
            contentId: blog.id,
            title: blog.title,
            aiScore: aiResult.aiScore,
            humanScore: aiResult.humanScore || 0,
          });
        }

        if (plagiarismResult?.plagiarismScore && plagiarismResult.plagiarismScore > 10) {
          let sources: string[] = [];
          if (plagiarismResult.plagiarismSources) {
            try {
              const parsed = JSON.parse(plagiarismResult.plagiarismSources);
              sources = Array.isArray(parsed) ? parsed.map((s: any) => s.url || s).slice(0, 5) : [];
            } catch (e) {
              sources = [];
            }
          }
          summary.plagiarismFlags.push({
            contentType: "blog",
            contentId: blog.id,
            title: blog.title,
            plagiarismScore: plagiarismResult.plagiarismScore,
            sources,
          });
        }

        summary.scannedBlogs++;
      } catch (error: any) {
        log.error({ err: new Error(error.message), title: blog.title }, "Failed to scan blog");
        summary.failedBlogs++;
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    for (const resource of publishedResources) {
      try {
        log.info({ title: resource.title }, "Analyzing resource");

        const seoAnalysis = analyzeSEORelevance(
          resource.title,
          resource.description,
          resource.description
        );

        const roundedResourceSeoScore = Math.round(seoAnalysis.score);
        const isLowSEO = roundedResourceSeoScore < 40;
        const severityReason = isLowSEO 
          ? `[WARNING] Low SEO relevance score of ${roundedResourceSeoScore}%. Resource metadata may need optimization.`
          : null;

        await db.insert(winstonAiScans).values({
          resourceId: resource.id,
          contentType: "resource",
          scanType: "seo_analysis",
          seoScore: roundedResourceSeoScore,
          seoRecommendations: JSON.stringify(seoAnalysis.recommendations),
          isSevere: isLowSEO,
          severityReason,
          status: "completed",
          scannedBy: triggeredBy,
          completedAt: new Date(),
        });

        if (isLowSEO) {
          summary.severeIssues.push({
            contentType: "resource",
            contentId: resource.id,
            title: resource.title,
            issueType: "low_seo_score",
            severity: "warning",
            details: severityReason!,
          });
        }

        if (seoAnalysis.recommendations.length > 0) {
          summary.seoRecommendations.push({
            contentType: "resource",
            contentId: resource.id,
            title: resource.title,
            seoScore: seoAnalysis.score,
            recommendations: seoAnalysis.recommendations,
          });
        }

        summary.scannedResources++;
      } catch (error: any) {
        log.error({ err: new Error(error.message), title: resource.title }, "Failed to analyze resource");
        summary.failedResources++;
      }
    }

    const emailResult = await sendScanReportEmail(summary);
    const emailFailed = !emailResult.success;
    
    if (emailFailed) {
      log.error({ error: emailResult.error }, "Email report failed to send");
    }
    
    await db.update(scheduledScans)
      .set({
        status: emailFailed ? "completed_no_notification" : "completed",
        scannedPosts: summary.scannedBlogs + summary.scannedResources,
        failedPosts: summary.failedBlogs + summary.failedResources,
        completedAt: new Date(),
      })
      .where(eq(scheduledScans.id, scanRecord.id));

    log.info({ scannedBlogs: summary.scannedBlogs, scannedResources: summary.scannedResources, issues: summary.severeIssues.length, emailFailed }, "Weekly scan completed");

    if (emailFailed) {
      return { 
        success: false, 
        summary,
        error: `Scan completed but notification failed: ${emailResult.error}`
      };
    }
    
    return { success: true, summary };
  } catch (error: any) {
    log.error({ err: new Error(error.message) }, "Weekly scan failed");
    
    try {
      const existingScan = await db.select({ id: scheduledScans.id })
        .from(scheduledScans)
        .where(eq(scheduledScans.scanType, "weekly_comprehensive"))
        .orderBy(desc(scheduledScans.startedAt))
        .limit(1);
      
      if (existingScan.length > 0) {
        await db.update(scheduledScans)
          .set({
            status: "failed",
            completedAt: new Date(),
          })
          .where(eq(scheduledScans.id, existingScan[0].id));
      }
    } catch (dbError: any) {
      log.error({ err: new Error(dbError.message) }, "Failed to update scan record status");
    }
    
    return { success: false, error: error.message };
  }
}

export { ScanSummary, SevereIssue, SEORecommendation };
