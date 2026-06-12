/**
 * FinanceCompass OTP Service
 * 
 * OTP configuration, rate limiting, and email utilities for the FinanceCompass module.
 */

import type { Request } from "express";
import crypto from "crypto";
import { sendEmail } from "../services/email-sender";
import { createChildLogger } from "../lib/logger";
import {
  EMAIL_BRAND,
  generateEmailHeader,
  generateEmailFooter,
  generateEmailWrapper,
  generateOtpBox,
} from "../core/email/components";

const log = createChildLogger("fc-otp-service");

// ============================================
// OTP Configuration for FinanceCompass
// ============================================
export const FC_OTP_EXPIRY_MINUTES = 3;
export const FC_SESSION_EXPIRY_DAYS = 7;
export const FC_SESSION_COOKIE_NAME = "fc_verified_session";

// OTP rate limiting (in-memory) - per email
const fcOtpRateLimits = new Map<string, { count: number; resetAt: number }>();
export const FC_OTP_RATE_LIMIT = 3;
export const FC_OTP_RATE_WINDOW = 10 * 60 * 1000; // 10 minutes

// IP-based rate limiting for additional protection
const fcIpRateLimits = new Map<string, { count: number; resetAt: number }>();
export const FC_IP_RATE_LIMIT = 10; // More generous for IP since multiple users might share IP
export const FC_IP_RATE_WINDOW = 10 * 60 * 1000; // 10 minutes

// OTP verification failure tracking per IP
const fcOtpFailures = new Map<string, { count: number; blockedUntil: number }>();
export const FC_OTP_MAX_FAILURES = 10;
export const FC_OTP_BLOCK_DURATION = 30 * 60 * 1000; // 30 minutes

// AI Analysis rate limiting - per contact to prevent API abuse
const fcAiAnalysisRateLimits = new Map<string, { count: number; resetAt: number }>();
export const FC_AI_ANALYSIS_RATE_LIMIT = 5; // 5 analyses per window
export const FC_AI_ANALYSIS_RATE_WINDOW = 60 * 60 * 1000; // 1 hour

export const FC_OTP_MAX_PER_CODE_ATTEMPTS = 5;

// In-memory OTP storage for FinanceCompass
export const fcOtpStore = new Map<string, { hash: string; expiresAt: number; attempts: number }>();

export function incrementOtpAttempts(email: string): { exceeded: boolean; remaining: number } {
  const key = email.toLowerCase();
  const entry = fcOtpStore.get(key);
  if (!entry) return { exceeded: true, remaining: 0 };
  entry.attempts++;
  if (entry.attempts >= FC_OTP_MAX_PER_CODE_ATTEMPTS) {
    fcOtpStore.delete(key);
    return { exceeded: true, remaining: 0 };
  }
  return { exceeded: false, remaining: FC_OTP_MAX_PER_CODE_ATTEMPTS - entry.attempts };
}

export function getClientIp(req: Request): string {
  return req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || 'unknown';
}

export function checkFcIpRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const limit = fcIpRateLimits.get(ip);
  
  if (!limit || now > limit.resetAt) {
    fcIpRateLimits.set(ip, { count: 1, resetAt: now + FC_IP_RATE_WINDOW });
    return { allowed: true, remaining: FC_IP_RATE_LIMIT - 1 };
  }
  
  if (limit.count >= FC_IP_RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  
  limit.count++;
  return { allowed: true, remaining: FC_IP_RATE_LIMIT - limit.count };
}

export function checkFcOtpRateLimit(email: string): { allowed: boolean; remaining: number } {
  const key = email.toLowerCase();
  const now = Date.now();
  const limit = fcOtpRateLimits.get(key);
  
  if (!limit || now > limit.resetAt) {
    fcOtpRateLimits.set(key, { count: 1, resetAt: now + FC_OTP_RATE_WINDOW });
    return { allowed: true, remaining: FC_OTP_RATE_LIMIT - 1 };
  }
  
  if (limit.count >= FC_OTP_RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  
  limit.count++;
  return { allowed: true, remaining: FC_OTP_RATE_LIMIT - limit.count };
}

export function recordOtpFailure(ip: string): { blocked: boolean; remainingAttempts: number } {
  const now = Date.now();
  const failure = fcOtpFailures.get(ip);
  
  // Check if currently blocked
  if (failure && failure.blockedUntil > 0 && now < failure.blockedUntil) {
    return { blocked: true, remainingAttempts: 0 };
  }
  
  // If no record exists, or block has expired, start fresh
  if (!failure || (failure.blockedUntil > 0 && now >= failure.blockedUntil)) {
    fcOtpFailures.set(ip, { count: 1, blockedUntil: 0 });
    return { blocked: false, remainingAttempts: FC_OTP_MAX_FAILURES - 1 };
  }
  
  // Increment existing failure count
  failure.count++;
  if (failure.count >= FC_OTP_MAX_FAILURES) {
    failure.blockedUntil = now + FC_OTP_BLOCK_DURATION;
    return { blocked: true, remainingAttempts: 0 };
  }
  
  return { blocked: false, remainingAttempts: FC_OTP_MAX_FAILURES - failure.count };
}

export function clearOtpFailures(ip: string): void {
  fcOtpFailures.delete(ip);
}

export function isIpBlocked(ip: string): boolean {
  const failure = fcOtpFailures.get(ip);
  if (!failure) return false;
  return Date.now() < failure.blockedUntil;
}

export function checkAiAnalysisRateLimit(contactId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const limit = fcAiAnalysisRateLimits.get(contactId);
  
  if (!limit || now > limit.resetAt) {
    fcAiAnalysisRateLimits.set(contactId, { count: 1, resetAt: now + FC_AI_ANALYSIS_RATE_WINDOW });
    return { allowed: true, remaining: FC_AI_ANALYSIS_RATE_LIMIT - 1, resetIn: FC_AI_ANALYSIS_RATE_WINDOW };
  }
  
  if (limit.count >= FC_AI_ANALYSIS_RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetIn: limit.resetAt - now };
  }
  
  limit.count++;
  return { allowed: true, remaining: FC_AI_ANALYSIS_RATE_LIMIT - limit.count, resetIn: limit.resetAt - now };
}

// Periodic cleanup of expired entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  Array.from(fcOtpRateLimits.entries()).forEach(([key, value]) => {
    if (now > value.resetAt) fcOtpRateLimits.delete(key);
  });
  Array.from(fcIpRateLimits.entries()).forEach(([key, value]) => {
    if (now > value.resetAt) fcIpRateLimits.delete(key);
  });
  Array.from(fcOtpStore.entries()).forEach(([key, value]) => {
    if (now > value.expiresAt) fcOtpStore.delete(key);
  });
  Array.from(fcOtpFailures.entries()).forEach(([key, value]) => {
    if (now > value.blockedUntil && value.blockedUntil > 0) fcOtpFailures.delete(key);
  });
  Array.from(fcAiAnalysisRateLimits.entries()).forEach(([key, value]) => {
    if (now > value.resetAt) fcAiAnalysisRateLimits.delete(key);
  });
}, 5 * 60 * 1000);

export async function sendFcOtpEmail(email: string, firstName: string, otp: string): Promise<boolean> {
  try {
    const body = `
      <p style="color: ${EMAIL_BRAND.darkGray}; font-size: 16px; line-height: 1.7; margin: 0 0 8px 0;">Hello ${firstName},</p>
      <p style="color: ${EMAIL_BRAND.mutedGray}; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
        Use the code below to access your FinanceCompass assessment. It expires in ${FC_OTP_EXPIRY_MINUTES} minutes.
      </p>
      ${generateOtpBox(otp)}
      <p style="color: ${EMAIL_BRAND.mutedGray}; font-size: 13px; text-align: center; margin: 0;">
        If you did not request this code, you can safely ignore this email.
      </p>
    `;

    const htmlContent = generateEmailWrapper(
      generateEmailHeader({ variant: 'dark', tagline: 'Finance Transformation Assessment', showTagline: true }),
      body,
      generateEmailFooter({ variant: 'dark', showFinanceCompass: false })
    );

    await sendEmail({
      to: email,
      subject: "Your FinanceCompass Verification Code",
      htmlContent,
    });
    
    return true;
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Failed to send OTP email");
    return false;
  }
}
