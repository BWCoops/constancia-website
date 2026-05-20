/**
 * Hash IP addresses with an application-secret salt so they're useful
 * for "same user across a session" correlation without being PII in
 * the GDPR sense. The salt prevents rainbow-table lookup back to the
 * source IP from a leaked DB.
 *
 * Salt source: ANALYTICS_IP_SALT env var. If unset, falls back to a
 * stable per-process random — analytics inside a single boot are
 * coherent, but won't survive a restart. Production should always
 * set the env var.
 */

import { createHash, randomBytes } from "node:crypto";

let salt = process.env.ANALYTICS_IP_SALT || "";
if (!salt) {
  salt = randomBytes(32).toString("hex");
}

export function hashIp(ip: string | undefined | null): string | null {
  if (!ip) return null;
  const cleaned = ip.replace(/^::ffff:/, "").trim();
  if (!cleaned) return null;
  return createHash("sha256").update(`${salt}:${cleaned}`).digest("hex").slice(0, 32);
}
