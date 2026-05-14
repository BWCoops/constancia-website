/**
 * FinanceCompass Validation Schemas
 * 
 * Centralized Zod schemas for API request validation.
 * Ensures consistent input validation across all endpoints.
 */

import { z } from "zod";
import { FC_ASSESSMENT_TIERS, FC_DIMENSIONS } from "@shared/finance-compass-schema";

export const uuidSchema = z.string().uuid("Invalid UUID format");

export const emailSchema = z.string().email("Invalid email format").max(255);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const assessmentTierSchema = z.enum(FC_ASSESSMENT_TIERS);

export const dimensionSchema = z.enum([...FC_DIMENSIONS, "qualification", "sizing"] as const);

export const createAssessmentSchema = z.object({
  tier: assessmentTierSchema.optional().default("pre_assessment"),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
});

export const submitResponseSchema = z.object({
  questionId: z.string().min(1, "Question ID is required"),
  response: z.union([
    z.string(),
    z.number(),
    z.array(z.string()),
    z.record(z.unknown()),
  ]),
  rawValue: z.union([z.string(), z.number(), z.null()]).optional(),
});

export const updateProgressSchema = z.object({
  currentStep: z.number().int().min(0),
});

export const otpVerificationSchema = z.object({
  email: emailSchema,
  otp: z.string().length(6, "OTP must be 6 digits").regex(/^\d{6}$/, "OTP must contain only digits"),
});

export const otpRequestSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  company: z.string().min(1).max(255).optional(),
  jobTitle: z.string().min(1).max(100).optional(),
});

export const contactRegistrationSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  company: z.string().min(1, "Company name is required").max(255),
  jobTitle: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  marketingConsent: z.boolean().optional().default(false),
});

export const updateAssessmentSchema = z.object({
  status: z.enum(["in_progress", "completed", "processing", "analysed", "report_generated"]).optional(),
  currentStep: z.number().int().min(0).optional(),
  completedAt: z.date().optional(),
});

export const questionQuerySchema = z.object({
  tier: assessmentTierSchema.optional(),
  dimension: dimensionSchema.optional(),
  isActive: z.coerce.boolean().optional(),
});

export const reportGenerationSchema = z.object({
  format: z.enum(["pdf", "pptx", "executive_summary"]).optional().default("pdf"),
  includeRoadmap: z.boolean().optional().default(true),
  includeVendorAnalysis: z.boolean().optional().default(true),
});

export const adminAssessmentQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  tier: assessmentTierSchema.optional(),
  search: z.string().max(255).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "status", "tier"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const inlineEditSchema = z.object({
  questionId: z.string().min(1),
  newResponse: z.union([
    z.string(),
    z.number(),
    z.array(z.string()),
    z.record(z.unknown()),
  ]),
  rawValue: z.union([z.string(), z.number(), z.null()]).optional(),
});

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errorMessage = result.error.issues
    .map(issue => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  return { success: false, error: errorMessage };
}
