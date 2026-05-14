/**
 * FinanceCompass Question Seeding
 * 
 * Seeds the database with questions from the question bank.
 * Implements idempotent upsert logic.
 */

import { db } from "../db";
import { eq } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import { fcQuestions, type InsertFcQuestion } from "@shared/finance-compass-schema";
import { ALL_QUESTIONS, REGISTRATION_QUESTIONS, type QuestionDefinition } from "./question-bank";

const log = createChildLogger("seed-questions");

// ALL_QUESTIONS_FOR_SEEDING includes both assessment questions AND registration questions
// This ensures all questions are synced to the database
const ALL_QUESTIONS_FOR_SEEDING: QuestionDefinition[] = [
  ...REGISTRATION_QUESTIONS,
  ...ALL_QUESTIONS
];

function mapQuestionBankToDatabase(q: QuestionDefinition): InsertFcQuestion {
  // Store sliderConfig and structuredFields in the validation field
  const validation: any = {};
  if (q.sliderConfig) {
    validation.sliderConfig = q.sliderConfig;
  }
  if (q.structuredFields) {
    validation.structuredFields = q.structuredFields;
  }
  
  return {
    questionKey: q.id,
    prompt: q.questionText,
    sequence: q.order,
    type: q.questionType,
    isRequired: q.required,
    options: q.options || null,
    dimension: q.dimension,
    tier: q.tier,
    helpText: q.helpText || null,
    scoringConfig: q.scoringConfig || null,
    validation: Object.keys(validation).length > 0 ? validation : null,
    isActive: true,
    isAdaptive: false,
  };
}

export async function seedQuestions(): Promise<{ seeded: number; updated: number; total: number }> {
  let seeded = 0;
  let updated = 0;
  
  for (const question of ALL_QUESTIONS_FOR_SEEDING) {
    const data = mapQuestionBankToDatabase(question);
    
    const [existing] = await db
      .select()
      .from(fcQuestions)
      .where(eq(fcQuestions.questionKey, data.questionKey))
      .limit(1);
    
    if (existing) {
      await db
        .update(fcQuestions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(fcQuestions.id, existing.id));
      updated++;
    } else {
      await db.insert(fcQuestions).values(data);
      seeded++;
    }
  }
  
  log.info({ seeded, updated, total: ALL_QUESTIONS_FOR_SEEDING.length }, "Question seeding complete");
  
  return {
    seeded,
    updated,
    total: ALL_QUESTIONS_FOR_SEEDING.length,
  };
}

export async function getQuestionBankCount(): Promise<number> {
  // Return the actual database count, not the in-memory question bank size
  const result = await db.select().from(fcQuestions);
  return result.length;
}

export function getInMemoryQuestionCount(): number {
  return ALL_QUESTIONS_FOR_SEEDING.length;
}

export function getQuestionBankByTier(tier: string): QuestionDefinition[] {
  return ALL_QUESTIONS.filter(q => q.tier === tier).sort((a, b) => a.order - b.order);
}

export function transformQuestionBankToApiFormat(questions: QuestionDefinition[]) {
  return questions.map(q => ({
    id: q.id,
    questionKey: q.id,
    prompt: q.questionText,
    sequence: q.order,
    type: q.questionType,
    isRequired: q.required,
    options: q.options || null,
    dimension: q.dimension,
    tier: q.tier,
    helpText: q.helpText || null,
    scoringConfig: q.scoringConfig || null,
    isActive: true,
    isAdaptive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

// Main execution block when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedQuestions()
    .then(result => {
      log.info({ seeded: result.seeded, updated: result.updated, total: result.total }, "Seeding complete");
      process.exit(0);
    })
    .catch(error => {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Seed failed");
      process.exit(1);
    });
}
