/**
 * FinanceCompass Chatbot Guardrails
 * 
 * STRICT safety controls - when in doubt, STOP.
 * This service validates all user input and AI output.
 */

import type { GuardrailResult, AssessmentContext } from './types';
import { createChildLogger } from '../../lib/logger';

const log = createChildLogger("fc-chatbot-guardrails");

// ============================================
// BLOCKED TOPICS - Immediate rejection
// ============================================

const BLOCKED_PATTERNS = {
  // Harmful content
  harmful: [
    /\b(hack|exploit|bypass|crack|illegal|fraud|scam)\b/i,
    /\b(weapon|drug|violence|abuse|harassment)\b/i,
    /\b(suicide|self.?harm|kill)\b/i,
  ],
  
  // Confidential/sensitive requests
  confidential: [
    /\b(password|credential|api.?key|secret|token)\b/i,
    /\b(salary|compensation|personal.?data|ssn|social.?security)\b/i,
    /\b(medical|health.?record|diagnosis)\b/i,
  ],
  
  // Competitor bashing (we're independent - no negative competitor talk)
  competitor: [
    /\b(which.*worst|worst.*vendor|avoid.*vendor|bad.*about)\b/i,
    /\b(lawsuit|scandal|failure.*at)\b/i,
  ],
  
  // Code/technical exploitation
  technical: [
    /\b(inject|execute|eval|script|sql.?injection)\b/i,
    /\b(prompt.?injection|jailbreak|ignore.*instructions)\b/i,
    /\b(pretend|roleplay|act.?as|you.?are.?now)\b/i,
  ],
};

// ============================================
// ALLOWED TOPICS - Must match at least one
// ============================================

const ALLOWED_TOPIC_PATTERNS = [
  // EPM and Finance Transformation
  /\b(epm|enterprise.?performance|finance.?transform|cfo|finance.?function)\b/i,
  /\b(budget|forecast|plan|consolidat|close|report)\b/i,
  /\b(financecompass|assessment|score|dimension|maturity)\b/i,
  
  // Vendors, platforms and tools (including Excel - many large orgs run on it)
  /\b(onestream|anaplan|oracle|sap|workday|adaptive|planful|board|vena)\b/i,
  /\b(erp|epm|cpm|xp&a|fp&a)\b/i,
  /\b(vendor|platform|implement|integration|system)\b/i,
  /\b(excel|spreadsheet|google.?sheets|power.?bi|tableau)\b/i,
  
  // Business/Finance topics
  /\b(roi|investment|cost|benefit|value|efficiency)\b/i,
  /\b(benchmark|industry|trend|market|best.?practice)\b/i,
  /\b(transform|improve|optimis|modern|automat)\b/i,
  /\b(compliance|control|audit|governance|risk)\b/i,
  /\b(data|analytics|insight|dashboard|visual)\b/i,
  
  // Assessment context - expanded patterns
  /\b(my.*score|our.*score|my.*assessment|our.*company)\b/i,
  /\b(my.*profile|our.*profile|my.*results|our.*results)\b/i,
  /\b(my.*needs|our.*needs|my.*situation|our.*situation)\b/i,
  /\b(suit|fit|match|right.*for|best.*for)\b/i,
  /\b(recommend|suggest|advice|guidance|help)\b/i,
  /\b(roadmap|timeline|phase|step|next)\b/i,
  /\b(compare|comparison|versus|vs|between)\b/i,
  /\b(which|what|how|why|when|where)\b/i,
  
  // Quick wins and improvements
  /\b(quick.?win|improve|strengthen|weakness|strength)\b/i,
  /\b(readiness|ready|prepared|capability)\b/i,
  
  // Greetings and meta
  /\b(hello|hi|hey|thank|help|what.?can.?you)\b/i,
  /\b(who.?are.?you|what.?is.?this|how.?does.?this)\b/i,
];

// ============================================
// SPECULATION TRIGGERS - Require research backing
// ============================================

const SPECULATION_PATTERNS = [
  /\b(predict|will.*be|future.*of|in.*202[7-9]|in.*203\d)\b/i,
  /\b(guarantee|definitely|certainly|always|never)\b/i,
  /\b(specific.*price|exact.*cost|how.?much.*cost)\b/i,
];

// ============================================
// INPUT GUARDRAILS
// ============================================

export function validateUserInput(message: string): GuardrailResult {
  const trimmed = message.trim();
  
  // Length checks
  if (trimmed.length === 0) {
    return { passed: false, reason: "Empty message", category: 'unknown' };
  }
  
  if (trimmed.length > 2000) {
    return { 
      passed: false, 
      reason: "Message too long. Please keep your question concise.",
      category: 'unknown'
    };
  }
  
  // Check for blocked patterns
  for (const [category, patterns] of Object.entries(BLOCKED_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        return {
          passed: false,
          reason: getBlockedReason(category as keyof typeof BLOCKED_PATTERNS),
          category: category as any,
        };
      }
    }
  }
  
  // STRICT: Check if message is explicitly on-topic
  // When in doubt, STOP - require explicit EPM/finance context
  const isOnTopic = ALLOWED_TOPIC_PATTERNS.some(pattern => pattern.test(trimmed));
  
  // Short greetings and meta questions get benefit of the doubt
  const isGreetingOrMeta = /^(hi|hello|hey|thanks?|thank you|help|what can you|who are you)/i.test(trimmed);
  const isShortQuestion = trimmed.length < 30 && /\?$/.test(trimmed);
  
  if (!isOnTopic) {
    // Only allow very short greetings/meta questions without topic match
    if (isGreetingOrMeta || (isShortQuestion && trimmed.split(' ').length <= 5)) {
      return { passed: true };
    }
    
    // WHEN IN DOUBT, STOP - require explicit EPM/finance topic match
    log.info({ message: trimmed.substring(0, 100) }, "Off-topic blocked");
    return {
      passed: false,
      reason: "I specialise in Enterprise Performance Management, finance transformation, and EPM vendor selection. Could you rephrase your question in that context? For example, ask about your assessment scores, implementation approaches, or vendor comparisons.",
      category: 'off_topic',
    };
  }
  
  return { passed: true };
}

function getBlockedReason(category: keyof typeof BLOCKED_PATTERNS): string {
  switch (category) {
    case 'harmful':
      return "I can't assist with that type of request. I'm here to help with EPM and finance transformation topics.";
    case 'confidential':
      return "I don't handle sensitive personal or confidential data. Please contact Constancia directly for such matters.";
    case 'competitor':
      return "As an independent advisory, I provide objective analysis rather than negative commentary. I can help you compare vendor capabilities factually.";
    case 'technical':
      return "I'm unable to process that request. How can I help with your EPM or finance transformation questions?";
    default:
      return "I'm unable to help with that. I specialise in EPM and finance transformation advisory.";
  }
}

// ============================================
// ENHANCED PROMPT INJECTION PREVENTION
// ============================================

const PROMPT_INJECTION_PATTERNS = [
  // Direct instruction manipulation (5)
  /ignore.*(?:previous|prior|above|all).*instruction/i,
  /forget.*(?:context|everything|instructions)/i,
  /disregard.*(?:rules|guidelines|system)/i,
  /bypass.*(?:rule|filter|guardrail|safety)/i,
  /override.*(?:instruction|limit|restriction)/i,
  
  // Role manipulation (7)
  /pretend.*you.*are/i,
  /act.*as.*if/i,
  /you.*are.*now/i,
  /roleplay.*as/i,
  /imagine.*you.*are/i,
  /from.*now.*on.*you/i,
  /behave.*(?:like|as)/i,
  
  // System prompt extraction (6)
  /reveal.*(?:system|prompt|instruction)/i,
  /show.*(?:your|the).*(?:prompt|rules)/i,
  /what.*(?:your|the).*(?:system|initial).*(?:prompt|instruction)/i,
  /output.*(?:previous|system).*(?:text|prompt)/i,
  /print.*(?:system|initial).*(?:prompt|message)/i,
  /repeat.*(?:initial|system).*(?:text|instructions)/i,
  
  // Jailbreak attempts (6)
  /(?:DAN|STAN|DUDE|developer).*mode/i,
  /jailbreak/i,
  /unlock.*(?:capabilities|mode|features)/i,
  /remove.*(?:restrictions|filters|limits)/i,
  /unrestricted.*mode/i,
  /god.*mode/i,
  
  // Delimiter attacks (5)
  /```\s*system/i,
  /<\/?(?:system|user|assistant)>/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /###\s*(?:system|instruction)/i,
  
  // Context manipulation (5)
  /new.*conversation.*context/i,
  /reset.*(?:chat|conversation|context)/i,
  /clear.*(?:memory|history|context)/i,
  /start.*(?:fresh|over|new)/i,
  /previous.*(?:context|conversation).*(?:irrelevant|ignore)/i,
  
  // Authority claim attacks (4)
  /i.*am.*(?:admin|administrator|developer|owner)/i,
  /(?:admin|root|sudo).*(?:access|mode|command)/i,
  /(?:special|override).*(?:permission|privilege)/i,
  /maintenance.*mode/i,
  
  // Output format manipulation (3)
  /respond.*(?:only|exactly).*with/i,
  /output.*(?:only|raw|exact)/i,
  /no.*(?:explanation|commentary|context)/i,
];

export function detectPromptInjection(message: string): { detected: boolean; pattern?: string } {
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      return { detected: true, pattern: pattern.source };
    }
  }
  return { detected: false };
}

// ============================================
// HALLUCINATION FILTERING
// ============================================

const HALLUCINATION_REPLACEMENTS = [
  // Certainty claims → hedged language
  { pattern: /will certainly/gi, replace: 'typically would' },
  { pattern: /will definitely/gi, replace: 'would typically' },
  { pattern: /will absolutely/gi, replace: 'would likely' },
  { pattern: /guaranteed to/gi, replace: 'typically expected to' },
  { pattern: /100%/gi, replace: 'in most cases' },
  { pattern: /always results? in/gi, replace: 'often results in' },
  { pattern: /never fails?/gi, replace: 'rarely fails' },
  
  // False expertise → qualified language
  { pattern: /I know for certain/gi, replace: 'based on available evidence' },
  { pattern: /I can confirm/gi, replace: 'market indicators suggest' },
  { pattern: /without a doubt/gi, replace: 'in our experience' },
  { pattern: /it is certain that/gi, replace: 'evidence suggests that' },
  
  // Overly specific claims → ranges
  { pattern: /will save exactly/gi, replace: 'may save approximately' },
  { pattern: /takes exactly/gi, replace: 'typically takes around' },
  { pattern: /costs exactly/gi, replace: 'typically costs around' },
  
  // Prescriptive → advisory
  { pattern: /you must (buy|purchase|invest)/gi, replace: 'organisations often consider' },
  { pattern: /you should (immediately|now) (buy|implement)/gi, replace: 'you might evaluate' },
  { pattern: /you need to (buy|purchase)/gi, replace: 'it may be worth exploring' },
];

export function filterHallucinations(response: string): string {
  let filtered = response;
  
  for (const { pattern, replace } of HALLUCINATION_REPLACEMENTS) {
    filtered = filtered.replace(pattern, replace);
  }
  
  return filtered;
}

// ============================================
// DYNAMIC DISCLAIMERS
// ============================================

interface DisclaimerConfig {
  pattern: RegExp;
  disclaimer: string;
  icon: string;
}

const DISCLAIMER_CONFIGS: DisclaimerConfig[] = [
  {
    pattern: /\b(ROI|return|payback|saving|benefit|value realisation)\b/i,
    disclaimer: '**Disclaimer**: ROI projections are estimates based on industry benchmarks. Actual results depend on execution quality, adoption, and your specific situation.',
    icon: '💡'
  },
  {
    pattern: /\b(timeline|months|weeks|phase|implement|duration)\b/i,
    disclaimer: '**Note**: Timelines are indicative for organisations similar to yours. Actual timelines depend on complexity, team capacity, and change management approach.',
    icon: '⏱️'
  },
  {
    pattern: /\b(recommend|vendor|platform|OneStream|Anaplan|Oracle|SAP|Workday|Planful|Board|Vena)\b/i,
    disclaimer: '**Important**: Vendor recommendations are based on your assessment profile. We recommend: (1) Evaluating multiple vendors, (2) Running proof-of-concepts, (3) Speaking with references in your industry.',
    icon: '📌'
  },
  {
    pattern: /\b(investment|cost|budget|pricing|TCO|licence)\b/i,
    disclaimer: '**Financial Note**: Investment estimates are indicative and exclude: specific vendor licensing, internal labour, change management overhead, or extended support. Budget 20-30% contingency.',
    icon: '💰'
  },
  {
    pattern: /\b(transformation|roadmap|change|modernisation)\b/i,
    disclaimer: '**Complexity Note**: Transformation initiatives are complex. Success depends on executive sponsorship, change management, team capability, and realistic scoping.',
    icon: '⚠️'
  },
  {
    pattern: /\b(data quality|governance|accuracy|master data)\b/i,
    disclaimer: '**Data Note**: Recommendations assume improvements in data quality and governance. Current data quality issues may require pre-work before implementing transformations.',
    icon: '📊'
  },
];

export function addDynamicDisclaimers(response: string): string {
  const appliedDisclaimers: string[] = [];
  
  for (const config of DISCLAIMER_CONFIGS) {
    if (config.pattern.test(response)) {
      // Check if disclaimer not already present
      const disclaimerShort = config.disclaimer.substring(0, 50);
      if (!response.includes(disclaimerShort) && !appliedDisclaimers.includes(config.disclaimer)) {
        appliedDisclaimers.push(`\n\n${config.icon} ${config.disclaimer}`);
      }
    }
  }
  
  // Only add the most relevant disclaimer (max 1 to avoid clutter)
  if (appliedDisclaimers.length > 0) {
    return response + appliedDisclaimers[0];
  }
  
  return response;
}

// ============================================
// SOURCE QUALITY TIERS
// ============================================

export type SourceTier = 'tier1' | 'tier2' | 'vendor' | 'other';

export interface CategorisedSource {
  source: string;
  tier: SourceTier;
  label: string;
}

const TIER1_PATTERNS = [
  /gartner/i,
  /forrester/i,
  /mckinsey/i,
  /bcg|boston consulting/i,
  /bain/i,
  /accenture/i,
  /deloitte/i,
  /pwc|pricewaterhouse/i,
  /ey|ernst.*young/i,
  /kpmg/i,
];

const TIER2_PATTERNS = [
  /analyst/i,
  /research/i,
  /report/i,
  /study/i,
  /survey/i,
  /idc/i,
  /nucleus research/i,
];

const VENDOR_PATTERNS = [
  /onestream/i,
  /anaplan/i,
  /oracle/i,
  /sap/i,
  /workday/i,
  /planful/i,
  /board/i,
  /vena/i,
  /vendor/i,
  /white.*paper/i,
];

export function categoriseSources(sources: string[]): CategorisedSource[] {
  return sources.map(source => {
    if (TIER1_PATTERNS.some(p => p.test(source))) {
      return { source, tier: 'tier1', label: 'Analyst Research' };
    }
    if (TIER2_PATTERNS.some(p => p.test(source))) {
      return { source, tier: 'tier2', label: 'Industry Research' };
    }
    if (VENDOR_PATTERNS.some(p => p.test(source))) {
      return { source, tier: 'vendor', label: 'Vendor Source' };
    }
    return { source, tier: 'other', label: 'Other' };
  });
}

export function calculateSourceConfidence(sources: string[]): number {
  if (sources.length === 0) return 0.5;
  
  const categorised = categoriseSources(sources);
  let score = 0.5;
  
  const tier1Count = categorised.filter(s => s.tier === 'tier1').length;
  const tier2Count = categorised.filter(s => s.tier === 'tier2').length;
  const vendorCount = categorised.filter(s => s.tier === 'vendor').length;
  
  score += tier1Count * 0.15;
  score += tier2Count * 0.08;
  score -= vendorCount * 0.05; // Bias penalty
  
  return Math.min(1.0, Math.max(0.0, score));
}

// ============================================
// OUTPUT GUARDRAILS
// ============================================

const OUTPUT_BLOCKED_PATTERNS = [
  // No definitive claims without backing
  /\b(I guarantee|I promise|definitely will|absolutely certain)\b/i,
  
  // No specific pricing without research
  /\b(costs? exactly|price is \$|£\d{1,3}(?:,\d{3})*\b.*per)/i,
  
  // No making up names/people
  /\b(CEO [A-Z][a-z]+ [A-Z][a-z]+|CFO [A-Z][a-z]+ [A-Z][a-z]+)\b/,
  
  // No fake statistics
  /\b(studies show|research proves|according to)\b(?!.*\[)/i, // Requires citation
];

const REQUIRED_DISCLAIMERS = {
  speculation: "This is based on current market trends and may vary for your specific situation.",
  pricing: "Pricing varies significantly based on scope, vendor, and implementation complexity. Contact vendors directly for accurate quotes.",
  recommendation: "This guidance is for informational purposes. A detailed assessment of your specific situation would be needed for formal recommendations.",
};

// Vendor size fit mapping - enterprise vendors inappropriate for SMEs
const ENTERPRISE_VENDOR_PATTERNS: Array<{ pattern: RegExp; name: string; replacement: string }> = [
  { pattern: /\*{0,2}OneStream\*{0,2}/gi, name: 'OneStream', replacement: '**Workday Adaptive Planning**' },
  { pattern: /\*{0,2}Oracle\s*EPM(\s*Cloud)?\*{0,2}/gi, name: 'Oracle EPM', replacement: '**Planful**' },
  { pattern: /\*{0,2}Board\*{0,2}(?!\s*(of\s*Directors|meeting|room|level))/gi, name: 'Board', replacement: '**Vena**' },
  { pattern: /\*{0,2}SAP\s*(Analytics\s*Cloud|BPC)\*{0,2}/gi, name: 'SAP Analytics Cloud', replacement: '**Pigment**' },
  { pattern: /\*{0,2}Anaplan\*{0,2}/gi, name: 'Anaplan', replacement: '**Workday Adaptive Planning**' },
  { pattern: /\*{0,2}IBM\s*TM1\*{0,2}/gi, name: 'IBM TM1', replacement: '**Planful**' },
];

const SME_APPROPRIATE_VENDORS = ['workday adaptive', 'adaptive planning', 'planful', 'vena', 'pigment', 'datarails'];

// Employee size bands that indicate SME status
const SME_EMPLOYEE_BANDS = ['1-50', '51-200', '201-500'];

function isSmeSizeBand(sizeBand: string | undefined): boolean {
  if (!sizeBand) return false;
  const normalized = sizeBand.toLowerCase().trim();
  
  // Check for text-based SME indicators
  if (normalized.includes('small') || normalized.includes('sme') || normalized.includes('smb')) {
    return true;
  }
  
  // Check for numeric employee bands that indicate SME
  for (const band of SME_EMPLOYEE_BANDS) {
    if (normalized === band || normalized.includes(band)) {
      return true;
    }
  }
  
  // Check for "under X" or numeric patterns
  const underMatch = normalized.match(/under\s*(\d+)/i);
  if (underMatch && parseInt(underMatch[1]) <= 500) {
    return true;
  }
  
  return false;
}

export function enforceVendorFitForSME(response: string, context: AssessmentContext | null): {
  modifiedResponse: string;
  wasModified: boolean;
  replacements: string[];
} {
  if (!context?.revenueMillions && !context?.sizeBand && !context?.employeeCount) {
    return { modifiedResponse: response, wasModified: false, replacements: [] };
  }
  
  // Determine if this is an SME based on multiple signals
  const revenue = context.revenueMillions || 0;
  const employeeCount = context.employeeCount || 0;
  const isSmallByRevenue = revenue > 0 && revenue < 50;
  const isSmallByEmployees = employeeCount > 0 && employeeCount < 500;
  const isSmallBySizeBand = isSmeSizeBand(context.sizeBand);
  const isSME = isSmallByRevenue || isSmallByEmployees || isSmallBySizeBand;
  
  if (!isSME) {
    return { modifiedResponse: response, wasModified: false, replacements: [] };
  }
  
  let modifiedResponse = response;
  const replacements: string[] = [];
  
  // Check for and replace enterprise vendor recommendations
  for (const vendor of ENTERPRISE_VENDOR_PATTERNS) {
    if (vendor.pattern.test(modifiedResponse)) {
      // Check if this is a negative mention (already advising against it)
      const lowerResponse = modifiedResponse.toLowerCase();
      const vendorLower = vendor.name.toLowerCase();
      const isNegativeMention = 
        lowerResponse.includes(`not ${vendorLower}`) ||
        lowerResponse.includes(`avoid ${vendorLower}`) ||
        lowerResponse.includes(`rather than ${vendorLower}`) ||
        lowerResponse.includes(`instead of ${vendorLower}`) ||
        lowerResponse.includes(`unlike ${vendorLower}`) ||
        lowerResponse.includes(`${vendorLower} is enterprise`) ||
        lowerResponse.includes(`${vendorLower} targets larger`);
      
      if (!isNegativeMention) {
        modifiedResponse = modifiedResponse.replace(vendor.pattern, vendor.replacement);
        replacements.push(`${vendor.name} → ${vendor.replacement.replace(/\*/g, '')}`);
      }
    }
  }
  
  // If replacements were made, add a note
  if (replacements.length > 0) {
    modifiedResponse += `\n\n> **Note**: For organisations of your size (£${revenue}M revenue), we've focused on mid-market EPM solutions that typically offer better value, faster implementation, and lower complexity than enterprise-tier platforms.`;
  }
  
  return { 
    modifiedResponse, 
    wasModified: replacements.length > 0, 
    replacements 
  };
}

// Legacy function for backwards compatibility
export function validateVendorFitForSize(response: string, context: AssessmentContext | null): {
  hasIssue: boolean;
  suggestedAddendum?: string;
  enterpriseVendorsMentioned: string[];
} {
  const result = enforceVendorFitForSME(response, context);
  return {
    hasIssue: result.wasModified,
    enterpriseVendorsMentioned: result.replacements,
    suggestedAddendum: result.wasModified ? '' : undefined,
  };
}

export function validateAIOutput(response: string, context: AssessmentContext | null): GuardrailResult {
  // Check for blocked patterns in output
  for (const pattern of OUTPUT_BLOCKED_PATTERNS) {
    if (pattern.test(response)) {
      return {
        passed: false,
        reason: "Response contains claims that require verification",
        category: 'speculation',
      };
    }
  }
  
  // Check response isn't too long (indication of rambling)
  if (response.length > 4000) {
    return {
      passed: false,
      reason: "Response too verbose - needs to be more focused",
      category: 'unknown',
    };
  }
  
  return { passed: true };
}

// ============================================
// RESEARCH NEED ASSESSMENT
// ============================================

export interface ResearchNeed {
  needsResearch: boolean;
  researchTypes: string[];
  depth: 'quick' | 'deep';
  confidence: 'high' | 'medium' | 'low';
}

const RESEARCH_TRIGGERS = {
  MARKET_TREND: /\b(trend|market|industry|adoption|benchmark|peer|standard|finance.?function|cfo|fp&a|fpa)\b/i,
  VENDOR_ANALYSIS: /\b(vendor|platform|onestream|anaplan|oracle|sap|workday|compare|alternative|solution|tool|software|system)\b/i,
  IMPLEMENTATION: /\b(implement|timeline|phase|roadmap|effort|resource|change.?management|project|deploy|roll.?out)\b/i,
  ROI_ANALYSIS: /\b(roi|return|payback|benefit|cost|investment|value|impact|business.?case|justify)\b/i,
  BENCHMARK: /\b(benchmark|average|typical|leading|lagging|percentile|best.?practice|maturity)\b/i,
};

// EPM-related topics that should trigger research in detailed mode
const EPM_TOPIC_INDICATORS = /\b(epm|cpm|planning|forecast|budget|consolidation|close|reporting|analytics|driver|kpi|dashboard|variance|scenario|what.?if|allocation|intercompany|currency|elimination|journal|reconciliation|compliance|control|audit|governance|data.?quality|integration|automation)\b/i;

export function assessResearchNeed(
  userMessage: string,
  context: AssessmentContext | null
): ResearchNeed {
  const triggeredTypes: string[] = [];
  
  for (const [type, pattern] of Object.entries(RESEARCH_TRIGGERS)) {
    if (pattern.test(userMessage)) {
      triggeredTypes.push(type);
    }
  }
  
  // Questions about "why" often need market context
  if (/\bwhy\b/i.test(userMessage) && context?.dimensionScores) {
    if (!triggeredTypes.includes('MARKET_TREND')) {
      triggeredTypes.push('MARKET_TREND');
    }
  }
  
  // EPM topic questions should trigger market research
  if (EPM_TOPIC_INDICATORS.test(userMessage) && triggeredTypes.length === 0) {
    triggeredTypes.push('MARKET_TREND');
  }
  
  // Questions with assessment context should be researched for substantive questions
  if (context?.dimensionScores && triggeredTypes.length === 0) {
    const isSubstantiveQuestion = userMessage.length > 20 && /\?|how|what|when|which|can|should|would/i.test(userMessage);
    if (isSubstantiveQuestion) {
      triggeredTypes.push('MARKET_TREND');
    }
  }
  
  // Determine depth based on complexity
  const isComplex = triggeredTypes.length > 1 || 
    /\b(deep.?dive|detail|comprehensive|thorough)\b/i.test(userMessage);
  
  // Determine confidence - if we have assessment context, we're more confident
  const hasContext = context?.dimensionScores && Object.keys(context.dimensionScores).length > 0;
  
  return {
    needsResearch: triggeredTypes.length > 0,
    researchTypes: triggeredTypes,
    depth: isComplex ? 'deep' : 'quick',
    confidence: hasContext ? 'high' : 'medium',
  };
}

// ============================================
// SAFE RESPONSE TEMPLATES
// ============================================

export const SAFE_RESPONSES = {
  greeting: `Hello! I'm the FinanceCompass AI Assistant, here to help you understand your EPM maturity assessment and explore finance transformation opportunities.

How can I assist you today? I can:
• Explain your assessment scores and what they mean
• Provide market context and industry benchmarks
• Discuss vendor options and implementation considerations
• Answer questions about EPM best practices`,

  offTopic: `I appreciate your question, but I'm specifically focused on Enterprise Performance Management and finance transformation.

Is there something related to EPM, financial planning, consolidation, reporting, or your assessment I can help with?`,

  uncertain: `That's an interesting question. To give you accurate information, I'd prefer to be cautious here.

Could you provide more context about what specific aspect you'd like to explore? For example:
• Are you asking about your specific assessment results?
• Would you like market benchmarks for your industry?
• Are you exploring vendor options?`,

  noContext: `I'm here to help with your EPM and finance transformation questions. 

While I can provide more personalised guidance once you complete a FinanceCompass assessment, I can still help you with:
• General EPM platform comparisons and vendor insights
• Finance transformation best practices
• Understanding how to evaluate your organisation's readiness
• Exploring Constancia's services and approach

What would you like to know?`,

  error: `I apologise, but I'm having trouble processing that request right now. 

Please try rephrasing your question, or contact Constancia directly if you need immediate assistance.`,

  tooComplex: `That's a comprehensive question that would benefit from a more detailed discussion.

I can provide general guidance here, but for a thorough analysis tailored to your situation, I'd recommend speaking with one of our EPM advisors.

Would you like me to cover the key points, or would you prefer to schedule a consultation?`,
};

// ============================================
// LEAD SIGNAL DETECTION
// ============================================

export function detectLeadSignals(message: string): Record<string, boolean> {
  const signals: Record<string, boolean> = {};
  
  if (/\b(vendor|platform|implementation|evaluation|select)\b/i.test(message)) {
    signals.vendorEvaluation = true;
  }
  
  if (/\b(roadmap|phased?|timeline|when|how.?long|months?)\b/i.test(message)) {
    signals.roadmapInterest = true;
  }
  
  if (/\b(advisor|consultant|team|discuss|meeting|call|next.?step)\b/i.test(message)) {
    signals.advisoryInterest = true;
  }
  
  if (/\b(problem|challenge|pain|weak|struggling|behind|gap)\b/i.test(message)) {
    signals.problemDefinition = true;
  }
  
  if (/\b(urgent|asap|quickly|priority|now|immedia)\b/i.test(message)) {
    signals.urgencySignal = true;
  }
  
  if (/\b(budget|invest|spend|fund|cost)\b/i.test(message)) {
    signals.budgetMention = true;
  }
  
  return signals;
}

export function calculateLeadScore(
  context: AssessmentContext | null,
  signals: Record<string, boolean>,
  messageCount: number
): number {
  let score = 0;
  
  // Base score from assessment completeness
  if (context?.overallScore !== undefined) {
    if (context.overallScore <= 2.5) score += 0.25; // Low maturity = higher need
    score += 0.1; // Has completed assessment
  }
  
  // Engagement depth
  if (messageCount >= 3) score += 0.1;
  if (messageCount >= 5) score += 0.1;
  
  // Signal boosts
  if (signals.vendorEvaluation) score += 0.10;
  if (signals.problemDefinition) score += 0.10;
  if (signals.roadmapInterest) score += 0.10;
  if (signals.advisoryInterest) score += 0.20;
  if (signals.urgencySignal) score += 0.15;
  if (signals.budgetMention) score += 0.10;
  
  return Math.min(1.0, score);
}
