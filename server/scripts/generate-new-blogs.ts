import { storage } from "../storage";
import { blogGenerationService } from "../services/blog-generation";
import { runFullWinstonCheck } from "../services/winston-ai";

const NEW_BLOG_TOPICS = [
  {
    title: "The Hidden Cost of Excel: When CFOs Should Make the EPM Migration",
    brief: `A comprehensive decision framework for CFOs evaluating when spreadsheets become a liability. Cover the key-person risk and version chaos that keeps CFOs up at night, the hybrid model (EPM as engine, Excel as sandbox), real cost calculations including hidden hours, audit risk, and scaling limitations. Provide a decision framework with specific trigger points based on company size, complexity, and compliance needs. Position OneStream vs Pigment for different scenarios. Reference that 78% of financial decisions rely on Excel data yet 88% of Excel files contain errors.`,
    targetKeywords: ["Excel vs EPM", "EPM migration", "spreadsheet risks", "CFO planning tools", "Excel errors cost"],
    targetAudience: "CFOs and Finance Directors at mid-market companies actively evaluating EPM solutions",
    categoryName: "EPM & ERP"
  },
  {
    title: "AI ROI Anxiety: Why 32% of CFOs Cannot Quantify Their AI Investments",
    brief: `Address the massive pain point that 75% of CFOs lead AI strategy yet only 45% can quantify ROI, with 97% of boards demanding regular AI progress updates. Cover why AI initiatives fail without solid EPM foundations, the three barriers slowing AI adoption (talent gaps, data quality, integration complexity), how OneStream and Pigment's embedded AI capabilities deliver measurable results, realistic expectations (median ROI is 10% not the 20%+ many target), and a framework for measuring AI value in finance including productivity gains, forecast accuracy, and decision velocity.`,
    targetKeywords: ["AI ROI finance", "CFO AI strategy", "AI quantification", "AI investment returns", "finance AI adoption"],
    targetAudience: "CFOs and Finance leaders under board pressure to demonstrate AI value",
    categoryName: "AI & Technology"
  },
  {
    title: "The 10-Day to 5-Day Close: How Modern CFOs Cut Financial Close Time in Half",
    brief: `Practical strategies for halving financial close cycles without adding headcount. Cover why investors use close speed as a proxy for company health, the three complexity causes (manual methods, disorganised tracking, lack of standardisation), real-world transformation showing 40-60% faster closes with OneStream, automation ROI of 300-500% in year one for targeted implementations, the continuous close concept (real-time reconciliation vs month-end scrambles), and a step-by-step roadmap from 15-day to 5-day close. Include that fast close time is a key indicator of well-run companies and directly impacts fundraising success.`,
    targetKeywords: ["financial close acceleration", "fast close process", "close cycle reduction", "finance automation", "month-end close optimisation"],
    targetAudience: "Controllers and Finance Operations leaders seeking efficiency gains",
    categoryName: "Finance Transformation"
  },
  {
    title: "EPM Implementation Horror Stories: The 5 Mistakes That Cost Fortune 500s Millions",
    brief: `Use real cautionary tales (anonymised) to position 1QG as the experienced partner who prevents implementation disasters. Cover the Agile EPM disaster (why iterative does not work for financial consolidation), scope creep and unclear objectives leading to budget overruns, the vendor mismatch problem (choosing partners without proven expertise), data quality nightmares (garbage in garbage out at enterprise scale), user resistance killing projects (the change management failure), and best practices for co-implementation methodology with Pigment and OneStream. This builds trust by demonstrating expertise and risk awareness.`,
    targetKeywords: ["EPM implementation failure", "EPM project risks", "EPM best practices", "enterprise software implementation", "change management EPM"],
    targetAudience: "Project sponsors and IT leaders planning EPM initiatives who fear implementation failure",
    categoryName: "EPM & ERP"
  },
  {
    title: "From Cost Centre to Strategic Partner: The Modern CFO's Tech Stack for 2025",
    brief: `Comprehensive guide on how the CFO role is transforming from controller to strategic catalyst. Cover that only 35% of CFOs believe their current tech stack meets their needs and 99% experienced significant tech issues in 2024. Include the CFO role evolution from number cruncher to strategic visionary, the integrated tech stack (ERP plus EPM plus automation plus AI working together), OneStream vs Pigment comparison (enterprise compliance-first vs agile collaboration-first), decision criteria framework (scalability, integration capability, AI readiness, user adoption), real transformation stories showing CFOs driving 30% cost reductions and becoming board-level strategic partners, and a 2025-2027 technology roadmap for forward-thinking CFOs.`,
    targetKeywords: ["CFO tech stack 2025", "finance technology", "CFO digital transformation", "EPM selection guide", "finance systems integration"],
    targetAudience: "CFOs in active evaluation mode and those in earlier research phases",
    categoryName: "Industry Insights"
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
   - [FIVE_PILLARS] with {"pillars": [{"title": "Name", "description": "100-word description"}, ...5 total]}
   - [IMPLEMENTATION_TIMELINE] with {"phases": [{"phase": "Phase 1", "duration": "Weeks 1-4", "activities": ["Task 1", "Task 2"]}, ...5-6 phases]}
   - [CHART:bar:unique-id] with {"title": "Title", "data": [{"label": "A", "value": 45}, {"label": "B", "value": 32}]}
` : ''}

=== CURRENT ARTICLE ===
${content}

=== OUTPUT REQUIREMENTS ===
1. Return ONLY the complete expanded article in markdown format
2. Preserve ALL original content - do not remove anything
3. Use UK English: organisation, optimise, analyse, colour, behaviour
4. Write in a FORMAL, PROFESSIONAL consulting firm tone (McKinsey/Bain/Deloitte style)
5. NEVER use informal phrases like "Here's the thing:", "Look,", "Frankly,", "Honestly,"
6. Final word count MUST exceed 2,500 words
7. Include all visual markers in their proper locations within the content

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
            content: "You are a senior partner at a top-tier management consulting firm (McKinsey, Bain, BCG, Deloitte). Your task is to SIGNIFICANTLY EXPAND articles to meet word count requirements while maintaining a FORMAL, PROFESSIONAL tone throughout. Use UK English. NEVER use casual phrases like 'Here's the thing:', 'Look,', 'Frankly,', 'Honestly,'. Write in an authoritative, board-level voice."
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
  console.log(`#  STARTING BLOG GENERATION - ${NEW_BLOG_TOPICS.length} BLOGS`);
  console.log(`${'#'.repeat(80)}\n`);

  for (let i = 0; i < NEW_BLOG_TOPICS.length; i++) {
    const topic = NEW_BLOG_TOPICS[i];
    console.log(`\n[${i + 1}/${NEW_BLOG_TOPICS.length}] Creating job for: ${topic.title}`);

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

      console.log(`[${i + 1}/${NEW_BLOG_TOPICS.length}] Job created: ${job.id}`);

      await runBlogGenerationPipeline(
        job.id,
        topic.title,
        topic.brief,
        topic.targetKeywords,
        topic.targetAudience,
        topic.categoryName,
        true
      );

      console.log(`[${i + 1}/${NEW_BLOG_TOPICS.length}] Waiting 5 seconds before next blog...\n`);
      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error: any) {
      console.error(`[${i + 1}/${NEW_BLOG_TOPICS.length}] Failed to generate blog: ${error.message}`);
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
