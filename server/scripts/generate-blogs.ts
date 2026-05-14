import { storage } from "../storage";
import { blogGenerationService } from "../services/blog-generation";
import { runFullWinstonCheck } from "../services/winston-ai";

const BLOG_TOPICS = [
  {
    title: "The CFO's Guide to AI-Powered Financial Planning in 2025",
    brief: "A comprehensive guide for CFOs on leveraging AI for financial planning and analysis. Cover practical implementation strategies, ROI measurement frameworks, common pitfalls to avoid, and real-world success stories from enterprise finance teams. Focus on how AI augments human decision-making rather than replacing it.",
    targetKeywords: ["AI financial planning", "CFO AI strategy", "AI FP&A", "financial forecasting AI", "AI-powered budgeting"],
    targetAudience: "CFOs and Finance Directors at mid-to-large enterprises considering AI investment",
    categoryName: "AI & Technology"
  },
  {
    title: "Zero-Based Budgeting vs Traditional Budgeting: A Data-Driven Comparison",
    brief: "An in-depth comparison of zero-based budgeting versus traditional incremental budgeting approaches. Include case studies from major corporations, implementation timelines, resource requirements, and when each approach delivers the best results. Provide actionable frameworks for CFOs to evaluate which method suits their organisation.",
    targetKeywords: ["zero-based budgeting", "ZBB implementation", "budgeting methods comparison", "enterprise budgeting", "cost management"],
    targetAudience: "Finance leaders evaluating budgeting methodology changes",
    categoryName: "Financial Planning"
  },
  {
    title: "EPM Implementation: The 12-Month Roadmap to Transformation Success",
    brief: "A detailed month-by-month guide for Enterprise Performance Management implementations. Cover stakeholder alignment, data migration strategies, change management, training programmes, and post-go-live optimisation. Include lessons learned from successful and failed implementations.",
    targetKeywords: ["EPM implementation", "OneStream implementation", "Anaplan deployment", "EPM project timeline", "performance management transformation"],
    targetAudience: "Project sponsors and IT leaders planning EPM initiatives",
    categoryName: "EPM"
  },
  {
    title: "Financial Close Acceleration: From 10 Days to 5 Days",
    brief: "Practical strategies for halving financial close cycles. Cover process automation, reconciliation improvements, intercompany accounting optimisation, and the role of EPM tools. Include benchmarks from high-performing finance teams and a phased implementation approach.",
    targetKeywords: ["financial close acceleration", "fast close process", "close cycle reduction", "finance automation", "month-end close optimisation"],
    targetAudience: "Controllers and Finance Operations leaders",
    categoryName: "Finance Operations"
  },
  {
    title: "The Hidden Costs of Spreadsheet Dependency: When to Migrate to EPM",
    brief: "Analyse the true costs of Excel-based planning including error rates, version control issues, audit risks, and productivity losses. Provide a decision framework for when spreadsheet complexity demands EPM migration, including ROI calculations and migration readiness assessments.",
    targetKeywords: ["spreadsheet risks", "Excel to EPM migration", "planning tool selection", "finance digital transformation", "spreadsheet errors cost"],
    targetAudience: "Finance leaders managing growing complexity in their planning processes",
    categoryName: "Digital Transformation"
  }
];

const OPENAI_API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1";

async function fixDraftContent(
  content: string,
  violations: any[],
  title: string
): Promise<{ success: boolean; content?: string; tokensUsed?: number }> {
  const missingFAQs = violations.some(v => v.ruleName.toLowerCase().includes('faq'));
  const missingConclusion = violations.some(v => v.ruleName.toLowerCase().includes('conclusion'));
  const missingVisuals = violations.some(v => v.ruleName.toLowerCase().includes('visual'));
  const wordCountTooLow = violations.some(v => v.ruleName.toLowerCase().includes('word'));
  
  const currentWordCount = content.split(/\s+/).filter(w => w.length > 0).length;
  const wordsNeeded = Math.max(2500 - currentWordCount, 0);

  const fixPrompt = `CRITICAL: This article about "${title}" needs MAJOR expansion and fixes.

CURRENT WORD COUNT: ${currentWordCount} words
REQUIRED MINIMUM: 2,500 words
WORDS TO ADD: ${wordsNeeded}+ additional words

=== REQUIRED FIXES ===
${wordCountTooLow ? `1. EXPAND SIGNIFICANTLY - Add ${wordsNeeded}+ more words by:
   - Adding 2-3 more paragraphs to each main section (150 words each)
   - Including more specific examples, case studies, and data points
   - Elaborating on implementation details and best practices
   - Adding "Why this matters" explanations for key points
` : ''}${missingFAQs ? `2. ADD ## FAQs section:
   - 5 questions CFOs commonly ask
   - Each answer should be 75-100 words with specific, actionable advice
   - Total section: 400-500 words
` : ''}${missingConclusion ? `3. ADD ## Conclusion section (300 words):
   - 200 words summarising key insights
   - Clear call to action
   - 5-bullet executive summary with specific recommendations
` : ''}${missingVisuals ? `4. ADD ALL visual markers:
   - [KEY_TAKEAWAY_GRID] with {"takeaways": ["Insight 1 with data", "Insight 2", "Insight 3", "Insight 4"]}
   - [FIVE_PILLARS] with {"pillars": [{"name": "Name", "description": "100-word description"}, ...5 total]}
   - [IMPLEMENTATION_TIMELINE] with {"phases": [{"phase": "Phase 1", "duration": "Weeks 1-4", "activities": ["Task 1", "Task 2"]}, ...5-6 phases]}
   - [CHART:bar:unique-id] with {"title": "Title", "data": [{"label": "A", "value": 45}, {"label": "B", "value": 32}]}
` : ''}

=== CURRENT ARTICLE ===
${content}

=== OUTPUT REQUIREMENTS ===
1. Return ONLY the complete expanded article in markdown format
2. Preserve ALL original content - do not remove anything
3. Use UK English: organisation, optimise, analyse, colour, behaviour
4. Use contractions naturally: we've, it's, don't, that's
5. Final word count MUST exceed 2,500 words
6. Include all visual markers in their proper locations within the content

Write the complete, expanded article now. Do not abbreviate or truncate any section.`;

  try {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert content editor specialising in long-form business content. Your task is to SIGNIFICANTLY EXPAND articles to meet word count requirements while adding missing sections. You MUST add substantial content - at least 1,000 additional words when expanding. Use UK English throughout. Never summarise or shorten - always expand with more detail, examples, and insights."
          },
          {
            role: "user",
            content: fixPrompt
          }
        ],
        max_tokens: 16000,
        temperature: 0.75,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const expandedContent = data.choices[0]?.message?.content || "";
      const expandedWordCount = expandedContent.split(/\s+/).filter((w: string) => w.length > 0).length;
      console.log(`[AutoFix] Expanded from ${currentWordCount} to ${expandedWordCount} words`);
      return {
        success: true,
        content: expandedContent,
        tokensUsed: data.usage?.total_tokens || 0
      };
    }
    return { success: false };
  } catch (error) {
    console.error(`[AutoFix] Error:`, error);
    return { success: false };
  }
}

async function runBlogGenerationPipeline(
  jobId: string,
  title: string,
  brief: string,
  targetKeywords: string[],
  targetAudience: string,
  categoryName: string,
  useDeepResearch: boolean = true
): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[Pipeline] Starting blog generation for: ${title}`);
  console.log(`${'='.repeat(80)}\n`);

  const ctx = {
    jobId,
    totalTokens: 0,
    currentStage: "research",
    guardrailResults: [] as any[],
    retryCount: 0,
    maxRetries: 2
  };

  try {
    await storage.updateBlogGenerationJob(jobId, {
      status: "in_progress",
      stage: "research",
      updatedAt: new Date()
    });

    console.log(`[Pipeline] Stage 1: Research ${useDeepResearch ? '(Deep Research Mode)' : '(Standard Mode)'}`);
    
    let researchResult;
    if (useDeepResearch) {
      researchResult = await blogGenerationService.runDeepResearch(brief, targetKeywords, targetAudience);
    } else {
      researchResult = await blogGenerationService.runStage1Research(brief, targetKeywords, targetAudience);
    }
    
    ctx.totalTokens += researchResult.tokensUsed || 0;
    
    await storage.updateBlogGenerationJob(jobId, {
      stage: "research",
      researchData: researchResult.output,
      citations: JSON.stringify(researchResult.citations || []),
      totalTokensUsed: ctx.totalTokens,
      updatedAt: new Date()
    });

    console.log(`[Pipeline] Research complete: ${researchResult.citations?.length || 0} citations, ${ctx.totalTokens} tokens`);

    console.log(`[Pipeline] Stage 2: Outline Generation`);
    await storage.updateBlogGenerationJob(jobId, {
      stage: "outline",
      updatedAt: new Date()
    });

    const outlineResult = await blogGenerationService.runStage2Outline(
      brief,
      researchResult.output,
      researchResult.citations || [],
      targetKeywords
    );
    
    ctx.totalTokens += outlineResult.tokensUsed || 0;
    
    await storage.updateBlogGenerationJob(jobId, {
      outlineData: outlineResult.output,
      totalTokensUsed: ctx.totalTokens,
      updatedAt: new Date()
    });

    console.log(`[Pipeline] Outline complete: ${ctx.totalTokens} total tokens`);

    const rulesResult = await storage.getGuardrailRules();
    await blogGenerationService.initializeGuardrails(rulesResult.items);
    
    const outlineValidation = blogGenerationService.validateGuardrails(outlineResult.output, "outline");
    ctx.guardrailResults.push({ ...outlineValidation, stage: "outline" });

    console.log(`[Pipeline] Stage 3: Draft Generation`);
    await storage.updateBlogGenerationJob(jobId, {
      stage: "draft",
      updatedAt: new Date()
    });

    const currentJob = await storage.getBlogGenerationJob(jobId);
    const outlineData = currentJob?.outlineData || outlineResult.output;

    const draftResult = await blogGenerationService.runStage3DraftSectional(
      brief,
      outlineData,
      researchResult.output,
      researchResult.citations || [],
      targetKeywords,
      categoryName
    );
    
    ctx.totalTokens += draftResult.tokensUsed || 0;

    let draftValidation = blogGenerationService.validateGuardrails(draftResult.output, "draft");
    ctx.guardrailResults.push({ ...draftValidation, stage: "draft" });

    const wordCount = draftResult.output.split(/\s+/).filter((w: string) => w.length > 0).length;
    console.log(`[Pipeline] Draft generated: ${wordCount} words`);

    if (!draftValidation.passed) {
      const errorViolations = draftValidation.violations.filter(v => v.severity === 'error');
      if (errorViolations.length > 0) {
        console.warn(`[Pipeline] Draft has ${errorViolations.length} violations: ${errorViolations.map(v => v.ruleName).join(', ')}`);
        console.log(`[Pipeline] Attempting auto-fix...`);
        
        const fixedResult = await fixDraftContent(
          draftResult.output,
          errorViolations,
          title
        );
        
        if (fixedResult.success && fixedResult.content) {
          ctx.totalTokens += fixedResult.tokensUsed || 0;
          draftResult.output = fixedResult.content;
          draftResult.mappedPost.content = fixedResult.content;
          
          draftValidation = blogGenerationService.validateGuardrails(fixedResult.content, "draft");
          const fixedWordCount = fixedResult.content.split(/\s+/).filter((w: string) => w.length > 0).length;
          console.log(`[Pipeline] Auto-fix complete: ${fixedWordCount} words, ${draftValidation.violations.filter(v => v.severity === 'error').length} remaining errors`);
        }
      }
    }

    const remainingErrors = draftValidation.violations.filter(v => v.severity === 'error');
    if (remainingErrors.length > 0) {
      console.error(`[Pipeline] Draft failed with ${remainingErrors.length} unresolved errors`);
      await storage.updateBlogGenerationJob(jobId, {
        stage: "draft",
        finalContent: JSON.stringify(draftResult.mappedPost),
        guardrailResults: JSON.stringify(ctx.guardrailResults),
        status: "failed",
        errorMessage: `Draft failed guardrails: ${remainingErrors.map(v => v.ruleName).join(', ')}`,
        totalTokensUsed: ctx.totalTokens,
        updatedAt: new Date()
      });
      return;
    }

    console.log(`[Pipeline] Stage 3.5: Winston AI Scan`);
    await storage.updateBlogGenerationJob(jobId, {
      stage: "winston_check",
      updatedAt: new Date()
    });

    try {
      const winstonResult = await runFullWinstonCheck(
        draftResult.mappedPost.content,
        title
      );
      
      if (winstonResult.aiResult.aiScore !== undefined) {
        console.log(`[Pipeline] Winston AI scores - AI: ${winstonResult.aiResult.aiScore}%, Plagiarism: ${winstonResult.plagiarismResult.plagiarismScore || 0}%`);
      }
    } catch (winstonError: any) {
      console.warn(`[Pipeline] Winston AI scan failed (continuing): ${winstonError.message}`);
    }

    console.log(`[Pipeline] Stage 4: Finalizing`);
    await storage.updateBlogGenerationJob(jobId, {
      stage: "finalizing",
      finalContent: JSON.stringify(draftResult.mappedPost),
      guardrailResults: JSON.stringify(ctx.guardrailResults),
      totalTokensUsed: ctx.totalTokens,
      updatedAt: new Date()
    });

    await storage.updateBlogGenerationJob(jobId, {
      status: "completed",
      stage: "completed",
      completedAt: new Date(),
      updatedAt: new Date()
    });

    const finalWordCount = draftResult.output.split(/\s+/).filter((w: string) => w.length > 0).length;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[Pipeline] COMPLETE: "${title}"`);
    console.log(`  - Words: ${finalWordCount}`);
    console.log(`  - Tokens: ${ctx.totalTokens}`);
    console.log(`  - Citations: ${researchResult.citations?.length || 0}`);
    console.log(`${'='.repeat(80)}\n`);

  } catch (error: any) {
    console.error(`[Pipeline] FAILED: ${error.message}`);
    await storage.updateBlogGenerationJob(jobId, {
      status: "failed",
      errorMessage: error.message,
      completedAt: new Date(),
      updatedAt: new Date()
    });
  }
}

async function generateBlogs(): Promise<void> {
  console.log(`\n${'#'.repeat(80)}`);
  console.log(`#  STARTING BLOG GENERATION - ${BLOG_TOPICS.length} BLOGS`);
  console.log(`${'#'.repeat(80)}\n`);

  try {
    const { db } = await import("../db");
    const { blogGenerationJobs, blogPosts } = await import("@shared/schema");
    await db.delete(blogGenerationJobs);
    await db.delete(blogPosts);
    console.log("[Setup] Cleared old blog generation jobs and posts");
  } catch (e) {
    console.log("[Setup] Could not clear old data via direct DB access");
  }

  for (let i = 0; i < BLOG_TOPICS.length; i++) {
    const topic = BLOG_TOPICS[i];
    console.log(`\n[${i + 1}/${BLOG_TOPICS.length}] Creating job for: ${topic.title}`);

    try {
      const job = await storage.createBlogGenerationJob({
        title: topic.title,
        brief: topic.brief,
        targetKeywords: topic.targetKeywords,
        targetAudience: topic.targetAudience,
        categoryId: null,
        status: "pending",
        stage: null,
        researchData: null,
        citations: null,
        outlineData: null,
        finalContent: null,
        guardrailResults: null,
        errorMessage: null,
        totalTokensUsed: 0,
        estimatedCost: null,
        triggeredBy: "script",
        updatedAt: null,
        completedAt: null,
      });

      console.log(`[${i + 1}/${BLOG_TOPICS.length}] Job created: ${job.id}`);

      await runBlogGenerationPipeline(
        job.id,
        topic.title,
        topic.brief,
        topic.targetKeywords,
        topic.targetAudience,
        topic.categoryName,
        true
      );

      console.log(`[${i + 1}/${BLOG_TOPICS.length}] Waiting 3 seconds before next blog...\n`);
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error: any) {
      console.error(`[${i + 1}/${BLOG_TOPICS.length}] Failed to generate blog: ${error.message}`);
    }
  }

  console.log(`\n${'#'.repeat(80)}`);
  console.log(`#  BLOG GENERATION COMPLETE`);
  console.log(`${'#'.repeat(80)}\n`);

  const jobs = await storage.getBlogGenerationJobs();
  const completed = jobs.filter(j => j.status === "completed").length;
  const failed = jobs.filter(j => j.status === "failed").length;
  
  console.log(`Results: ${completed} completed, ${failed} failed`);
}

generateBlogs().catch(console.error);
