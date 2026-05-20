/**
 * Cloudflare R2 client for the brain.
 *
 * R2 exposes the S3 API; we use the AWS SDK with an R2-specific endpoint.
 * Objects are stored under `documents/<sha256>` so duplicate uploads
 * collapse to a single object.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash } from "node:crypto";

const accountId = process.env.BRAIN_R2_ACCOUNT_ID;
const accessKeyId = process.env.BRAIN_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.BRAIN_R2_SECRET_ACCESS_KEY;
const bucket = process.env.BRAIN_R2_BUCKET ?? "constancia-brain";

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "BRAIN_R2_ACCOUNT_ID, BRAIN_R2_ACCESS_KEY_ID and BRAIN_R2_SECRET_ACCESS_KEY must be set.",
    );
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

export function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function r2KeyFor(sha256: string): string {
  return `documents/${sha256}`;
}

export function r2UriFor(sha256: string): string {
  return `r2://${bucket}/${r2KeyFor(sha256)}`;
}

export async function uploadBuffer(
  buf: Buffer,
  opts: { contentType?: string; metadata?: Record<string, string> } = {},
): Promise<{ sha256: string; uri: string; key: string; size: number }> {
  const sha256 = sha256Hex(buf);
  const key = r2KeyFor(sha256);

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: opts.contentType ?? "application/octet-stream",
      Metadata: opts.metadata,
    }),
  );

  return { sha256, uri: r2UriFor(sha256), key, size: buf.length };
}

export async function downloadBuffer(sha256: string): Promise<Buffer> {
  const out = await getClient().send(
    new GetObjectCommand({ Bucket: bucket, Key: r2KeyFor(sha256) }),
  );
  const body = out.Body;
  if (!body) throw new Error(`No body in R2 response for ${sha256}`);

  // Node stream → Buffer
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Buffer>) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export async function existsInR2(sha256: string): Promise<boolean> {
  try {
    await getClient().send(
      new HeadObjectCommand({ Bucket: bucket, Key: r2KeyFor(sha256) }),
    );
    return true;
  } catch (err) {
    const code = (err as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode;
    if (code === 404) return false;
    throw err;
  }
}

export async function deleteFromR2(sha256: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: bucket, Key: r2KeyFor(sha256) }),
  );
}

export async function presignedUploadUrl(
  sha256: string,
  contentType: string,
  expiresInSeconds = 600,
): Promise<string> {
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: bucket,
      Key: r2KeyFor(sha256),
      ContentType: contentType,
    }),
    { expiresIn: expiresInSeconds },
  );
}

export const r2Config = { bucket, accountId };
