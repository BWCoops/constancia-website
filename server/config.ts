import { z } from "zod";
import { createChildLogger } from "./lib/logger";

const log = createChildLogger("config");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("5000").transform(Number),
  
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_DIRECT_URL: z.string().optional(),
  
  SESSION_SECRET: z.string().optional(),
  
  PII_ENCRYPTION_KEY: z.string().optional(),
  
  OPENAI_API_KEY: z.string().optional(),
  
  AI_INTEGRATIONS_OPENAI_API_KEY: z.string().optional(),
  AI_INTEGRATIONS_OPENAI_BASE_URL: z.string().url().optional().default("https://api.openai.com/v1"),
  
  AI_INTEGRATIONS_ANTHROPIC_API_KEY: z.string().optional(),
  AI_INTEGRATIONS_ANTHROPIC_BASE_URL: z.string().url().optional(),
  
  PERPLEXITY_API_KEY: z.string().optional(),
  
  WINSTON_AI_API_KEY: z.string().optional(),
  
  HUBSPOT_ACCESS_TOKEN: z.string().optional(),
  
  RECAPTCHA_SECRET_KEY: z.string().optional(),
  RECAPTCHA_SITE_KEY: z.string().optional(),
  
  UNSPLASH_ACCESS_KEY: z.string().optional(),
  
  SITE_URL: z.string().url().optional().default("https://constancia.io"),
  
  ADMIN_EMAIL: z.string().email().optional(),
  
  REPL_ID: z.string().optional(),
  ISSUER_URL: z.string().url().optional(),
  REPLIT_DOMAINS: z.string().optional(),
  
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
  CHROMIUM_PATH: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    const errorMessages = parsed.error.errors
      .map(err => `  ${err.path.join(".")}: ${err.message}`)
      .join("\n");
    
    if (process.env.NODE_ENV === "production") {
      log.error({ errors: errorMessages }, "Environment validation failed");
      throw new Error("Invalid environment configuration");
    } else {
      log.warn({ errors: errorMessages }, "Environment validation warnings");
      return envSchema.parse({
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || "postgresql://localhost/dev",
      });
    }
  }
  
  return parsed.data;
}

export const config = validateEnv();

export const isProduction = config.NODE_ENV === "production";
export const isDevelopment = config.NODE_ENV === "development";

export function hasOpenAI(): boolean {
  return !!(config.OPENAI_API_KEY || config.AI_INTEGRATIONS_OPENAI_API_KEY);
}

export function getOpenAIConfig(): { apiKey: string; baseURL: string } {
  // Prefer user's own API key, fall back to model farm
  if (config.OPENAI_API_KEY) {
    return {
      apiKey: config.OPENAI_API_KEY,
      baseURL: "https://api.openai.com/v1",
    };
  }
  return {
    apiKey: config.AI_INTEGRATIONS_OPENAI_API_KEY || "",
    baseURL: config.AI_INTEGRATIONS_OPENAI_BASE_URL,
  };
}

export function hasAnthropic(): boolean {
  return !!config.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
}

export function hasPerplexity(): boolean {
  return !!config.PERPLEXITY_API_KEY;
}

export function hasHubSpot(): boolean {
  return !!config.HUBSPOT_ACCESS_TOKEN;
}

export function hasTurnstile(): boolean {
  return !!(config.RECAPTCHA_SITE_KEY && config.RECAPTCHA_SECRET_KEY);
}

export function hasWinstonAI(): boolean {
  return !!config.WINSTON_AI_API_KEY;
}

export function hasEncryption(): boolean {
  return !!config.PII_ENCRYPTION_KEY;
}

export function getPerplexityApiKey(): string {
  const key = config.PERPLEXITY_API_KEY || "";
  return key.startsWith("pplx-") ? key : key.replace(/^Bearer\s+/i, "").trim();
}

export function safeLog(message: string, data?: Record<string, unknown>): void {
  const sanitized = data ? Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (key.toLowerCase().includes("key") || 
          key.toLowerCase().includes("secret") || 
          key.toLowerCase().includes("password") ||
          key.toLowerCase().includes("token")) {
        return [key, value ? "[REDACTED]" : undefined];
      }
      return [key, value];
    })
  ) : undefined;
  
  log.info(sanitized || {}, message);
}
