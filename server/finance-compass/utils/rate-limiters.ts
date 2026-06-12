/**
 * FinanceCompass Rate Limiters
 * 
 * Pre-configured rate limiters for different endpoint types.
 * Uses express-rate-limit to restrict requests based on IP address.
 */

import rateLimit from 'express-rate-limit';

/**
 * Standard API rate limiter
 * 100 requests per minute per IP
 */
export const standardApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting in development/test environments if needed
    if (process.env.NODE_ENV === 'development' && req.headers['x-skip-rate-limit']) {
      return true;
    }
    return false;
  },
});

/**
 * Assessment creation rate limiter
 * 10 requests per minute per IP
 * Used for POST /assessments/start and similar creation endpoints
 */
export const assessmentCreationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many assessment creation attempts. Please try again in a moment.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV === 'development' && req.headers['x-skip-rate-limit']) {
      return true;
    }
    return false;
  },
});

/**
 * AI analysis and report generation rate limiter
 * 5 requests per minute per IP
 * These are expensive operations that require external API calls
 */
export const aiAnalysisLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: 'Analysis rate limit exceeded. Please try again in a moment.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV === 'development' && req.headers['x-skip-rate-limit']) {
      return true;
    }
    return false;
  },
});

/**
 * OTP request rate limiter
 * 5 requests per minute per IP
 * Prevents abuse of OTP sending for email verification
 */
export const otpRequestLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: 'Too many verification requests. Please try again in a moment.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV === 'development' && req.headers['x-skip-rate-limit']) {
      return true;
    }
    return false;
  },
});

/**
 * Chatbot session creation rate limiter
 * 20 sessions per hour per IP
 * Prevents unlimited AI-credit consumption via fresh session minting
 */
export const chatbotSessionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many chatbot sessions created. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV === 'development' && req.headers['x-skip-rate-limit']) {
      return true;
    }
    return false;
  },
});

/**
 * Chatbot message rate limiter
 * 60 messages per 10 minutes per IP
 * Provides a secondary IP-level guard on top of the per-session guard
 */
export const chatbotMessageLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 60,
  message: 'Too many messages. Please slow down and try again shortly.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV === 'development' && req.headers['x-skip-rate-limit']) {
      return true;
    }
    return false;
  },
});
