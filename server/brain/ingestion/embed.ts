/**
 * Embeddings via OpenAI text-embedding-3-small (1536 dims).
 *
 * Batches up to 96 texts per request to stay well under OpenAI's
 * payload limits, with a simple retry on transient failures.
 */

import OpenAI from "openai";

const DEFAULT_MODEL = process.env.BRAIN_EMBEDDINGS_MODEL ?? "text-embedding-3-small";
const BATCH_SIZE = 96;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 500;

const apiKey =
  process.env.BRAIN_OPENAI_API_KEY ??
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY ??
  process.env.OPENAI_API_KEY;

let cachedClient: OpenAI | null = null;
function getClient(): OpenAI {
  if (cachedClient) return cachedClient;
  if (!apiKey) {
    throw new Error(
      "OpenAI API key required for brain embeddings. Set BRAIN_OPENAI_API_KEY, AI_INTEGRATIONS_OPENAI_API_KEY or OPENAI_API_KEY.",
    );
  }
  cachedClient = new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
  return cachedClient;
}

async function embedBatch(texts: string[], attempt = 0): Promise<number[][]> {
  try {
    const res = await getClient().embeddings.create({
      model: DEFAULT_MODEL,
      input: texts,
    });
    return res.data.map((d) => d.embedding as number[]);
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err;
    const wait = RETRY_BASE_MS * 2 ** attempt;
    await new Promise((r) => setTimeout(r, wait));
    return embedBatch(texts, attempt + 1);
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const slice = texts.slice(i, i + BATCH_SIZE);
    const result = await embedBatch(slice);
    out.push(...result);
  }
  return out;
}

export async function embedOne(text: string): Promise<number[]> {
  const [result] = await embedTexts([text]);
  return result;
}

export const embeddingModel = `openai/${DEFAULT_MODEL}`;
export const embeddingDimensions = 1536;
