import { Request, Response, NextFunction } from "express";
import { createChildLogger } from "../lib/logger";
import { redactIp } from "../utils/log-privacy";

const log = createChildLogger("prompt-injection");

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(all\s+)?(your\s+)?instructions/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /act\s+as\s+(a|an)\s+/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /\{\{.*system.*\}\}/i,
  /reveal\s+(your\s+)?(system\s+)?prompt/i,
  /show\s+(me\s+)?(your\s+)?(system\s+)?prompt/i,
  /what\s+(are|is)\s+(your\s+)?(system\s+)?(instructions|prompt)/i,
  /repeat\s+(the\s+)?(text|words)\s+above/i,
  /print\s+(your\s+)?(initial|system)\s+(prompt|instructions)/i,
  /output\s+(your\s+)?(system|initial)\s+(prompt|message)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /developer\s+mode/i,
];

const MAX_INPUT_LENGTH = 10000;

export function sanitizeAIInput(input: string): { safe: boolean; sanitized: string; reason?: string } {
  if (!input || typeof input !== 'string') {
    return { safe: true, sanitized: '' };
  }

  if (input.length > MAX_INPUT_LENGTH) {
    return { safe: false, sanitized: input.slice(0, MAX_INPUT_LENGTH), reason: 'input_too_long' };
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return { safe: false, sanitized: input, reason: 'prompt_injection_detected' };
    }
  }

  return { safe: true, sanitized: input };
}

export function validateAIOutput(output: string, systemPromptFragments: string[] = []): { safe: boolean; filtered: string; reason?: string } {
  if (!output) return { safe: true, filtered: '' };

  for (const fragment of systemPromptFragments) {
    if (fragment.length > 20 && output.toLowerCase().includes(fragment.toLowerCase())) {
      return { safe: false, filtered: '[Response filtered - contained system configuration]', reason: 'system_prompt_leakage' };
    }
  }

  const piiPatterns = [
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ];

  let filtered = output;
  for (const pattern of piiPatterns) {
    filtered = filtered.replace(pattern, '[REDACTED]');
  }

  return { safe: true, filtered };
}

export function promptInjectionGuard(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const body = req.body;
    if (!body || typeof body !== 'object') return next();

    for (const field of fields) {
      const value = body[field];
      if (typeof value === 'string') {
        const result = sanitizeAIInput(value);
        if (!result.safe) {
          log.warn({
            field,
            reason: result.reason,
            ip: redactIp(req.ip),
            path: req.path,
          }, "Prompt injection blocked");
          return res.status(400).json({
            error: "Invalid input detected",
            code: "INVALID_INPUT",
          });
        }
      }
    }
    next();
  };
}
