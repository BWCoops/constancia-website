/**
 * Editorial content-quality service. Replaces the Winston AI detection
 * flow, which produced a single score that was usually "AI generated"
 * with no recommended action and no way to remediate.
 *
 * What this gives editors instead — deterministic checks that an editor
 * can act on, plus a one-click rewrite pass that targets the specific
 * issues identified:
 *
 *   - Readability (Flesch-Kincaid grade level + reading ease).
 *   - Generic-LLM phrase detection (a curated list of phrases that
 *     telegraph LLM authorship: "delve into", "in conclusion", "fast-
 *     paced world", etc.).
 *   - Brand-voice deviation (legacy "1QG" references, missing brand
 *     context, banned filler phrases).
 *   - Unsourced claims (statistics or strong assertions without a
 *     citation in the surrounding sentence).
 *   - Heading structure (H1 count, H2 cadence, orphan H3s).
 *   - Sentence-length variance (low variance = robotic cadence).
 *   - Content freshness (published or updated date age).
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// -- Generic-LLM phrase blacklist -----------------------------------------
// Curated from observed Anthropic/OpenAI output patterns. Editors can
// add to this list as new fashionable phrases emerge.
export const GENERIC_LLM_PHRASES: string[] = [
  "delve into",
  "in today's fast-paced",
  "in the realm of",
  "navigating the landscape",
  "in conclusion,",
  "it's important to note",
  "it is important to note",
  "in summary,",
  "ever-evolving",
  "ever-changing",
  "cutting-edge",
  "game-changer",
  "tapestry of",
  "a testament to",
  "leverage the power of",
  "harness the power of",
  "in this day and age",
  "at the end of the day",
  "the bottom line is",
  "first and foremost",
  "needless to say",
  "it goes without saying",
  "let's dive in",
  "let's explore",
  "as we move forward",
  "moving forward,",
  "going forward,",
  "robust solution",
  "comprehensive approach",
  "holistic approach",
  "synergy",
  "paradigm shift",
];

// Words that indicate a quantitative claim. If one appears in a
// sentence without a citation marker, the sentence is flagged.
const QUANTITY_INDICATORS = /\b(\d+(\.\d+)?%|\d{2,}|study|research|report|survey|analysis|data shows|statistics)\b/i;
const CITATION_INDICATORS = /\b(according to|cited by|source:|per a |per the |\bvia\b|\(20\d{2}\)|\bMcKinsey\b|\bGartner\b|\bDeloitte\b|\bPwC\b|\bAPQC\b|\bONS\b)\b/i;

// Banned/legacy brand strings.
const BRAND_VIOLATIONS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b1QG\b/g, reason: "Legacy brand: replace with 'Constancia'." },
  { pattern: /\b1qg_(good|best)\b/g, reason: "Legacy tier label: use 'Strong' or 'World-class'." },
];

export interface ContentIssue {
  kind:
    | "generic_phrase"
    | "brand_violation"
    | "unsourced_claim"
    | "readability"
    | "heading_structure"
    | "monotone_cadence"
    | "stale_content";
  severity: "high" | "medium" | "low";
  message: string;
  excerpt?: string;
  /** 0-based character index where the issue was found. */
  position?: number;
}

export interface ContentQualityReport {
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  sentenceLengthVariance: number;
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  issues: ContentIssue[];
  /** Editor-facing readability summary. */
  readabilitySummary: string;
  /** Overall A–F grade — what the operator reads first. */
  overallGrade: "A" | "B" | "C" | "D" | "F";
}

// -- Plain text extraction -------------------------------------------------

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map(s => s.trim())
    .filter(Boolean);
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  // Vowel groups
  const matches = w.replace(/(?:[^laeiouy]|ed|[^laeiouy]e)$/, "").match(/[aeiouy]+/g);
  return Math.max(1, matches?.length ?? 1);
}

// -- Public API ------------------------------------------------------------

export function analyzeContent(htmlOrText: string, opts?: { publishedAt?: Date }): ContentQualityReport {
  const text = stripHtml(htmlOrText);
  const sentences = splitSentences(text);
  const words = text.split(/\s+/).filter(Boolean);
  const sentenceLengths = sentences.map(s => s.split(/\s+/).filter(Boolean).length);
  const avgSentenceLength = sentenceLengths.length
    ? sentenceLengths.reduce((a, c) => a + c, 0) / sentenceLengths.length
    : 0;
  const variance = sentenceLengths.length
    ? sentenceLengths.reduce((a, c) => a + (c - avgSentenceLength) ** 2, 0) / sentenceLengths.length
    : 0;
  const totalSyllables = words.reduce((a, w) => a + countSyllables(w), 0);

  // Flesch Reading Ease and FK Grade Level.
  const fleschReadingEase = words.length && sentences.length
    ? 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (totalSyllables / words.length)
    : 0;
  const fleschKincaidGrade = words.length && sentences.length
    ? 0.39 * (words.length / sentences.length) + 11.8 * (totalSyllables / words.length) - 15.59
    : 0;

  const issues: ContentIssue[] = [];

  // 1. Generic phrases
  const lowered = text.toLowerCase();
  for (const phrase of GENERIC_LLM_PHRASES) {
    const idx = lowered.indexOf(phrase);
    if (idx >= 0) {
      issues.push({
        kind: "generic_phrase",
        severity: "medium",
        message: `Generic LLM phrase: "${phrase}". Replace with brand-specific language or remove.`,
        excerpt: text.slice(Math.max(0, idx - 40), idx + phrase.length + 40),
        position: idx,
      });
    }
  }

  // 2. Brand violations
  for (const violation of BRAND_VIOLATIONS) {
    const matches = Array.from(text.matchAll(violation.pattern));
    for (const m of matches) {
      issues.push({
        kind: "brand_violation",
        severity: "high",
        message: violation.reason,
        excerpt: text.slice(Math.max(0, (m.index ?? 0) - 30), (m.index ?? 0) + (m[0]?.length ?? 0) + 30),
        position: m.index,
      });
    }
  }

  // 3. Unsourced claims
  for (const sentence of sentences) {
    if (QUANTITY_INDICATORS.test(sentence) && !CITATION_INDICATORS.test(sentence)) {
      issues.push({
        kind: "unsourced_claim",
        severity: "medium",
        message: "Quantitative claim without an inline citation. Add 'according to X' or '(Source, year)'.",
        excerpt: sentence.slice(0, 200),
      });
    }
  }

  // 4. Readability
  if (fleschKincaidGrade > 14) {
    issues.push({
      kind: "readability",
      severity: "medium",
      message: `Grade level ${fleschKincaidGrade.toFixed(1)} is academic — finance leaders read for clarity, not vocabulary. Shorten sentences and prefer plain verbs.`,
    });
  }
  if (fleschReadingEase < 30) {
    issues.push({
      kind: "readability",
      severity: "low",
      message: `Reading ease ${fleschReadingEase.toFixed(0)} is very difficult. Break long sentences and reduce subordinate clauses.`,
    });
  }

  // 5. Heading structure
  const h1Count = (htmlOrText.match(/<h1\b/gi) ?? []).length;
  const h2Count = (htmlOrText.match(/<h2\b/gi) ?? []).length;
  if (h1Count > 1) {
    issues.push({
      kind: "heading_structure",
      severity: "high",
      message: `${h1Count} H1 tags — there should be exactly one H1 per page.`,
    });
  }
  if (words.length > 400 && h2Count < 2) {
    issues.push({
      kind: "heading_structure",
      severity: "medium",
      message: `Long post (${words.length} words) with only ${h2Count} H2 sections. Add subheadings every 200–300 words to break up the page.`,
    });
  }

  // 6. Monotone cadence
  if (sentences.length > 8 && variance < 12) {
    issues.push({
      kind: "monotone_cadence",
      severity: "medium",
      message: `Sentence-length variance is low (${variance.toFixed(0)}). Vary short and long sentences to sound less robotic.`,
    });
  }

  // 7. Staleness
  if (opts?.publishedAt) {
    const ageDays = (Date.now() - opts.publishedAt.getTime()) / (24 * 60 * 60 * 1000);
    if (ageDays > 365) {
      issues.push({
        kind: "stale_content",
        severity: "low",
        message: `Last published ${Math.round(ageDays)} days ago. Consider a refresh — stats and citations may be out of date.`,
      });
    }
  }

  // Grade: each "high" issue is -2, each "medium" is -1, each "low" is -0.5.
  const penalty = issues.reduce((p, i) => p + (i.severity === "high" ? 2 : i.severity === "medium" ? 1 : 0.5), 0);
  let overallGrade: "A" | "B" | "C" | "D" | "F";
  if (penalty <= 1) overallGrade = "A";
  else if (penalty <= 3) overallGrade = "B";
  else if (penalty <= 6) overallGrade = "C";
  else if (penalty <= 10) overallGrade = "D";
  else overallGrade = "F";

  let readabilitySummary: string;
  if (fleschReadingEase >= 70) readabilitySummary = "Easy — accessible to most readers.";
  else if (fleschReadingEase >= 50) readabilitySummary = "Standard — appropriate for finance professionals.";
  else if (fleschReadingEase >= 30) readabilitySummary = "Difficult — most readers will struggle.";
  else readabilitySummary = "Very difficult — university-level vocabulary throughout.";

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    sentenceLengthVariance: Math.round(variance * 10) / 10,
    fleschReadingEase: Math.round(fleschReadingEase * 10) / 10,
    fleschKincaidGrade: Math.round(fleschKincaidGrade * 10) / 10,
    issues,
    readabilitySummary,
    overallGrade,
  };
}

// -- Rewrite pass ----------------------------------------------------------
//
// Uses Anthropic to rewrite the content with explicit instructions
// derived from the issues found. The model gets the issue list so it
// targets the actual problems — generic phrases, brand voice, sourced
// claims — rather than a generic "make it less AI-sounding" prompt.

const REWRITE_MODEL = "claude-sonnet-4-6";

const BRAND_VOICE_GUIDE = `Constancia is an AI-first EPM advisory. We are direct, evidence-driven, and confident without being grandiose. We write for finance leaders (CFOs, FP&A directors, finance transformation leads) who value precision over flourish.

Voice:
- Plain verbs, active voice
- Concrete claims with sources or qualified language
- No marketing jargon ("game-changing", "synergy", "leverage the power of")
- No hedging filler ("it is important to note", "in conclusion")
- Vary sentence length — short punchy sentences alongside longer ones
- British English spelling
- Refer to the firm as "Constancia" — never "1QG", which is the legacy name`;

export async function rewriteContent(
  text: string,
  issues: ContentIssue[],
  opts?: { tone?: "consulting" | "newsletter" | "report"; maxOutputTokens?: number },
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }
  const tone = opts?.tone ?? "consulting";

  const issueSummary = issues
    .map(i => `- [${i.severity}] ${i.message}${i.excerpt ? ` (e.g., "${i.excerpt.slice(0, 100)}")` : ""}`)
    .join("\n");

  const instruction = `You are editing a Constancia article. Rewrite the content below to fix every issue listed, keeping the structure (headings, paragraph breaks) and substantive arguments intact. Don't add new claims; reshape what's there.

Issues to fix:
${issueSummary || "(no specific issues — apply general brand-voice polish)"}

Brand-voice guide:
${BRAND_VOICE_GUIDE}

Output format: just the rewritten content, no preamble, no commentary. Keep HTML tags if present.

Tone: ${tone}.

Content to rewrite:
---
${text}
---`;

  const response = await anthropic.messages.create({
    model: REWRITE_MODEL,
    max_tokens: opts?.maxOutputTokens ?? 4096,
    messages: [{ role: "user", content: instruction }],
  });

  const block = response.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected non-text response from rewrite model");
  }
  return block.text;
}
