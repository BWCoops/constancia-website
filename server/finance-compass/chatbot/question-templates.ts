/**
 * FinanceCompass Chatbot Question Templates
 * 
 * Implements Big 4 consulting-style structured responses with
 * Pyramid Principle and type-specific templates.
 */

// ============================================
// QUESTION TYPE TAXONOMY
// ============================================

export type QuestionType = 
  | 'SCORE_EXPLANATION'
  | 'BENCHMARKING'
  | 'ROADMAP'
  | 'VENDOR_TOOLING'
  | 'ROI_BUSINESS_CASE'
  | 'HOW_TO_PRACTICE'
  | 'META_CLARIFICATION'
  | 'GENERAL';

// Intent classification patterns
const INTENT_PATTERNS: Record<QuestionType, RegExp[]> = {
  SCORE_EXPLANATION: [
    /why\s+(?:is|did|was)\s+(?:our|my|the)\s+score/i,
    /what\s+does\s+(?:our|my|the|this)\s+score\s+mean/i,
    /explain\s+(?:our|my|the)\s+(?:score|rating|result)/i,
    /why\s+(?:are|is)\s+(?:we|our|my)\s+(?:at|rated|scored)/i,
    /interpret\s+(?:our|my|the)\s+(?:score|result)/i,
    /what\s+(?:does|do)\s+\d+(?:\.\d+)?\s*(?:out\s+of|\/)\s*\d+\s+mean/i,
    /understand\s+(?:our|my)\s+(?:assessment|score)/i,
    /assessment\s+(?:result|score|outcome)/i,
    /maturity\s+(?:score|level|rating)/i,
  ],
  BENCHMARKING: [
    /how\s+(?:do|does)\s+(?:we|our|my)\s+compare/i,
    /benchmark(?:ing|s)?/i,
    /peer\s+comparison/i,
    /industry\s+(?:average|benchmark|standard)/i,
    /what\s+(?:is|are)\s+(?:typical|normal|average)\s+(?:for|in)/i,
    /compared\s+to\s+(?:others|peers|similar)/i,
    /where\s+(?:do|does)\s+(?:we|our)\s+(?:sit|stand|rank)/i,
    /leader(?:s)?\s+(?:do|practice|achieve)/i,
    /percentile/i,
    /vs\s+(?:peers|industry|market)/i,
    /how\s+(?:do|does)\s+(?:we|I)\s+stack\s+up/i,
  ],
  ROADMAP: [
    /roadmap/i,
    /transformation\s+(?:plan|journey)/i,
    /how\s+long\s+(?:would|will|does)/i,
    /timeline/i,
    /phases?\s+(?:of|for)/i,
    /implementation\s+(?:plan|journey|timeline)/i,
    /what\s+(?:are|is)\s+the\s+(?:steps|phases)/i,
    /sequenc(?:e|ing)/i,
    /priorit(?:y|ies|ise)/i,
    /where\s+(?:do|should)\s+(?:we|I)\s+start/i,
    /what\s+(?:should|do)\s+(?:we|I)\s+do\s+first/i,
    /next\s+steps/i,
  ],
  VENDOR_TOOLING: [
    /which\s+(?:vendor|platform|tool|solution)/i,
    /vendor\s+(?:selection|comparison|evaluation)/i,
    /(?:OneStream|Anaplan|Oracle|SAP|Workday|Planful|Board|Vena)/i,
    /(?:EPM|ERP)\s+(?:platform|tool|solution|system)/i,
    /stack\s+(?:look|architecture)/i,
    /best\s+(?:tool|platform|solution)\s+for/i,
    /should\s+(?:we|I)\s+(?:use|choose|select|consider)/i,
    /recommend\s+(?:a|any)\s+(?:vendor|platform|tool)/i,
    /comparison\s+(?:of|between)\s+(?:vendor|platform|tool)/i,
    /suit(?:s|ed|able)\s+(?:for\s+)?(?:us|our|my)/i,
    /fit\s+(?:for|with)\s+(?:us|our|my)/i,
  ],
  ROI_BUSINESS_CASE: [
    /(?:what(?:'s|\s+is)\s+(?:the\s+)?)?ROI/i,
    /return\s+on\s+investment/i,
    /business\s+case/i,
    /justify\s+(?:this|the)\s+(?:investment|cost|spend)/i,
    /payback/i,
    /benefits?\s+(?:we|can)\s+expect/i,
    /cost\s+(?:savings|reduction|benefit)/i,
    /value\s+(?:from|of|realisation)/i,
    /investment\s+(?:return|value|worth)/i,
    /(?:how|what)\s+(?:do|can)\s+(?:we|I)\s+measure\s+(?:success|value)/i,
    /justify\s+to\s+(?:the\s+)?board/i,
    /financial\s+(?:impact|benefit|justification)/i,
  ],
  HOW_TO_PRACTICE: [
    /how\s+(?:should|do|can)\s+(?:we|I)\s+run/i,
    /best\s+practice(?:s)?(?:\s+for)?/i,
    /operating\s+model/i,
    /(?:what|how)\s+(?:is|should)\s+(?:the\s+)?process/i,
    /cadence/i,
    /governance/i,
    /how\s+(?:should|do)\s+(?:we|I)\s+(?:structure|organise|manage)/i,
    /what\s+(?:should|does)\s+(?:our|the)\s+(?:team|org)/i,
    /roles?\s+and\s+responsibilities/i,
    /RACI/i,
    /ownership/i,
    /how\s+(?:to|should\s+we)\s+(?:implement|execute|deliver)/i,
    /how\s+(?:do|should)\s+(?:we|I)\s+approach/i,
    /what\s+(?:is|are)\s+(?:the\s+)?(?:key|main)\s+(?:steps|activities)/i,
  ],
  META_CLARIFICATION: [
    /explain\s+(?:that|this)\s+(?:further|more|again)/i,
    /what\s+(?:do|did)\s+you\s+mean\s+by/i,
    /clarif(?:y|ication)\s+(?:on|about|that)/i,
    /can\s+you\s+(?:expand|elaborate)\s+on/i,
    /(?:I\s+)?don'?t\s+(?:understand|follow)/i,
    /say\s+(?:that|this)\s+(?:again|differently|another\s+way)/i,
    /more\s+(?:detail|information)\s+(?:on|about)\s+(?:that|this)/i,
    /what\s+(?:exactly\s+)?(?:do|did)\s+you\s+mean/i,
    /could\s+you\s+(?:rephrase|restate)/i,
  ],
  // GENERAL has no patterns - it's the fallback
  GENERAL: [],
};

/**
 * Classify a user question into a question type
 */
export function classifyQuestion(userMessage: string): QuestionType {
  // Check each pattern set in priority order
  const orderedTypes: QuestionType[] = [
    'SCORE_EXPLANATION',
    'ROI_BUSINESS_CASE',
    'VENDOR_TOOLING',
    'BENCHMARKING',
    'ROADMAP',
    'HOW_TO_PRACTICE',
    'META_CLARIFICATION',
  ];

  for (const type of orderedTypes) {
    const patterns = INTENT_PATTERNS[type];
    for (const pattern of patterns) {
      if (pattern.test(userMessage)) {
        return type;
      }
    }
  }

  // Secondary checks for EPM-related questions without clear type
  if (/EPM|ERP|finance\s+transformation|planning|consolidation|reporting/i.test(userMessage)) {
    return 'VENDOR_TOOLING';
  }

  // General "how" questions go to HOW_TO_PRACTICE
  if (/^how\s/i.test(userMessage)) {
    return 'HOW_TO_PRACTICE';
  }

  // Default fallback to GENERAL template for all other questions
  return 'GENERAL';
}

// ============================================
// TEMPLATE DEFINITIONS
// ============================================

export interface TemplateSection {
  header: string;
  description: string;
  required: boolean;
  maxBullets?: number;
  maxParagraphs?: number;
}

export interface QuestionTemplate {
  type: QuestionType;
  name: string;
  sections: TemplateSection[];
  structureInstructions: string;
}

const TEMPLATES: Record<QuestionType, QuestionTemplate> = {
  SCORE_EXPLANATION: {
    type: 'SCORE_EXPLANATION',
    name: 'Score Explanation / Diagnostic',
    sections: [
      { header: 'Headline Answer', description: '2-3 sentences: Overall interpretation of the score and one-sentence implication', required: true, maxParagraphs: 1 },
      { header: 'Where You Stand', description: '3-5 bullets: Overall score, percentile, strongest/weakest dimensions, 1-2 critical gaps', required: true, maxBullets: 5 },
      { header: 'Why You Are Here', description: '3-5 bullets: Link specific assessment answers to score using "Because you... therefore..." pattern', required: true, maxBullets: 5 },
      { header: 'What This Means in Practice', description: '3 bullets on risks or constraints if unchanged', required: true, maxBullets: 4 },
      { header: 'Priority Actions (Next 90 Days)', description: '3-5 concrete actions (quick wins + one structural move)', required: true, maxBullets: 5 },
      { header: 'Data & Sources', description: 'Analyst/benchmark references (if research used)', required: false, maxBullets: 6 },
    ],
    structureInstructions: `Structure your response using the SCR + Pyramid Principle:
- Lead with the direct answer (Situation-Complication-Resolution)
- Use the exact section headers provided
- Each section should have 3-5 bullets maximum
- Be specific to their assessment profile and industry`,
  },

  BENCHMARKING: {
    type: 'BENCHMARKING',
    name: 'Benchmarking / Peer Comparison',
    sections: [
      { header: 'Headline Answer', description: 'Direct statement: "You sit in the X-Yth percentile vs similar firms, with biggest gaps in A and B"', required: true, maxParagraphs: 1 },
      { header: 'Peer Position Summary', description: 'Table or bullets: Dimension → Your score vs Peer median vs Leaders. Use clear up/down indicators', required: true, maxBullets: 6 },
      { header: 'Key Gaps vs Leaders', description: '3-5 bullets: Where leaders differ in process, data, org, or tech', required: true, maxBullets: 5 },
      { header: 'What Leaders Do Differently', description: '3-5 bullets anchored in practices, not tools (cadence, ownership, integration)', required: true, maxBullets: 5 },
      { header: 'Recommended Focus Areas', description: '3-5 bullets, each "Theme → Expected impact → Time horizon"', required: true, maxBullets: 5 },
      { header: 'Benchmarks & Sources', description: 'Analyst and industry studies only; vendor claims clearly labelled', required: false, maxBullets: 6 },
    ],
    structureInstructions: `Provide objective peer comparison:
- Use the exact section headers provided
- Include quantified comparisons where possible
- Reference industry benchmarks and analyst data
- Focus on actionable gaps, not comprehensive lists`,
  },

  ROADMAP: {
    type: 'ROADMAP',
    name: 'Roadmap / Transformation Plan',
    sections: [
      { header: 'Headline Answer', description: 'Format: "For an organisation like yours, a pragmatic roadmap is X phases over Y-Z months, with focus on A, B, C"', required: true, maxParagraphs: 1 },
      { header: 'Target State Definition', description: '3-5 bullets describing "what good looks like" in their context', required: true, maxBullets: 5 },
      { header: 'Phased Roadmap', description: 'Phase 1-3/4: For each phase include Objective, Key workstreams, Typical duration, Dependencies', required: true },
      { header: 'Enablers and Risks', description: '3-5 bullets on success factors and common failure modes', required: true, maxBullets: 5 },
      { header: 'Recommended Next 4-6 Weeks', description: '3-5 actions (diagnostics, pilots, governance steps)', required: true, maxBullets: 5 },
      { header: 'Data & Sources', description: 'Implementation benchmarks, success stories, analyst playbooks', required: false, maxBullets: 6 },
    ],
    structureInstructions: `Follow Big 4 transformation planning style:
- Use the exact section headers provided
- Be specific about durations based on their size/complexity
- Include dependencies and risks
- Focus on pragmatic, achievable phases`,
  },

  VENDOR_TOOLING: {
    type: 'VENDOR_TOOLING',
    name: 'Vendor / Architecture / Tooling',
    sections: [
      { header: 'Headline Answer', description: 'Clear position: "Given your profile, you fit best with X/Y archetype; shortlist A and B, consider C if [condition]"', required: true, maxParagraphs: 1 },
      { header: 'Solution Archetype for Your Profile', description: '3-4 bullets: Central design choices (single EPM vs best-of-breed, cloud model, integration pattern)', required: true, maxBullets: 4 },
      { header: 'Vendor Comparison', description: 'Table or structured comparison: Vendors/options vs Fit-for-you, Capability coverage, Complexity, Typical cost band, Implementation effort', required: true },
      { header: 'When Each Option Makes Sense', description: '3-5 bullets: "Choose X if...", "Choose Y if..."', required: true, maxBullets: 5 },
      { header: 'Decision Criteria & Next Steps', description: '3-5 bullets defining evaluation criteria + suggested RFP/PoC path. Always mention Constancia Comparison Tools', required: true, maxBullets: 5 },
      { header: 'Data & Sources', description: 'Split: Analyst reports vs vendor documentation vs case examples', required: false, maxBullets: 8 },
    ],
    structureInstructions: `Provide objective vendor guidance:
- Use the exact section headers provided
- Always mention Constancia's EPM/ERP Comparison Tools as a resource
- Be balanced across vendors—highlight fit-for-purpose
- Include practical decision criteria`,
  },

  ROI_BUSINESS_CASE: {
    type: 'ROI_BUSINESS_CASE',
    name: 'ROI / Business Case',
    sections: [
      { header: 'Headline Answer', description: 'Format: "Typical ROI range for organisations like yours is X-Y over Z years, driven mainly by A, B, C"', required: true, maxParagraphs: 1 },
      { header: 'Value Levers for Your Situation', description: '3-5 bullets: Efficiency, error reduction, cycle time, scenario capability, control', required: true, maxBullets: 5 },
      { header: 'Indicative Impact Ranges', description: 'Table: Lever → Metric today → Typical improvement → Value range', required: true },
      { header: 'Investment & Payback Pattern', description: '3-4 bullets on cost components and payback timing', required: true, maxBullets: 4 },
      { header: 'Assumptions & Sensitivities', description: '3-5 bullets making the model intellectually honest (adoption, scope, data, change risk)', required: true, maxBullets: 5 },
      { header: 'How to Turn This Into a Board Case', description: '3-5 bullets on slides/sections they should build', required: true, maxBullets: 5 },
      { header: 'Data & Sources', description: 'Include explicit "indicative only" disclaimer; benchmark sources', required: false, maxBullets: 6 },
    ],
    structureInstructions: `Build a credible business case:
- Use the exact section headers provided
- Be honest about assumptions and ranges
- Include clear disclaimer that projections are indicative
- Focus on value levers relevant to their profile`,
  },

  HOW_TO_PRACTICE: {
    type: 'HOW_TO_PRACTICE',
    name: 'How-To / Practice / Operating Model',
    sections: [
      { header: 'Headline Answer', description: 'Format: "For your maturity and size, a pragmatic way to run X is a Y-step cycle with clear ownership and SLAs"', required: true, maxParagraphs: 1 },
      { header: 'Design Principles', description: '3-5 bullets (MECE): Governance, cadence, roles, data, tooling', required: true, maxBullets: 5 },
      { header: 'Operating Model / Process Steps', description: 'Numbered list of 5-9 steps with one sentence each', required: true, maxBullets: 9 },
      { header: 'Ownership Summary', description: 'Bullets: Who leads what, where Finance vs Business vs IT sit', required: true, maxBullets: 5 },
      { header: 'Quick Wins vs Structural Changes', description: '3 bullets for quick wins, 3 for structural changes', required: true, maxBullets: 6 },
      { header: 'Data & Sources', description: 'Best practice references if research used', required: false, maxBullets: 4 },
    ],
    structureInstructions: `Provide actionable operating guidance:
- Use the exact section headers provided
- Apply MECE principle (Mutually Exclusive, Collectively Exhaustive)
- Be specific about roles and ownership
- Balance quick wins with structural improvements`,
  },

  META_CLARIFICATION: {
    type: 'META_CLARIFICATION',
    name: 'Meta / Clarification / Follow-ups',
    sections: [
      { header: 'Restated Answer', description: '2-3 sentences in simpler terms', required: true, maxParagraphs: 1 },
      { header: 'Detailed Explanation', description: '3-5 bullets, max one new concept', required: true, maxBullets: 5 },
      { header: 'Examples for Your Context', description: '2-3 bullets, each grounded in their industry/scale', required: true, maxBullets: 3 },
      { header: 'Suggested Follow-up Questions', description: '3-4 prompts (benchmark, roadmap, ROI, vendor)', required: true, maxBullets: 4 },
    ],
    structureInstructions: `Clarify and guide:
- Use the exact section headers provided
- Be concise and accessible
- Relate to their specific context
- Suggest logical next questions`,
  },

  GENERAL: {
    type: 'GENERAL',
    name: 'General EPM Advisory',
    sections: [
      { header: 'Headline Answer', description: '2-3 sentences directly answering the question with key insight', required: true, maxParagraphs: 1 },
      { header: 'What This Means for You', description: '3-5 bullets explaining implications for their specific situation', required: true, maxBullets: 5 },
      { header: 'Key Considerations', description: '3-5 bullets on important factors, drivers, or trade-offs', required: true, maxBullets: 5 },
      { header: 'Recommended Actions', description: '3-5 concrete, actionable next steps', required: true, maxBullets: 5 },
      { header: 'Data & Sources', description: 'References if research was used (analyst reports, benchmarks)', required: false, maxBullets: 6 },
    ],
    structureInstructions: `Provide structured advisory response:
- Use the exact section headers provided
- Lead with the direct answer (Pyramid Principle)
- Be specific to their assessment profile and industry
- Include actionable recommendations
- Reference their scores and context where relevant`,
  },
};

/**
 * Get the template for a question type
 */
export function getTemplate(type: QuestionType): QuestionTemplate {
  return TEMPLATES[type];
}

/**
 * Generate template instructions for the AI model
 */
export function generateTemplateInstructions(type: QuestionType): string {
  const template = TEMPLATES[type];
  
  // Build example structure
  let exampleStructure = '';
  for (const section of template.sections) {
    if (section.required) {
      exampleStructure += `\n## ${section.header}\n[Your content here - ${section.description}]\n`;
    }
  }
  
  let instructions = `## MANDATORY RESPONSE STRUCTURE

**CRITICAL**: You MUST structure your ENTIRE response using EXACTLY this format for "${template.name}" questions.
Do NOT deviate from this structure. Do NOT add your own sections. Do NOT skip required sections.

**YOUR RESPONSE MUST LOOK EXACTLY LIKE THIS:**
${exampleStructure}

### Section Details:
`;

  for (const section of template.sections) {
    const requirement = section.required ? 'REQUIRED - Must include' : 'OPTIONAL - Include if relevant';
    instructions += `
**${section.header}** (${requirement})
- Content: ${section.description}`;
    if (section.maxBullets) {
      instructions += `
- Format: Use bullet points (maximum ${section.maxBullets})`;
    }
    if (section.maxParagraphs) {
      instructions += `
- Format: Maximum ${section.maxParagraphs} paragraph(s)`;
    }
  }

  instructions += `

### Structure Rules:
${template.structureInstructions}

### STRICT Formatting Requirements:
1. **Start with ## ${template.sections[0]?.header || 'Headline Answer'}** - Your first line must be this section header
2. **Use ## for ALL section headers** - Every section must start with ## followed by the exact header name
3. **Lead with the direct answer** - First sentence after headline header must answer their question
4. **No preamble** - Do NOT start with "Great question" or "Let me explain" or any introduction
5. **Bullet points for lists** - Use - for bullets, not numbers (unless showing sequence)
6. **Bold key terms** - Vendor names, dimensions, scores, key concepts must be **bold**
7. **British English** - organisation, optimise, analyse, programme
8. **Max 5 bullets per section** - Be concise, not comprehensive
9. **Consulting language** - "For your profile...", "In organisations similar to yours...", "Typical ranges are..."
10. **NEVER use em dashes** - Do NOT use — anywhere. Use commas, colons, or regular hyphens instead.

**EXAMPLE OF CORRECT FORMAT:**
## ${template.sections[0]?.header || 'Headline Answer'}
Your direct answer goes here in 2-3 sentences.

## ${template.sections[1]?.header || 'Key Analysis'}
- **First point**: Brief explanation
- **Second point**: Brief explanation
- **Third point**: Brief explanation`;

  return instructions;
}

/**
 * Validate that a response follows the template structure
 */
export function validateResponseStructure(response: string, type: QuestionType): {
  valid: boolean;
  missingHeaders: string[];
  warnings: string[];
} {
  const template = TEMPLATES[type];
  const requiredHeaders = template.sections
    .filter(s => s.required)
    .map(s => s.header.toLowerCase());
  
  const responseHeaders = response.toLowerCase();
  const missingHeaders: string[] = [];
  const warnings: string[] = [];
  
  for (const header of requiredHeaders) {
    // Check for header with ## or ### prefix
    if (typeof header !== 'string' || header.length > 200) continue;
    const sanitisedHeader = header.slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const headerPattern = new RegExp(`#+\\s*${sanitisedHeader}`, 'i');
    if (!headerPattern.test(responseHeaders) && !responseHeaders.includes(header)) {
      missingHeaders.push(header);
    }
  }
  
  // Check for unstructured prose (walls of text)
  const paragraphs = response.split(/\n\n+/);
  for (const para of paragraphs) {
    if (para.length > 500 && !para.includes('|') && !para.includes('-')) {
      warnings.push('Long prose section detected - consider breaking into bullets');
    }
  }
  
  // Check for proper markdown usage
  if (!response.includes('**')) {
    warnings.push('No bold text detected - key terms should be emphasised');
  }
  
  return {
    valid: missingHeaders.length === 0,
    missingHeaders,
    warnings,
  };
}

/**
 * Get suggested follow-up questions based on question type
 */
export function getSuggestedFollowUps(type: QuestionType): string[] {
  const followUps: Record<QuestionType, string[]> = {
    SCORE_EXPLANATION: [
      'How do we compare to industry peers?',
      'What should our roadmap look like to improve?',
      'Which vendors would suit our profile?',
    ],
    BENCHMARKING: [
      'What roadmap would help us reach leader status?',
      'What ROI could we expect from closing these gaps?',
      'Which vendors support these best practices?',
    ],
    ROADMAP: [
      'What ROI can we expect from this transformation?',
      'Which vendors would support this roadmap?',
      'How should we structure the project team?',
    ],
    VENDOR_TOOLING: [
      'What does a typical implementation timeline look like?',
      'What ROI can we expect?',
      'How should we structure the evaluation process?',
    ],
    ROI_BUSINESS_CASE: [
      'What roadmap would deliver this ROI?',
      'Which vendors offer the best value for our profile?',
      'What are the key success factors?',
    ],
    HOW_TO_PRACTICE: [
      'How do we compare to peers in this area?',
      'What tools support this operating model?',
      'What quick wins should we prioritise?',
    ],
    META_CLARIFICATION: [
      'How does this apply to our specific situation?',
      'What should be our next steps?',
      'Can you provide more examples?',
    ],
    GENERAL: [
      'How do we compare to industry peers?',
      'What would a transformation roadmap look like?',
      'Which vendors would suit our profile?',
      'What ROI can we expect?',
    ],
  };
  
  return followUps[type];
}
