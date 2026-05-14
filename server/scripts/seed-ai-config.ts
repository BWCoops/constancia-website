import { db } from "../db";
import {
  fcAiSystemPrompts,
  fcAiGuardrails,
  fcAiGroundingRules,
  fcAiKnowledgeBase,
  fcAiFollowupTemplates,
} from "@shared/finance-compass-schema";

const systemPrompts = [
  {
    key: "senior_finance_consultant",
    name: "Senior Finance Transformation Consultant",
    description: "Primary persona for most outputs. 25+ years experience as CFO and consultant. EPM specialist with holistic finance lens.",
    persona: "Senior Finance Transformation Consultant",
    category: "core_persona",
    content: `You are a Senior Finance Transformation Consultant with 25+ years of combined experience as a CFO and management consultant at Big 4 firms. You specialise in Enterprise Performance Management (EPM), finance operating models, and end-to-end finance transformation.

Your expertise includes:
- Financial planning and analysis (FP&A)
- Management reporting and analytics
- Month-end close and consolidation
- Finance operating model design
- Shared services and process optimisation
- Finance technology strategy
- Change management for finance transformations

Communication style:
- Use professional, consulting-grade language
- Be direct but supportive
- Provide actionable insights backed by benchmarks
- Always use UK English spelling (organisation, analyse, optimise)
- Never mention specific vendor names (Anaplan, SAP, Oracle, etc.) - describe capabilities instead
- Avoid slang, emoji, or casual language`,
    isActive: true,
    version: 1
  },
  {
    key: "data_analytics_specialist",
    name: "Finance Data & Analytics Specialist",
    description: "Used for Data & Analytics dimension assessments. Focus on data governance, BI, and advanced analytics.",
    persona: "Finance Data & Analytics Specialist",
    category: "core_persona",
    content: `You are a Finance Data & Analytics Specialist with deep expertise in finance data strategy, business intelligence, and advanced analytics. You understand how to build data-driven finance functions.

Your expertise includes:
- Finance data governance and master data management
- Business intelligence and self-service analytics
- Dashboard design and visualisation best practices
- Data quality frameworks
- Advanced analytics and predictive modelling
- Data architecture for finance
- Integration of finance data with operational systems

Communication style:
- Technical depth balanced with business context
- Data-driven recommendations with clear rationale
- Practical implementation guidance
- Always use UK English spelling
- Never mention specific vendor names - describe capabilities instead
- Professional consulting tone`,
    isActive: true,
    version: 1
  },
  {
    key: "implementation_specialist",
    name: "Finance Transformation Implementation Specialist",
    description: "Used for roadmap generation. Focus on phasing, dependencies, and change management.",
    persona: "Finance Transformation Implementation Specialist",
    category: "core_persona",
    content: `You are a Finance Transformation Implementation Specialist with extensive experience delivering complex finance transformation programmes. You specialise in phased implementation, risk management, and change management.

Your expertise includes:
- Transformation roadmap design
- Workstream planning and dependencies
- Resource estimation and team composition
- Risk identification and mitigation
- Change management and stakeholder engagement
- Benefits realisation and tracking
- Go-live readiness and cutover planning

Communication style:
- Practical and actionable guidance
- Clear phasing with realistic timelines
- Risk-aware recommendations
- Always use UK English spelling
- Never mention specific vendor names - describe capabilities instead
- Professional project management terminology`,
    isActive: true,
    version: 1
  }
];

const guardrails = [
  {
    key: "uk_english_spelling",
    name: "UK English Spelling Compliance",
    description: "Enforces British English spelling in all outputs",
    category: "content_language",
    priority: "critical",
    validationType: "regex_replace",
    validationConfig: {
      spellingPairs: {
        "organization": "organisation",
        "analyze": "analyse",
        "optimize": "optimise",
        "realize": "realise",
        "recognize": "recognise",
        "color": "colour",
        "behavior": "behaviour",
        "program": "programme"
      }
    },
    errorMessage: "Output contains US English spelling. Must use UK English (organisation, analyse, optimise, etc.)",
    isBlocking: true,
    isActive: true
  },
  {
    key: "vendor_neutrality",
    name: "No Vendor-Specific Recommendations",
    description: "Blocks mentions of specific vendor or product names",
    category: "content_language",
    priority: "critical",
    validationType: "blocklist",
    validationConfig: {
      blockedTerms: ["Anaplan", "OneStream", "Prophix", "SAP", "Oracle", "NetSuite", "Dynamics", "Power BI", "Tableau", "UiPath", "Automation Anywhere"]
    },
    errorMessage: "Output contains vendor names. Describe capabilities instead of mentioning specific products.",
    isBlocking: true,
    isActive: true
  },
  {
    key: "professional_tone",
    name: "Professional Consulting Tone",
    description: "Ensures professional language without slang, emoji, or casual expressions",
    category: "content_language",
    priority: "high",
    validationType: "blocklist",
    validationConfig: {
      blockedTerms: ["awesome", "super", "basically", "literally", "lol", "gonna", "wanna"],
      blockedPatterns: ["[!?]{2,}", "emoji"]
    },
    errorMessage: "Output contains casual language or emoji. Use professional consulting tone.",
    isBlocking: false,
    isActive: true
  },
  {
    key: "domain_restriction",
    name: "Finance Transformation Domain Only",
    description: "Ensures all content stays within finance transformation scope",
    category: "domain_quality",
    priority: "critical",
    validationType: "topic_classifier",
    validationConfig: {
      allowedTopics: ["finance", "FP&A", "reporting", "planning", "consolidation", "controls", "technology", "data", "analytics", "transformation"]
    },
    errorMessage: "Output strays from finance transformation domain. Stay focused on finance function topics.",
    isBlocking: true,
    isActive: true
  },
  {
    key: "seven_dimension_coverage",
    name: "7-Dimension Framework Compliance",
    description: "Ensures full assessments cover all 7 CFO framework dimensions",
    category: "domain_quality",
    priority: "high",
    validationType: "coverage_check",
    validationConfig: {
      requiredDimensions: ["FP&A", "Reporting", "Consolidation & Close", "Controls", "Technology", "Organisation", "Data & Analytics"]
    },
    errorMessage: "Full assessment must cover all 7 dimensions of the CFO framework.",
    isBlocking: false,
    isActive: true
  },
  {
    key: "factual_grounding",
    name: "Factual Accuracy with Caveats",
    description: "Ensures claims are grounded in knowledge base with appropriate caveats",
    category: "domain_quality",
    priority: "high",
    validationType: "claim_validation",
    validationConfig: {
      requireCaveats: true,
      caveatPhrases: ["typically", "in our experience", "benchmarks suggest", "depending on"]
    },
    errorMessage: "Claims must be grounded in knowledge base and include appropriate caveats.",
    isBlocking: false,
    isActive: true
  },
  {
    key: "recommendation_completeness",
    name: "Recommendation Structure Completeness",
    description: "Ensures recommendations include all required components",
    category: "domain_quality",
    priority: "medium",
    validationType: "structure_check",
    validationConfig: {
      requiredComponents: ["description", "rationale", "impact", "effort", "timeline"]
    },
    errorMessage: "Recommendations must include description, rationale, impact, effort, and timeline.",
    isBlocking: false,
    isActive: true
  },
  {
    key: "pii_protection",
    name: "PII Protection",
    description: "Prevents exposure of personal identifying information",
    category: "privacy_security",
    priority: "critical",
    validationType: "pii_detection",
    validationConfig: {
      protectedTypes: ["email", "phone", "national_id", "credit_card", "address"]
    },
    errorMessage: "Output contains personal identifying information. Remove or anonymise PII.",
    isBlocking: true,
    isActive: true
  },
  {
    key: "company_anonymisation",
    name: "Company Name Anonymisation",
    description: "Prevents company names from appearing in AI-generated outputs",
    category: "privacy_security",
    priority: "high",
    validationType: "entity_detection",
    validationConfig: {
      entityTypes: ["company_name", "client_name"]
    },
    errorMessage: "Output contains company names. Use 'the organisation' or 'your company' instead.",
    isBlocking: false,
    isActive: true
  },
  {
    key: "confidential_data",
    name: "Confidential Data Protection",
    description: "Prevents exposure of confidential financial data in outputs",
    category: "privacy_security",
    priority: "critical",
    validationType: "data_classification",
    validationConfig: {
      protectedCategories: ["financial_statements", "salary_data", "strategic_plans"]
    },
    errorMessage: "Output may contain confidential data. Review and redact as needed.",
    isBlocking: true,
    isActive: true
  },
  {
    key: "no_legal_advice",
    name: "No Legal/Tax/Investment Advice",
    description: "Prevents giving unqualified legal, tax, or investment advice",
    category: "compliance_governance",
    priority: "critical",
    validationType: "advice_detection",
    validationConfig: {
      prohibitedAdvice: ["legal", "tax", "investment"],
      requiredCaveat: "consult with your [legal/tax/financial] advisor"
    },
    errorMessage: "Output contains advice that requires professional qualification. Add appropriate caveats.",
    isBlocking: true,
    isActive: true
  },
  {
    key: "no_guaranteed_outcomes",
    name: "No Guaranteed Financial Outcomes",
    description: "Prevents making guaranteed financial predictions",
    category: "compliance_governance",
    priority: "high",
    validationType: "pattern_detection",
    validationConfig: {
      prohibitedPatterns: ["will reduce by \\d+%", "guaranteed to", "will save you £"]
    },
    errorMessage: "Output contains guaranteed outcome claims. Use qualifying language (typically, can, may).",
    isBlocking: false,
    isActive: true
  },
  {
    key: "output_length",
    name: "Output Length Compliance",
    description: "Ensures outputs meet length requirements for each tier",
    category: "operational",
    priority: "medium",
    validationType: "length_check",
    validationConfig: {
      tierLimits: {
        generation: { min: 200, max: 500 },
        pre_assessment: { min: 500, max: 2000 },
        full_assessment: { min: 2000, max: 8000 }
      }
    },
    errorMessage: "Output length does not meet tier requirements.",
    isBlocking: false,
    isActive: true
  },
  {
    key: "response_format",
    name: "Response Format Compliance",
    description: "Ensures outputs follow required structure and formatting",
    category: "operational",
    priority: "medium",
    validationType: "format_check",
    validationConfig: {
      requiredSections: ["summary", "analysis", "recommendations"]
    },
    errorMessage: "Output does not follow required format structure.",
    isBlocking: false,
    isActive: true
  },
  {
    key: "audit_logging",
    name: "Audit Trail Logging",
    description: "Ensures all AI interactions are logged for audit purposes",
    category: "operational",
    priority: "high",
    validationType: "logging_check",
    validationConfig: {
      requiredFields: ["timestamp", "user_id", "prompt", "response", "guardrail_results"]
    },
    errorMessage: "AI interaction not properly logged. Ensure audit trail is complete.",
    isBlocking: false,
    isActive: true
  }
];

const groundingRules = [
  {
    key: "seven_dimension_framework",
    name: "7-Dimension CFO Framework",
    description: "Detailed maturity level definitions for each of the 7 finance dimensions",
    category: "framework",
    content: `The 7-Dimension CFO Framework assesses finance function maturity across:

1. FP&A (Financial Planning & Analysis)
   - Level 1: Annual budget only, static planning
   - Level 2: Quarterly forecasts, spreadsheet-based
   - Level 3: Monthly rolling forecasts, some driver-based
   - Level 4: Continuous planning, integrated scenarios
   - Level 5: Predictive analytics, AI-enabled insights

2. Reporting
   - Level 1: Manual report creation, delayed delivery
   - Level 2: Standardised templates, semi-automated
   - Level 3: Self-service dashboards, real-time data
   - Level 4: Embedded analytics, proactive insights
   - Level 5: Prescriptive analytics, automated narratives

3. Consolidation & Close
   - Level 1: Manual close processes, extended timelines
   - Level 2: Basic automation, some standardization
   - Level 3: Workflow automation, structured close calendar
   - Level 4: Accelerated close with intelligent routing
   - Level 5: Continuous close with agentic AI handling exceptions

4. Controls
   - Level 1: Manual controls, ad-hoc monitoring
   - Level 2: Documented controls, periodic testing
   - Level 3: Automated controls, continuous monitoring
   - Level 4: Risk-based controls, real-time alerts
   - Level 5: Predictive risk management, AI-enabled

5. Technology
   - Level 1: Fragmented systems, heavy Excel use
   - Level 2: Core ERP, some integration
   - Level 3: Integrated platform, cloud-enabled
   - Level 4: Modern architecture, API-connected
   - Level 5: AI-enabled, fully automated

6. Organisation
   - Level 1: Siloed teams, unclear roles
   - Level 2: Defined structure, basic COE
   - Level 3: Shared services, business partnering
   - Level 4: Agile teams, cross-functional
   - Level 5: Digital workforce, strategic advisory

7. Data & Analytics
   - Level 1: Poor data quality, manual reconciliation
   - Level 2: Basic governance, standard definitions
   - Level 3: Master data management, data warehouse
   - Level 4: Data lake, advanced analytics
   - Level 5: AI/ML, real-time insights`,
    applicableTiers: ["generation", "pre_assessment", "full_assessment"],
    applicableDimensions: ["FP&A", "Reporting", "Consolidation & Close", "Controls", "Technology", "Organisation", "Data & Analytics"],
    isActive: true,
    version: 1
  },
  {
    key: "finance_benchmarks",
    name: "Finance Function Benchmarks",
    description: "Industry benchmarks for finance metrics by company size",
    category: "benchmarks",
    content: `Finance Function Benchmarks by Company Size:

Finance Cost Ratio (Finance staff cost as % of revenue):
- £10-50M revenue: 0.7-1.0%
- £50-250M revenue: 0.5-0.8%
- £250M-1B revenue: 0.4-0.6%
- £1B+ revenue: 0.3-0.5%

Finance FTE per £M Revenue:
- £10-50M revenue: 4-6 FTE per £M
- £50-250M revenue: 2-4 FTE per £M
- £250M-1B revenue: 1.5-2.5 FTE per £M
- £1B+ revenue: 1-2 FTE per £M

Close Cycle Benchmarks:
- Leading (<5 days): Level 5
- Advanced (5-8 days): Level 4
- Established (8-12 days): Level 3
- Developing (12-20 days): Level 2
- Ad-hoc (20+ days): Level 1

Planning Cycle Benchmarks:
- Leading (<20 days): Level 5
- Advanced (20-40 days): Level 4
- Established (40-60 days): Level 3
- Developing (60-90 days): Level 2
- Ad-hoc (90+ days): Level 1

EPM Readiness Score Interpretation:
- 80-100: Excellent - Proceed with EPM immediately
- 60-79: Strong - EPM strongly recommended
- 40-59: Moderate - Context-dependent
- 20-39: Weak - Focus on foundations first
- <20: Not ready - Address prerequisites`,
    applicableTiers: ["generation", "pre_assessment", "full_assessment"],
    applicableDimensions: [],
    isActive: true,
    version: 1
  },
  {
    key: "transformation_methodologies",
    name: "Finance Transformation Methodologies",
    description: "Proven consulting approaches for finance transformation",
    category: "methodology",
    content: `Proven Finance Transformation Methodologies:

1. Month-End Close Optimisation
   - Current state process mapping
   - Bottleneck identification
   - Automation opportunity assessment
   - Target operating model design
   - Phased implementation roadmap

2. Shared Services Implementation
   - Service catalogue definition
   - Location strategy
   - Transition planning
   - SLA framework design
   - Change management

3. EPM Implementation
   - Requirements definition
   - Solution design
   - Data integration strategy
   - User adoption programme
   - Continuous improvement

4. Finance Operating Model Design
   - Current state assessment
   - Future state vision
   - Gap analysis
   - Transition roadmap
   - Change management plan

5. Data Governance Framework
   - Data ownership model
   - Quality standards definition
   - Master data strategy
   - Governance processes
   - Technology enablement

Key Success Factors:
- Executive sponsorship
- Clear business case
- Dedicated resources
- Change management focus
- Phased approach
- Quick wins for momentum`,
    applicableTiers: ["full_assessment"],
    applicableDimensions: [],
    isActive: true,
    version: 1
  }
];

const knowledgeBase = [
  {
    key: "epm_roi_benchmarks",
    title: "EPM Implementation ROI Benchmarks",
    description: "Industry data on typical ROI from EPM implementations",
    category: "benchmarks",
    content: `EPM Implementation ROI Benchmarks:

Typical Benefits:
- 30-50% reduction in close cycle time
- 20-40% reduction in planning cycle time
- 40-60% reduction in manual effort
- 15-25% improvement in forecast accuracy
- 10-20% reduction in finance operating costs

Payback Period:
- Small implementations (<£500k): 12-18 months
- Medium implementations (£500k-2M): 18-24 months
- Large implementations (>£2M): 24-36 months

Success Rate:
- 70% of EPM projects achieve stated objectives
- 30% exceed expectations
- Key success factors: executive sponsorship, change management, data quality`,
    tags: ["ROI", "EPM", "business case"],
    applicableTiers: ["pre_assessment", "full_assessment"],
    applicableDimensions: ["FP&A", "Reporting", "Technology"],
    sourceCitation: "Industry research 2024",
    isActive: true,
    version: 1
  },
  {
    key: "close_optimisation",
    title: "Month-End Close Optimisation Guide",
    description: "Best practices for reducing close cycle time",
    category: "methodology",
    content: `Month-End Close Optimisation:

Quick Wins (1-3 months):
- Eliminate unnecessary reports
- Standardise journal entry templates
- Implement cut-off disciplines
- Reduce intercompany complexity

Medium-Term (3-6 months):
- Automate reconciliations
- Implement close management tools
- Enhance system integration
- Standardise chart of accounts

Long-Term (6-12 months):
- Continuous close capabilities
- Real-time consolidation
- Predictive analytics for accruals
- Self-service reporting

Typical Results:
- 40-50% reduction achievable in 12 months
- Leading organisations close in 3-5 days
- Continuous close enables real-time visibility`,
    tags: ["close", "consolidation", "optimisation"],
    applicableTiers: ["pre_assessment", "full_assessment"],
    applicableDimensions: ["Consolidation & Close", "Reporting"],
    sourceCitation: "Finance transformation best practices 2024",
    isActive: true,
    version: 1
  },
  {
    key: "data_governance_framework",
    title: "Finance Data Governance Framework",
    description: "Framework for establishing finance data governance",
    category: "methodology",
    content: `Finance Data Governance Framework:

Core Components:
1. Data Ownership
   - Assign business owners for key data domains
   - Define stewardship responsibilities
   - Establish escalation processes

2. Data Quality
   - Define quality dimensions (accuracy, completeness, timeliness)
   - Implement quality monitoring
   - Establish remediation processes

3. Master Data Management
   - Identify master data domains (GL, cost centres, products)
   - Define golden source systems
   - Implement synchronisation processes

4. Metadata Management
   - Maintain data dictionary
   - Document data lineage
   - Manage business glossary

5. Data Security
   - Classify data sensitivity
   - Implement access controls
   - Monitor data access

Implementation Timeline:
- Foundation (3-6 months): Governance structure, key policies
- Build (6-12 months): MDM implementation, quality processes
- Mature (12-24 months): Advanced analytics, predictive quality`,
    tags: ["data", "governance", "MDM"],
    applicableTiers: ["full_assessment"],
    applicableDimensions: ["Data & Analytics", "Technology"],
    sourceCitation: "Data governance best practices 2024",
    isActive: true,
    version: 1
  },
  {
    key: "finance_shared_services",
    title: "Finance Shared Services Design Guide",
    description: "Guide for designing and implementing finance shared services",
    category: "methodology",
    content: `Finance Shared Services Design:

Service Scope (Typical):
- Accounts payable (70-90% of volume)
- Accounts receivable (60-80% of volume)
- General accounting (50-70% of volume)
- Travel & expenses (80-95% of volume)
- Fixed assets (70-85% of volume)

Location Options:
- Onshore (high cost, low risk)
- Nearshore (balanced)
- Offshore (low cost, higher risk)
- Hybrid (optimised by function)

Operating Model:
- Functional towers (AP, AR, GL)
- End-to-end process ownership
- Hybrid approaches
- Centre of excellence

Technology Enablers:
- Workflow automation
- Robotic process automation
- Self-service portals
- Analytics dashboards

Typical Savings:
- 20-30% cost reduction achievable
- 30-50% productivity improvement
- 40-60% error reduction`,
    tags: ["shared services", "operating model", "outsourcing"],
    applicableTiers: ["full_assessment"],
    applicableDimensions: ["Organisation", "Consolidation & Close"],
    sourceCitation: "Shared services best practices 2024",
    isActive: true,
    version: 1
  },
  {
    key: "finance_technology_stack",
    title: "Modern Finance Technology Stack",
    description: "Overview of modern finance technology landscape",
    category: "technology",
    content: `Modern Finance Technology Stack:

Core Systems:
- ERP (financial accounting, GL, AP, AR)
- EPM (planning, budgeting, consolidation)
- Treasury management
- Tax compliance

Analytics Layer:
- Data warehouse/data lake
- Business intelligence
- Advanced analytics
- Self-service tools

Automation:
- Robotic process automation (RPA)
- Intelligent document processing
- Workflow automation
- Exception handling

Integration:
- API-based connectivity
- iPaaS platforms
- Data integration tools
- Master data management

Emerging Technologies:
- AI/ML for forecasting
- Natural language processing
- Blockchain for audit
- Real-time analytics

Selection Criteria:
- Scalability and performance
- Integration capabilities
- User experience
- Total cost of ownership
- Vendor viability`,
    tags: ["technology", "ERP", "EPM", "analytics"],
    applicableTiers: ["pre_assessment", "full_assessment"],
    applicableDimensions: ["Technology", "Data & Analytics"],
    sourceCitation: "Finance technology trends 2024",
    isActive: true,
    version: 1
  }
];

const followupTemplates = [
  {
    key: "low_maturity_probe",
    name: "Low Maturity Deep Dive",
    description: "Follow-up when dimension maturity is Level 1-2",
    triggerCondition: { maturityLevel: { min: 1, max: 2 } },
    promptTemplate: "You've indicated significant challenges in {{dimension}}. Could you tell me more about the specific pain points you experience? What workarounds has your team developed to cope with these challenges?",
    dimension: null,
    priority: 1,
    isActive: true
  },
  {
    key: "high_manual_effort",
    name: "High Manual Work Investigation",
    description: "Follow-up when manual work exceeds 60%",
    triggerCondition: { manualWork: { min: 60 } },
    promptTemplate: "You mentioned that a significant portion of your {{process}} work is manual. Could you describe the top 3 manual tasks that consume the most time? What tools do you currently use for these tasks?",
    dimension: null,
    priority: 2,
    isActive: true
  },
  {
    key: "data_quality_issues",
    name: "Data Quality Issues Probe",
    description: "Follow-up when data quality is flagged as concern",
    triggerCondition: { dataQuality: "poor" },
    promptTemplate: "You've indicated challenges with data quality. How does poor data quality impact your decision-making today? Can you give an example of a recent issue caused by data problems?",
    dimension: "Data & Analytics",
    priority: 1,
    isActive: true
  },
  {
    key: "transformation_readiness",
    name: "Transformation Readiness Assessment",
    description: "Follow-up when urgency is high but capability may be low",
    triggerCondition: { urgency: { min: 4 }, capability: { max: 2 } },
    promptTemplate: "You've expressed urgency for transformation, but your current capabilities suggest some foundational work may be needed. What resources and budget do you have available for transformation? What is your organisation's appetite for change?",
    dimension: "Organisation",
    priority: 3,
    isActive: true
  },
  {
    key: "technology_constraints",
    name: "Technology Constraints Exploration",
    description: "Follow-up when technology is identified as barrier",
    triggerCondition: { techBarrier: true },
    promptTemplate: "You've indicated technology is a constraint. What are the biggest limitations of your current systems? Are there any planned technology investments or replacements in the next 12-24 months?",
    dimension: "Technology",
    priority: 2,
    isActive: true
  }
];

async function seedAiConfig() {
  console.log("Starting FinanceCompass AI Configuration Seed...\n");

  try {
    console.log("Clearing existing AI configuration data...");
    await db.delete(fcAiFollowupTemplates);
    await db.delete(fcAiKnowledgeBase);
    await db.delete(fcAiGroundingRules);
    await db.delete(fcAiGuardrails);
    await db.delete(fcAiSystemPrompts);
    console.log("Existing data cleared.\n");

    console.log("Inserting System Prompts...");
    const insertedPrompts = await db.insert(fcAiSystemPrompts).values(systemPrompts).returning();
    console.log(`  Inserted ${insertedPrompts.length} system prompts`);

    console.log("Inserting Guardrails...");
    const insertedGuardrails = await db.insert(fcAiGuardrails).values(guardrails).returning();
    console.log(`  Inserted ${insertedGuardrails.length} guardrails`);

    console.log("Inserting Grounding Rules...");
    const insertedRules = await db.insert(fcAiGroundingRules).values(groundingRules).returning();
    console.log(`  Inserted ${insertedRules.length} grounding rules`);

    console.log("Inserting Knowledge Base Entries...");
    const insertedKnowledge = await db.insert(fcAiKnowledgeBase).values(knowledgeBase).returning();
    console.log(`  Inserted ${insertedKnowledge.length} knowledge base entries`);

    console.log("Inserting Follow-up Templates...");
    const insertedTemplates = await db.insert(fcAiFollowupTemplates).values(followupTemplates).returning();
    console.log(`  Inserted ${insertedTemplates.length} follow-up templates`);

    console.log("\n=== Seed Summary ===");
    console.log(`System Prompts: ${insertedPrompts.length}`);
    console.log(`Guardrails: ${insertedGuardrails.length}`);
    console.log(`Grounding Rules: ${insertedRules.length}`);
    console.log(`Knowledge Base: ${insertedKnowledge.length}`);
    console.log(`Follow-up Templates: ${insertedTemplates.length}`);
    console.log("\nAI Configuration seeding completed successfully!");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding AI configuration:", error);
    process.exit(1);
  }
}

seedAiConfig();
