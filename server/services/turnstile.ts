import { createChildLogger } from "../lib/logger";

const log = createChildLogger("recaptcha");

interface RecaptchaVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

const RECAPTCHA_TIMEOUT_MS = 10000;

// ── Key resolution ─────────────────────────────────────────────────────────────
// Development uses _DEV keys (registered for the Replit domain).
// Production uses the primary keys (registered for constancia.io).
// Once the same v2 key pair is registered for all domains, both can point to
// the same values and the _DEV distinction can be dropped.
const isDev = process.env.NODE_ENV === "development";

function getSiteKey(): string | undefined {
  return isDev
    ? (process.env.RECAPTCHA_SITE_KEY_DEV ?? process.env.RECAPTCHA_SITE_KEY)
    : (process.env.RECAPTCHA_SITE_KEY ?? process.env.RECAPTCHA_SITE_KEY_DEV);
}

function getSecretKey(): string | undefined {
  return isDev
    ? (process.env.RECAPTCHA_SECRET_KEY_DEV ?? process.env.RECAPTCHA_SECRET_KEY)
    : (process.env.RECAPTCHA_SECRET_KEY ?? process.env.RECAPTCHA_SECRET_KEY_DEV);
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = getSecretKey();

  if (!secretKey) {
    log.error("reCAPTCHA secret key not configured");
    return { success: false, error: "Bot verification not configured" };
  }

  if (!token) {
    return { success: false, error: "Bot verification token missing" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RECAPTCHA_TIMEOUT_MS);

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
        signal: controller.signal,
      }
    );

    const result: RecaptchaVerifyResponse = await response.json();

    log.info({ result }, "Google reCAPTCHA v2 response");

    if (result.success) {
      return { success: true };
    } else {
      log.warn({
        errors: result["error-codes"],
        hostname: result.hostname,
      }, "reCAPTCHA verification failed");
      return { success: false, error: "Bot verification failed. Please try again." };
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      log.error({ timeoutMs: RECAPTCHA_TIMEOUT_MS }, "reCAPTCHA request timed out");
      return { success: false, error: "Bot verification request timed out" };
    }
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "reCAPTCHA verification error");
    return { success: false, error: "Bot verification service unavailable" };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getTurnstileSiteKey(): string | undefined {
  return getSiteKey();
}

export function isTurnstileConfigured(): boolean {
  return !!(getSiteKey() && getSecretKey());
}
