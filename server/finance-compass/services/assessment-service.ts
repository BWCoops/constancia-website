/**
 * FinanceCompass Assessment Service
 * 
 * Centralized service for assessment lifecycle management.
 * Handles creation, state transitions, and completion logic.
 */

import { createChildLogger } from "../../lib/logger";
import { fcStorage } from "../storage";
import type { InsertFcAssessment, FCAssessmentStatus } from "@shared/finance-compass-schema";

const log = createChildLogger("assessment-service");

export interface AssessmentCreateParams {
  tier: "registration" | "pre_assessment" | "full";
  contactId?: string;
  companyId?: string;
}

export interface AssessmentResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class AssessmentService {
  async createAssessment(params: AssessmentCreateParams): Promise<AssessmentResult> {
    try {
      const assessmentData: InsertFcAssessment = {
        tier: params.tier,
        status: "in_progress",
        contactId: params.contactId || null,
        companyId: params.companyId || null,
        currentStep: 0,
      };

      const assessment = await fcStorage.createAssessment(assessmentData);
      
      return {
        success: true,
        data: assessment,
      };
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Failed to create assessment");
      return {
        success: false,
        error: "Failed to create assessment",
      };
    }
  }

  async getAssessmentById(id: string): Promise<AssessmentResult> {
    try {
      const assessment = await fcStorage.getAssessmentById(id);
      if (!assessment) {
        return { success: false, error: "Assessment not found" };
      }
      return { success: true, data: assessment };
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Failed to get assessment");
      return { success: false, error: "Failed to retrieve assessment" };
    }
  }

  async updateAssessmentStatus(id: string, status: FCAssessmentStatus): Promise<AssessmentResult> {
    try {
      const updates: Partial<InsertFcAssessment> = { status };
      
      if (status === "completed") {
        updates.completedAt = new Date();
      }
      
      const assessment = await fcStorage.updateAssessment(id, updates);
      if (!assessment) {
        return { success: false, error: "Assessment not found" };
      }
      
      return { success: true, data: assessment };
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Failed to update status");
      return { success: false, error: "Failed to update assessment status" };
    }
  }

  async submitResponse(
    assessmentId: string,
    questionId: string,
    response: any,
    rawValue?: string | number | null
  ): Promise<AssessmentResult> {
    try {
      const assessment = await fcStorage.getAssessmentById(assessmentId);
      if (!assessment) {
        return { success: false, error: "Assessment not found" };
      }

      if (assessment.status !== "in_progress") {
        return { success: false, error: "Assessment is not in progress" };
      }

      const existingResponses = await fcStorage.getResponsesByAssessmentId(assessmentId);
      const existingResponse = existingResponses.find(r => r.questionId === questionId);

      const responseData = {
        assessmentId,
        questionId,
        response,
        rawValue: rawValue !== undefined ? String(rawValue) : null,
        tier: assessment.tier,
      };

      const savedResponse = existingResponse
        ? await fcStorage.upsertResponse(responseData)
        : await fcStorage.createResponse(responseData);

      return { success: true, data: savedResponse };
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Failed to submit response");
      return { success: false, error: "Failed to submit response" };
    }
  }

  async getResponses(assessmentId: string): Promise<AssessmentResult> {
    try {
      const responses = await fcStorage.getResponsesByAssessmentId(assessmentId);
      return { success: true, data: responses };
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Failed to get responses");
      return { success: false, error: "Failed to retrieve responses" };
    }
  }

  async completeAssessment(assessmentId: string): Promise<AssessmentResult> {
    try {
      const assessment = await fcStorage.getAssessmentById(assessmentId);
      if (!assessment) {
        return { success: false, error: "Assessment not found" };
      }

      const result = await this.updateAssessmentStatus(assessmentId, "completed");
      return result;
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Failed to complete assessment");
      return { success: false, error: "Failed to complete assessment" };
    }
  }

  async deleteAssessment(assessmentId: string): Promise<AssessmentResult> {
    try {
      await fcStorage.deleteAssessment(assessmentId);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Failed to delete assessment");
      return { success: false, error: "Failed to delete assessment" };
    }
  }
}

export const assessmentService = new AssessmentService();
