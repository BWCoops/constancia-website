import { storage } from "../storage";
import { blogGenerationService } from "../services/blog-generation";

async function main() {
  const title = "The CFO's Guide to AI-Powered Financial Planning in 2025";
  const brief = "A comprehensive guide for CFOs on leveraging AI for financial planning and analysis. Cover practical implementation strategies, ROI measurement frameworks, common pitfalls to avoid, and real-world success stories from enterprise finance teams.";
  const targetKeywords = ["AI financial planning", "CFO AI strategy", "AI FP&A", "financial forecasting AI", "AI-powered budgeting"];
  const targetAudience = "CFOs and Finance Directors at mid-to-large enterprises";
  const categoryName = "AI & Technology";

  console.log(`\n${'='.repeat(70)}`);
  console.log(`[Test] Section-by-Section Blog Generation`);
  console.log(`${'='.repeat(70)}\n`);

  const job = await storage.createBlogGenerationJob({
    title, brief, targetKeywords, targetAudience, categoryId: "1", status: "pending"
  });
  console.log(`[Job] ${job.id}\n`);

  let totalTokens = 0;

  try {
    console.log(`[Stage 1] Research`);
    await storage.updateBlogGenerationJob(job.id, { status: "in_progress", stage: "research", updatedAt: new Date() });
    const researchResult = await blogGenerationService.runStage1Research(brief, targetKeywords, targetAudience);
    totalTokens += researchResult.tokensUsed || 0;
    console.log(`  ${researchResult.citations?.length || 0} citations, ${researchResult.tokensUsed} tokens`);

    console.log(`\n[Stage 2] Outline`);
    await storage.updateBlogGenerationJob(job.id, { stage: "outline", updatedAt: new Date() });
    const outlineResult = await blogGenerationService.runStage2Outline(brief, researchResult.output, researchResult.citations || [], targetKeywords);
    totalTokens += outlineResult.tokensUsed || 0;
    console.log(`  Outline generated, ${outlineResult.tokensUsed} tokens`);

    console.log(`\n[Stage 3] Draft (Section-by-Section)`);
    await storage.updateBlogGenerationJob(job.id, { stage: "draft", updatedAt: new Date() });
    const rulesResult = await storage.getGuardrailRules();
    await blogGenerationService.initializeGuardrails(rulesResult.items);

    const draftResult = await blogGenerationService.runStage3DraftSectional(
      brief, outlineResult.output, researchResult.output,
      researchResult.citations || [], targetKeywords, categoryName
    );
    totalTokens += draftResult.tokensUsed || 0;

    const wordCount = draftResult.output.split(/\s+/).filter((w: string) => w.length > 0).length;

    const validation = blogGenerationService.validateGuardrails(draftResult.output, "draft");
    const errors = validation.violations.filter(v => v.severity === 'error');
    const warnings = validation.violations.filter(v => v.severity === 'warning');

    if (wordCount >= 2500) {
      await storage.updateBlogGenerationJob(job.id, {
        status: "completed", stage: "completed",
        finalContent: JSON.stringify(draftResult.mappedPost),
        totalTokensUsed: totalTokens,
        completedAt: new Date(), updatedAt: new Date()
      });
      console.log(`\n${'='.repeat(70)}`);
      console.log(`[SUCCESS] Blog generated successfully`);
      console.log(`${'='.repeat(70)}`);
      console.log(`  Title: ${draftResult.mappedPost.title}`);
      console.log(`  Words: ${wordCount}`);
      console.log(`  Tokens: ${totalTokens}`);
      console.log(`  Reading Time: ${draftResult.mappedPost.readingTime}`);
      console.log(`  Errors: ${errors.length}`);
      console.log(`  Warnings: ${warnings.length}`);
      if (errors.length > 0) {
        console.log(`  Error details:`);
        errors.forEach(e => console.log(`    - ${e.ruleName}: ${e.message}`));
      }
      console.log(`${'='.repeat(70)}\n`);
    } else {
      console.error(`\n${'='.repeat(70)}`);
      console.error(`[FAILED] Word count: ${wordCount} (need 2500+)`);
      console.error(`  Errors: ${errors.length}`);
      if (errors.length > 0) {
        errors.forEach(e => console.error(`    - ${e.ruleName}: ${e.message}`));
      }
      console.error(`${'='.repeat(70)}\n`);
      await storage.updateBlogGenerationJob(job.id, { status: "failed", errorMessage: `Word count: ${wordCount}`, updatedAt: new Date() });
    }

  } catch (error: any) {
    console.error(`\n${'='.repeat(70)}`);
    console.error(`[FAILED] ${error.message}`);
    console.error(`${'='.repeat(70)}\n`);
    await storage.updateBlogGenerationJob(job.id, { status: "failed", errorMessage: error.message, updatedAt: new Date() });
  }
}

main().catch(console.error);
