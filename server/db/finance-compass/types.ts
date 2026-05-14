/**
 * Database Layer Types for FinanceCompass
 * 
 * These types map database records to domain types.
 * They handle the translation between database representation
 * and domain model representation.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type {
  FcAssessment,
  FcContact,
  FcCompany,
  FcQuestion,
  FcResponse,
  FcReport,
  FcRoiProfile,
} from '@shared/finance-compass-schema';

// Re-export database types for use in repositories
export type {
  FcAssessment,
  FcContact,
  FcCompany,
  FcQuestion,
  FcResponse,
  FcReport,
  FcRoiProfile,
};

// Database to Domain mappers
export type DbAssessment = FcAssessment;
export type DbContact = FcContact;
export type DbCompany = FcCompany;
export type DbQuestion = FcQuestion;
export type DbResponse = FcResponse;
export type DbReport = FcReport;
export type DbRoiProfile = FcRoiProfile;
