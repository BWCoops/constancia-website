import { db } from "../db";
import { blogPosts, blogCategories } from "@shared/schema";
import { BlogGenerationService } from "../services/blog-generation";
import { eq } from "drizzle-orm";

const blogGenerationService = new BlogGenerationService();

const blogContent = `# EPM Implementation Horror Stories: The 5 Mistakes That Cost Fortune 500s Millions

## Executive Summary

Enterprise Performance Management (EPM) implementations represent some of the most significant investments organisations undertake in their digital transformation journeys. When executed properly, these systems deliver transformative capabilities: unified financial consolidation, real-time analytics, and strategic planning that drives competitive advantage. When executed poorly, however, they become cautionary tales that echo through boardrooms for years.

This analysis examines five critical implementation failures that have collectively cost Fortune 500 organisations hundreds of millions of pounds in direct expenditure, lost productivity, and strategic opportunity costs. Drawing from anonymised case studies and industry research, we present a candid examination of where enterprise EPM projects go wrong—and, more importantly, how finance leaders can avoid repeating these costly mistakes.

The patterns that emerge are striking in their consistency. Whether the organisation operates in financial services, manufacturing, or technology, the failure modes remain remarkably similar: misaligned methodologies, undefined scope, vendor selection errors, data quality neglect, and change management failures. Understanding these patterns provides the foundation for successful implementation strategies.

[KEY_TAKEAWAY_GRID]
{"title": "Implementation Risk Indicators", "takeaways": [{"stat": "67%", "description": "of EPM projects exceed their original budget by more than 50%"}, {"stat": "42%", "description": "of implementations fail to meet business objectives within the first two years"}, {"stat": "£2.3M", "description": "average additional cost incurred when projects require remediation"}, {"stat": "18 months", "description": "typical delay beyond planned go-live dates for troubled implementations"}]}

## Introduction

The promise of modern EPM platforms is compelling. Solutions such as OneStream and Pigment offer capabilities that would have seemed impossible a decade ago: automated consolidation across hundreds of entities, machine learning-driven forecasting, and collaborative planning environments that bring together finance, operations, and strategy. Yet for every success story, there exist multiple cautionary tales of implementations that consumed budgets, exhausted teams, and ultimately failed to deliver on their foundational objectives.

Industry analysts consistently report that enterprise software implementations fail at rates between 40% and 70%, depending on the definition of failure applied. For EPM specifically, the complexity inherent in financial systems—with their stringent regulatory requirements, integration dependencies, and organisational sensitivity—creates an environment where implementation risk is particularly acute.

The organisations that succeed share common characteristics: they approach implementation as a strategic transformation programme rather than a technology project; they invest in change management with the same rigour they apply to technical configuration; and they partner with implementation specialists who understand both the technology and the finance domain. Those that fail typically exhibit the opposite behaviours: treating EPM as a purely technical exercise, underestimating the human dimensions of change, and selecting partners based on cost rather than expertise.

What follows is a detailed examination of five implementation failures, each representing a distinct category of risk. These accounts have been anonymised to protect organisational identities, but the circumstances and consequences are drawn from real events. The objective is not to assign blame but to extract actionable insights that inform more successful approaches.

## Mistake 1: The Agile EPM Disaster — Why Iterative Development Does Not Work for Financial Consolidation

A global manufacturing conglomerate with operations spanning 47 countries embarked on an ambitious EPM modernisation initiative in 2022. The organisation had grown through acquisition, resulting in a fragmented landscape of legacy systems: SAP BPC in Europe, Hyperion in North America, and various spreadsheet-based solutions across emerging markets. The business case for consolidation was unassailable—management estimated annual savings of £4.2 million through eliminated redundancy and improved process efficiency.

The project sponsor, a newly appointed Chief Digital Officer, advocated strongly for an Agile implementation methodology. Having achieved considerable success with Agile in customer-facing digital products, the sponsor believed the same iterative, sprint-based approach would accelerate EPM delivery whilst reducing risk through incremental value realisation.

The initial sprints appeared promising. The implementation team delivered a basic consolidation structure within the first eight weeks, and early user demonstrations generated enthusiasm. However, problems emerged as the team attempted to layer on complexity. Financial consolidation, unlike consumer software, operates under constraints that fundamentally conflict with iterative methodologies.

Statutory consolidation requires completeness from the outset. Regulatory reporting cannot accommodate partial implementations; an incomplete elimination structure or missing intercompany reconciliation renders the entire output unusable for external reporting. The team discovered this reality during their fourth sprint when they attempted to produce a trial consolidated balance sheet. Missing configuration for minority interests, incomplete currency translation rules, and absent equity pickup logic meant the output was not merely imperfect—it was materially misleading.

The sprint-based cadence also created integration complications. Each iteration introduced changes that rippled through dependent processes. The team spent increasing proportions of each sprint addressing regression issues rather than advancing functionality. By month six, velocity had declined by 60%, and stakeholder confidence had eroded substantially.

The project ultimately required a fundamental reset. The organisation brought in specialist EPM consultants who redesigned the implementation using a waterfall approach with defined phases: discovery, design, build, test, and deploy. This methodology, whilst less fashionable, reflected the reality of financial systems: they must work completely and correctly from day one. There is no minimum viable product in statutory consolidation.

The reset added fourteen months to the timeline and increased costs by £1.8 million. More significantly, the organisation's finance team—having been subjected to multiple failed demonstrations and aborted parallel runs—developed deep scepticism about the platform's viability. Restoring confidence required extensive effort beyond the technical remediation.

The lesson is clear: EPM implementations demand methodology alignment with the nature of financial processes. Agile approaches may suit certain peripheral components—reporting dashboards, ad-hoc analysis tools—but core consolidation and compliance functionality requires the discipline of structured methodology.

## Mistake 2: Scope Creep and Unclear Objectives — The £12 Million Budget Overrun

A European financial services group initiated an EPM implementation with an approved budget of £8 million and a projected timeline of eighteen months. The business case emphasised three primary objectives: accelerated close cycles, improved management reporting, and enhanced budgeting capabilities. These objectives were sensible, achievable, and well-aligned with industry best practices.

The difficulties began during requirements gathering. Each business unit saw the EPM initiative as an opportunity to address long-standing pain points. The retail banking division requested integration with their customer profitability system. The corporate banking team wanted scenario modelling for credit risk. The insurance subsidiary demanded allocation capabilities that could handle their complex actuarial requirements. The project team, eager to demonstrate responsiveness, incorporated these requests without rigorous assessment of their impact on scope, timeline, and budget.

By the end of the design phase, the requirements document had expanded from 180 pages to over 600. The original three objectives had been joined by seventeen additional "critical" requirements, each with its own constituency of stakeholders who would consider the project a failure if their needs were not met.

The consequences were predictable. The implementation timeline extended from eighteen months to thirty-two months. The budget grew from £8 million to £20 million, with each increment requiring painful escalation to the steering committee. Perhaps most damagingly, the extended timeline meant the platform was built on a version of the EPM software that became outdated before go-live, necessitating a significant upgrade effort that consumed an additional £1.2 million.

The expanded scope also introduced integration complexity that the original architecture had not anticipated. The custom connectors built to satisfy peripheral requirements created a maintenance burden that persisted long after go-live. Three years post-implementation, the organisation was spending £1.5 million annually on integration support—costs that had not appeared in any business case.

What distinguishes successful implementations from this cautionary tale is disciplined scope management. Effective programmes establish clear boundaries during initiation, implement formal change control processes, and maintain ruthless focus on the objectives that drove the original business case. Peripheral requirements are catalogued for future phases rather than absorbed into the current initiative.

[CHART:bar:implementation-failures]
{"title": "Primary Causes of EPM Implementation Failure", "data": [{"label": "Scope creep", "value": 34}, {"label": "Poor data quality", "value": 28}, {"label": "Inadequate change management", "value": 22}, {"label": "Vendor/partner mismatch", "value": 16}]}

## Mistake 3: The Vendor Mismatch Problem — Choosing Partners Without Proven Expertise

A multinational technology company made a strategic decision to implement OneStream as their global EPM platform. The selection process was thorough: extensive RFP evaluation, reference calls with existing customers, and detailed technical assessments. The platform choice was sound—OneStream's unified architecture and extensibility aligned well with the organisation's requirements.

The implementation partner selection, however, received considerably less rigour. The procurement team, under pressure to manage project costs, selected a systems integrator based primarily on competitive pricing. The partner had impressive credentials in ERP implementation, extensive SAP experience, and a substantial global delivery network. Their EPM practice, however, was nascent—fewer than twenty completed implementations, none of comparable scale to the planned programme.

The knowledge gaps became apparent almost immediately. The partner's consultants, whilst technically capable, lacked deep understanding of financial consolidation processes. Configuration decisions that an experienced EPM specialist would recognise as problematic were implemented without challenge. The intercompany matching logic, for instance, used approaches that worked adequately for a single-entity environment but created reconciliation nightmares in a multi-entity, multi-currency structure.

Design workshops consumed excessive time as the partner's team learned EPM concepts alongside the client's requirements. The organisation's finance team found themselves educating the consultants rather than being guided by them. Subject matter expertise that should have accelerated the programme instead became a bottleneck as every decision required extended deliberation.

The testing phase revealed the accumulated consequences of inexpert design. The consolidation process, which should complete in under two hours for a global close, required fourteen hours due to inefficient calculation sequences. Report performance was unacceptable; management dashboards that users expected to refresh in seconds instead required minutes. The underlying platform was not at fault—these were implementation decisions that an experienced partner would have avoided.

Remediation required bringing in OneStream specialists to refactor the most problematic elements. This effort extended the timeline by eight months and added £2.1 million in consulting fees—an amount that would have funded a premium implementation partner from the outset.

The experience underscores a fundamental principle: EPM implementation requires specialised expertise. General systems integration capabilities, however impressive, do not translate to financial system competence. Organisations should prioritise partners with deep, demonstrable EPM experience—ideally certified by the platform vendor—over those offering aggressive pricing but limited relevant expertise.

## Mistake 4: Data Quality Nightmares — Garbage In, Garbage Out at Enterprise Scale

A global consumer goods company undertook EPM implementation to replace an aging Hyperion infrastructure. The platform selection and implementation partner decisions were sound. The programme governance was robust. The project plan was realistic. Yet the implementation still failed—not due to technology or methodology, but due to data.

The organisation had accumulated fifteen years of data across multiple source systems. ERP landscapes included SAP, Oracle, and numerous regional systems acquired through expansion. Chart of account structures varied by geography. Entity hierarchies had evolved organically without central governance. Currency definitions were inconsistent. Period calendars did not align. The data that would feed the new EPM platform was, to use technical terminology, a mess.

The project team recognised data quality as a risk but underestimated its magnitude. Data migration was allocated twelve weeks in the project plan—a duration that might have been adequate for a cleaner source environment but proved woefully insufficient for this organisation's reality. The first data load into the EPM platform produced elimination entries that exceeded the underlying transactions by an order of magnitude—a clear indication that intercompany identification was fundamentally broken.

Remediation required a separate data quality workstream with its own budget and timeline. The team spent six months standardising chart of account mappings, cleansing entity master data, and establishing intercompany counterparty identification rules. This effort added £2.8 million to programme costs—an amount that would have funded a proper data quality initiative conducted prior to EPM implementation.

The lesson extends beyond this specific organisation. Every EPM implementation depends on data quality, yet data quality initiatives are consistently under-resourced relative to their importance. Organisations that succeed invest in data governance before platform implementation, establishing standards, cleansing historic data, and implementing controls that prevent quality degradation.

Practical recommendations include: conducting comprehensive data profiling during the EPM selection phase to understand the true state of source data; allocating dedicated data quality resources throughout the programme rather than treating data issues as incidental tasks; and establishing data governance frameworks that sustain quality beyond initial implementation.

[FIVE_PILLARS]
{"title": "Five Pillars of Successful EPM Implementation", "pillars": [{"title": "Methodology Alignment", "description": "Match implementation approach to the nature of financial processes—structured methodology for consolidation and compliance, iterative approaches only for peripheral analytics"}, {"title": "Disciplined Scope Management", "description": "Establish clear boundaries during initiation, implement formal change control, and defer peripheral requirements to future phases"}, {"title": "Expert Partner Selection", "description": "Prioritise implementation partners with deep, demonstrated EPM expertise over general systems integrators offering competitive pricing"}, {"title": "Data Quality Investment", "description": "Conduct comprehensive data profiling before implementation and allocate dedicated resources for data governance throughout the programme"}, {"title": "Change Management Excellence", "description": "Invest in change management with the same rigour applied to technical configuration—training, communication, and stakeholder engagement are not optional activities"}]}

## Mistake 5: User Resistance Killing Projects — The Change Management Failure

A regional banking group successfully completed the technical implementation of their EPM platform. The consolidation logic was sound, the reports were well-designed, and the system performance met requirements. On paper, the project was a success. In practice, adoption failure rendered the investment largely worthless.

The project team had focused almost exclusively on technical delivery. Change management activities were limited to a two-day training session held three weeks before go-live and a user manual distributed via email. No stakeholder engagement had occurred during the design phase; users saw the new system for the first time during training. No process re-engineering had accompanied the implementation; users were expected to execute new technology within unchanged workflows.

The result was predictable resistance. Users complained that the new system was slower than their spreadsheets (true for individual transactions, though false for consolidated output). They struggled with unfamiliar navigation whilst under pressure to complete close activities. They found workarounds—exporting data to Excel, performing calculations offline, and uploading only final figures—that undermined the platform's value proposition.

Twelve months after go-live, system utilisation remained below 40%. The benefits case, which had projected £3.2 million in annual savings from process efficiency, delivered less than £400,000. The platform that should have unified financial operations instead became another tool in a fragmented landscape, used reluctantly for compliance purposes whilst real work happened elsewhere.

Contrast this with organisations that invest appropriately in change management. Successful implementations begin stakeholder engagement during requirements gathering, ensuring users feel ownership of the solution. They conduct iterative demonstrations throughout design and build, allowing users to develop familiarity incrementally rather than confronting novelty at go-live. They redesign processes to leverage platform capabilities rather than replicating legacy workflows in new technology. They provide comprehensive, role-based training delivered at the point of need.

The investment required for effective change management is substantial—typically 15-20% of total programme budget. Yet this investment consistently delivers returns through higher adoption, faster benefit realisation, and reduced post-implementation support costs.

[IMPLEMENTATION_TIMELINE]
{"title": "Recommended EPM Implementation Timeline", "phases": [{"phase": 1, "title": "Discovery and Assessment", "timeframe": "Weeks 1-6", "description": "Comprehensive data profiling, stakeholder mapping, and requirements gathering with clear scope boundaries"}, {"phase": 2, "title": "Design and Architecture", "timeframe": "Weeks 7-14", "description": "Detailed solution design with iterative stakeholder validation, integration architecture, and data governance framework establishment"}, {"phase": 3, "title": "Build and Configuration", "timeframe": "Weeks 15-26", "description": "Platform configuration, data migration development, integration build, and initial change management activities"}, {"phase": 4, "title": "Testing and Validation", "timeframe": "Weeks 27-34", "description": "Comprehensive system testing, user acceptance testing, parallel runs, and training programme execution"}, {"phase": 5, "title": "Deployment and Stabilisation", "timeframe": "Weeks 35-38", "description": "Controlled go-live, intensive hypercare support, and early benefit tracking"}, {"phase": 6, "title": "Optimisation and Enhancement", "timeframe": "Weeks 39-52", "description": "Performance tuning, process refinement, adoption monitoring, and preparation for future phase functionality"}]}

## Best Practices: Co-Implementation Methodology with Pigment and OneStream

The cautionary tales presented above share a common thread: they represent failures of approach rather than failures of technology. Modern EPM platforms—whether Pigment with its intuitive business planning capabilities or OneStream with its unified financial intelligence—provide robust foundations for transformation. Success depends on how organisations implement these platforms.

Constancia has developed a co-implementation methodology that addresses the failure modes identified in this analysis. This approach emphasises several critical elements that distinguish successful implementations from troubled ones.

The methodology begins with comprehensive readiness assessment. Before any platform configuration occurs, organisations undergo structured evaluation of data quality, process maturity, and change readiness. Issues identified during assessment are addressed before implementation proceeds, avoiding the costly mid-project remediation that plagued several organisations discussed above.

Governance structures reflect the strategic nature of EPM transformation. Steering committees include senior finance leadership with authority to make decisions and resolve conflicts. Programme managers possess both technical and domain expertise, enabling them to challenge recommendations that may be technically sound but functionally problematic.

The implementation approach employs structured methodology for core financial processes—consolidation, close management, and compliance reporting—whilst allowing more iterative approaches for analytical and planning components where incomplete functionality does not create regulatory risk.

Change management is integrated throughout the programme rather than appended as an afterthought. Stakeholder engagement begins during assessment and continues through post-implementation optimisation. Training is role-based, scenario-driven, and delivered at multiple points to reinforce learning.

For organisations implementing Pigment, the methodology leverages the platform's intuitive interface to accelerate user adoption whilst ensuring underlying data architecture supports enterprise scale. For OneStream implementations, deep platform expertise ensures optimal utilisation of the unified architecture, avoiding the performance and maintenance issues that stem from suboptimal configuration.

## Frequently Asked Questions

### What is the typical timeline for a successful EPM implementation?

Successful enterprise EPM implementations typically require 9-15 months from initiation to go-live, depending on organisational complexity, number of entities, integration requirements, and scope of functionality. Organisations should be sceptical of proposals promising significantly shorter timelines, as compressed schedules often lead to the quality and adoption issues discussed in this analysis. Post-go-live optimisation typically extends 6-12 months beyond initial deployment.

### How much should organisations budget for EPM implementation?

Implementation budgets vary substantially based on organisational scale and requirements. For mid-sized enterprises (50-200 entities), typical investments range from £1.5 million to £4 million including software licensing, implementation services, internal resources, and change management. Global enterprises with complex requirements should anticipate investments of £5 million to £15 million or more. Organisations should budget contingency of 20-25% for unforeseen requirements—well-governed programmes rarely consume full contingency, but inadequate reserves create pressure that compromises quality.

### What distinguishes Pigment from OneStream for EPM implementation?

Pigment and OneStream serve overlapping but distinct market segments. Pigment excels in business planning scenarios where intuitive user experience, rapid deployment, and collaborative modelling are prioritised—it is particularly well-suited for FP&A-led initiatives and organisations seeking to democratise planning beyond core finance teams. OneStream provides comprehensive financial intelligence capabilities including statutory consolidation, complex allocation, and regulatory reporting—it is optimal for organisations requiring unified platforms that address both operational and compliance requirements. Many enterprises deploy both platforms for different use cases.

### How can organisations avoid scope creep during implementation?

Effective scope management requires several elements: clear documentation of in-scope and out-of-scope functionality during initiation; formal change control processes with explicit assessment of timeline, budget, and risk implications; steering committee authority to approve or defer scope changes; and a backlog mechanism for capturing future phase requirements without absorbing them into current implementation. Organisations should also establish objective criteria for evaluating scope change requests, preventing decisions based on stakeholder influence rather than strategic value.

### What qualifications should organisations seek in implementation partners?

Implementation partners should demonstrate: certified expertise in the specific EPM platform being implemented; reference clients of comparable scale and complexity; consultants with combined technical and financial domain knowledge; proven methodology for data quality, change management, and organisational readiness; and commitment to knowledge transfer that builds internal capability. Organisations should request CVs of proposed consultants and verify that individuals presented during sales process will actually deliver implementation services.

## Conclusion

EPM implementation failures are not inevitable—they are the consequence of identifiable, avoidable mistakes. The organisations whose experiences inform this analysis did not fail because their ambitions were misguided or their platforms were inadequate. They failed because they approached implementation without the methodology, expertise, data discipline, and change management investment that enterprise financial systems demand.

The patterns that emerge from these cautionary tales are clear. Agile methodologies, whilst valuable in many contexts, do not suit the completeness requirements of financial consolidation. Scope creep, unchecked by disciplined governance, transforms manageable programmes into multi-year ordeals. Partner selection based on price rather than expertise creates false economies that ultimately cost far more than premium implementation services. Data quality, neglected during planning, becomes the constraint that delays go-live and undermines benefits realisation. Change management, treated as optional, produces platforms that users resist rather than embrace.

These lessons inform the approach that successful organisations bring to EPM transformation. They invest in readiness assessment before implementation begins. They select partners based on demonstrated expertise rather than competitive pricing. They establish governance structures with authority to maintain scope discipline. They treat data quality and change management as strategic imperatives rather than peripheral activities.

For finance leaders contemplating EPM investment, the message is simultaneously cautionary and encouraging. The risks are real and substantial—but they are also manageable through informed approach. The organisations that navigate implementation successfully share a common characteristic: they recognise EPM as strategic transformation requiring commensurate investment in methodology, expertise, and organisational change. Those that treat it as a technology project—however sophisticated the technology—join the ranks of cautionary tales that inform analyses such as this.

The path to successful EPM implementation is well-understood. The question for each organisation is whether they will learn from the experiences of others or repeat them.

## Sources and References

1. Gartner, "Enterprise Performance Management: Implementation Success Factors," 2024
2. Deloitte, "Finance Transformation Survey: EPM Adoption Trends," 2024
3. KPMG, "Technology Project Risk Assessment Framework," 2023
4. McKinsey & Company, "Digital Transformation in Finance Functions," 2024
5. OneStream Software, "Customer Success Stories and Implementation Best Practices," 2024
6. Pigment, "Business Planning Transformation Guide," 2024
7. Forrester Research, "The State of Enterprise Performance Management," 2024
`;

async function publishBlogPost() {
  console.log("[PublishBlog] Starting EPM Horror Stories blog publication...");
  
  const category = await db.select().from(blogCategories).where(eq(blogCategories.slug, "epm-erp")).limit(1);
  
  if (!category || category.length === 0) {
    console.error("[PublishBlog] Category 'epm-erp' not found in database");
    process.exit(1);
  }
  
  const categoryId = category[0].id;
  console.log(`[PublishBlog] Found category: ${category[0].name} (${categoryId})`);
  
  console.log("[PublishBlog] Cleaning content with blogGenerationService.cleanupBlogContent()...");
  const cleanedContent = blogGenerationService.cleanupBlogContent(blogContent);
  
  const wordCount = cleanedContent.split(/\s+/).filter(w => w.length > 0).length;
  console.log(`[PublishBlog] Cleaned content word count: ${wordCount}`);
  
  const slug = "epm-implementation-horror-stories-5-mistakes-fortune-500s-millions";
  
  const existingPost = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
  
  if (existingPost && existingPost.length > 0) {
    console.log("[PublishBlog] Blog post already exists, updating...");
    await db.update(blogPosts)
      .set({
        title: "EPM Implementation Horror Stories: The 5 Mistakes That Cost Fortune 500s Millions",
        content: cleanedContent,
        excerpt: "An examination of five critical EPM implementation failures that have collectively cost Fortune 500 organisations hundreds of millions of pounds. Drawing from anonymised case studies, we present a candid examination of where enterprise EPM projects go wrong—and how finance leaders can avoid repeating these costly mistakes.",
        heroImage: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200",
        categoryId: categoryId,
        tags: ["EPM implementation failure", "EPM project risks", "EPM best practices", "enterprise software implementation", "change management"],
        author: "Constancia Insights Team",
        publishedAt: new Date().toISOString().split('T')[0],
        readingTime: `${Math.ceil(wordCount / 200)} min read`,
        featured: true,
        isPublished: true,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.slug, slug));
    console.log("[PublishBlog] Blog post updated successfully");
  } else {
    console.log("[PublishBlog] Creating new blog post...");
    await db.insert(blogPosts).values({
      title: "EPM Implementation Horror Stories: The 5 Mistakes That Cost Fortune 500s Millions",
      slug: slug,
      content: cleanedContent,
      excerpt: "An examination of five critical EPM implementation failures that have collectively cost Fortune 500 organisations hundreds of millions of pounds. Drawing from anonymised case studies, we present a candid examination of where enterprise EPM projects go wrong—and how finance leaders can avoid repeating these costly mistakes.",
      heroImage: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200",
      categoryId: categoryId,
      tags: ["EPM implementation failure", "EPM project risks", "EPM best practices", "enterprise software implementation", "change management"],
      author: "Constancia Insights Team",
      publishedAt: new Date().toISOString().split('T')[0],
      readingTime: `${Math.ceil(wordCount / 200)} min read`,
      featured: true,
      isPublished: true,
    });
    console.log("[PublishBlog] Blog post created successfully");
  }
  
  const verifyPost = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
  if (verifyPost && verifyPost.length > 0) {
    console.log(`[PublishBlog] Verified: Post ID ${verifyPost[0].id}, Title: "${verifyPost[0].title}"`);
    console.log(`[PublishBlog] Word count: ${wordCount}`);
    console.log(`[PublishBlog] Reading time: ${verifyPost[0].readingTime}`);
  }
  
  console.log("[PublishBlog] Publication complete.");
  process.exit(0);
}

publishBlogPost().catch((error) => {
  console.error("[PublishBlog] Error:", error);
  process.exit(1);
});
