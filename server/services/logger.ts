/**
 * Structured Logger Service
 * 
 * Provides consistent logging across the application with:
 * - Log levels (debug, info, warn, error)
 * - Structured JSON output for production
 * - Correlation ID support
 * - Sensitive field redaction
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  domain?: string;
  action?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const SENSITIVE_FIELDS = [
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'credentials',
  'creditCard',
  'ssn',
  'encryptionKey',
];

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = (process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug')) as LogLevel;

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[logLevel];
}

function redactSensitive(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitive);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitive(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function formatEntry(entry: LogEntry): string {
  if (isProduction) {
    return JSON.stringify({
      ...entry,
      context: entry.context ? redactSensitive(entry.context) : undefined,
    });
  }

  const levelColors: Record<LogLevel, string> = {
    debug: '\x1b[36m',
    info: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
  };
  const reset = '\x1b[0m';
  const color = levelColors[entry.level];

  let output = `${color}[${entry.level.toUpperCase()}]${reset} ${entry.message}`;

  if (entry.context) {
    const ctx = redactSensitive(entry.context) as Record<string, unknown>;
    const contextStr = Object.entries(ctx)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(' ');
    if (contextStr) {
      output += ` | ${contextStr}`;
    }
  }

  if (entry.error) {
    output += ` | error=${entry.error.message}`;
    if (!isProduction && entry.error.stack) {
      output += `\n${entry.error.stack}`;
    }
  }

  return output;
}

function createEntry(level: LogLevel, message: string, context?: LogContext, error?: Error): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: isProduction ? undefined : error.stack,
    };
  }

  return entry;
}

function log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
  if (!shouldLog(level)) return;

  const entry = createEntry(level, message, context, error);
  const formatted = formatEntry(entry);

  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext, error?: Error) => log('error', message, context, error),

  child: (baseContext: LogContext) => ({
    debug: (message: string, context?: LogContext) => log('debug', message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) => log('info', message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext) => log('warn', message, { ...baseContext, ...context }),
    error: (message: string, context?: LogContext, error?: Error) => log('error', message, { ...baseContext, ...context }, error),
  }),
};

export default logger;
