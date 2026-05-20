/**
 * Recursive token-aware chunking for the brain.
 *
 * Strategy: split on headings → paragraphs → sentences → hard wrap.
 * Target chunk size ~750 tokens with ~15% overlap. We approximate
 * tokens as `chars / 4` — accurate enough for OpenAI text-embedding-3-small,
 * which has an 8192 token input limit we never approach.
 */

export interface Chunk {
  index: number;
  text: string;
  tokenCount: number;
  headingPath?: string;
}

const CHARS_PER_TOKEN = 4;
const DEFAULT_TARGET_TOKENS = 750;
const DEFAULT_OVERLAP_TOKENS = 110;
const HARD_MAX_TOKENS = 1500;

const HEADING_RE = /^(#{1,6})\s+(.+)$/gm;

function approxTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

interface Segment {
  text: string;
  headingPath: string;
}

/**
 * First pass: split into headed segments. If no markdown headings,
 * treat the whole document as one segment.
 */
function splitByHeadings(text: string): Segment[] {
  const matches = Array.from(text.matchAll(HEADING_RE));
  if (matches.length === 0) return [{ text: text.trim(), headingPath: "" }];

  const segments: Segment[] = [];
  const headingStack: Array<{ level: number; title: string }> = [];

  let cursor = 0;
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = m.index ?? 0;
    if (start > cursor) {
      const chunkText = text.slice(cursor, start).trim();
      if (chunkText.length > 0) {
        segments.push({
          text: chunkText,
          headingPath: headingStack.map((h) => h.title).join(" / "),
        });
      }
    }

    const level = m[1].length;
    const title = m[2].trim();
    while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
      headingStack.pop();
    }
    headingStack.push({ level, title });
    cursor = start + m[0].length;
  }

  if (cursor < text.length) {
    const tail = text.slice(cursor).trim();
    if (tail.length > 0) {
      segments.push({
        text: tail,
        headingPath: headingStack.map((h) => h.title).join(" / "),
      });
    }
  }

  return segments;
}

function splitOnBoundary(text: string, targetChars: number): string[] {
  if (text.length <= targetChars) return [text];

  const parts: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    let end = Math.min(cursor + targetChars, text.length);

    if (end < text.length) {
      // Prefer breaking on paragraph, sentence, then whitespace.
      const slice = text.slice(cursor, end);
      const paraIdx = slice.lastIndexOf("\n\n");
      const sentIdx = Math.max(
        slice.lastIndexOf(". "),
        slice.lastIndexOf("! "),
        slice.lastIndexOf("? "),
      );
      const wsIdx = slice.lastIndexOf(" ");

      const breakIdx =
        paraIdx > targetChars * 0.5
          ? paraIdx + 2
          : sentIdx > targetChars * 0.5
            ? sentIdx + 2
            : wsIdx > targetChars * 0.5
              ? wsIdx + 1
              : -1;

      if (breakIdx > 0) end = cursor + breakIdx;
    }

    parts.push(text.slice(cursor, end).trim());
    cursor = end;
  }

  return parts.filter((p) => p.length > 0);
}

export interface ChunkOptions {
  targetTokens?: number;
  overlapTokens?: number;
  hardMaxTokens?: number;
}

export function chunkText(text: string, opts: ChunkOptions = {}): Chunk[] {
  const target = opts.targetTokens ?? DEFAULT_TARGET_TOKENS;
  const overlap = opts.overlapTokens ?? DEFAULT_OVERLAP_TOKENS;
  const hardMax = opts.hardMaxTokens ?? HARD_MAX_TOKENS;

  const segments = splitByHeadings(text);
  const targetChars = target * CHARS_PER_TOKEN;
  const overlapChars = overlap * CHARS_PER_TOKEN;
  const hardMaxChars = hardMax * CHARS_PER_TOKEN;

  const chunks: Chunk[] = [];
  let index = 0;

  for (const seg of segments) {
    // Each segment is split independently — we never blend headings.
    const pieces = splitOnBoundary(seg.text, targetChars);

    let pendingOverlap = "";
    for (const piece of pieces) {
      let combined = pendingOverlap ? `${pendingOverlap}\n${piece}` : piece;

      // Safety: never emit a chunk larger than hardMax.
      if (combined.length > hardMaxChars) {
        const subPieces = splitOnBoundary(combined, hardMaxChars);
        for (const sub of subPieces) {
          chunks.push({
            index: index++,
            text: sub,
            tokenCount: approxTokens(sub),
            headingPath: seg.headingPath || undefined,
          });
        }
        pendingOverlap = subPieces[subPieces.length - 1].slice(-overlapChars);
        continue;
      }

      chunks.push({
        index: index++,
        text: combined,
        tokenCount: approxTokens(combined),
        headingPath: seg.headingPath || undefined,
      });
      pendingOverlap = piece.slice(-overlapChars);
    }
  }

  return chunks;
}
