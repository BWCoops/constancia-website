/**
 * Financial Scenario Modelling Service
 * 
 * Provides scenario creation, projection calculations, and comparison
 * for FinanceCompass finance transformation assessments.
 */

import { z } from "zod";
import { db } from "../../db";
import { 
  fcScenarios, 
  fcScenarioAssumptions,
  type InsertFcScenario,
  type FcScenario,
  type InsertFcScenarioAssumption,
  type FcScenarioAssumption,
} from "@shared/finance-compass-schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("scenario-service");

// Input validation schemas
const scenarioCreateSchema = z.object({
  assessmentId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  scenarioType: z.enum(["baseline", "conservative", "moderate", "aggressive", "custom"]).default("baseline"),
  baseYear: z.number().int().min(2020).max(2050),
  projectionYears: z.number().int().min(1).max(20).default(5),
  isBaseline: z.boolean().optional().default(false),
  createdBy: z.string().optional(),
});

const scenarioUpdateSchema = scenarioCreateSchema.partial();

const assumptionSchema = z.object({
  scenarioId: z.string().uuid(),
  category: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  value: z.number().finite(),
  unit: z.string().max(50).optional(),
  minValue: z.number().finite().optional(),
  maxValue: z.number().finite().optional(),
  isEditable: z.boolean().optional().default(true),
  dependsOn: z.string().max(500).optional(),
  formula: z.string().max(1000).optional(),
  order: z.number().int().min(0).max(1000).optional().default(0),
});

const assumptionUpdateSchema = assumptionSchema.partial().omit({ scenarioId: true });

interface ProjectionResult {
  years: number[];
  costs: number[];
  benefits: number[];
  netCashFlow: number[];
  cumulativeCashFlow: number[];
  npv: number;
  irr: number | null;
  paybackMonths: number | null;
  roi: number;
}

interface ScenarioComparison {
  scenarios: FcScenario[];
  metrics: {
    scenarioId: string;
    name: string;
    npv: number;
    irr: number | null;
    paybackMonths: number | null;
    totalCost: number;
    totalBenefit: number;
    roi: number;
  }[];
  recommendation: string;
}

export class ScenarioService {
  
  async create(data: InsertFcScenario): Promise<FcScenario> {
    // Validate input
    const validated = scenarioCreateSchema.parse(data);
    
    try {
      const [scenario] = await db.insert(fcScenarios)
        .values(validated)
        .returning();
      
      return scenario;
    } catch (error) {
      log.error({ err: error }, "Create error");
      throw new Error("Failed to create scenario");
    }
  }

  async update(id: string, data: Partial<InsertFcScenario>): Promise<FcScenario | null> {
    if (!id || typeof id !== 'string') {
      throw new Error("Invalid scenario ID");
    }

    // Validate input
    const validated = scenarioUpdateSchema.parse(data);
    
    try {
      const [updated] = await db.update(fcScenarios)
        .set({ ...validated, updatedAt: new Date() })
        .where(eq(fcScenarios.id, id))
        .returning();
      
      return updated || null;
    } catch (error) {
      log.error({ err: error }, "Update error");
      throw new Error("Failed to update scenario");
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!id || typeof id !== 'string') {
      throw new Error("Invalid scenario ID");
    }

    try {
      await db.delete(fcScenarioAssumptions)
        .where(eq(fcScenarioAssumptions.scenarioId, id));
      
      const result = await db.delete(fcScenarios)
        .where(eq(fcScenarios.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      log.error({ err: error }, "Delete error");
      throw new Error("Failed to delete scenario");
    }
  }

  async getById(id: string): Promise<FcScenario | null> {
    if (!id || typeof id !== 'string') {
      return null;
    }

    try {
      const [scenario] = await db.select()
        .from(fcScenarios)
        .where(eq(fcScenarios.id, id));
      
      return scenario || null;
    } catch (error) {
      log.error({ err: error }, "GetById error");
      return null;
    }
  }

  async getByAssessment(assessmentId: string): Promise<FcScenario[]> {
    if (!assessmentId || typeof assessmentId !== 'string') {
      return [];
    }

    try {
      return db.select()
        .from(fcScenarios)
        .where(eq(fcScenarios.assessmentId, assessmentId))
        .orderBy(asc(fcScenarios.createdAt));
    } catch (error) {
      log.error({ err: error }, "GetByAssessment error");
      return [];
    }
  }

  async getByCompany(companyId: string): Promise<FcScenario[]> {
    if (!companyId || typeof companyId !== 'string') {
      return [];
    }

    try {
      return db.select()
        .from(fcScenarios)
        .where(eq(fcScenarios.companyId, companyId))
        .orderBy(desc(fcScenarios.createdAt));
    } catch (error) {
      log.error({ err: error }, "GetByCompany error");
      return [];
    }
  }

  async addAssumption(data: InsertFcScenarioAssumption): Promise<FcScenarioAssumption> {
    // Validate input
    const validated = assumptionSchema.parse(data);
    
    try {
      const [assumption] = await db.insert(fcScenarioAssumptions)
        .values(validated)
        .returning();
      
      return assumption;
    } catch (error) {
      log.error({ err: error }, "AddAssumption error");
      throw new Error("Failed to add assumption");
    }
  }

  async updateAssumption(id: string, data: Partial<InsertFcScenarioAssumption>): Promise<FcScenarioAssumption | null> {
    if (!id || typeof id !== 'string') {
      throw new Error("Invalid assumption ID");
    }

    // Validate input (excluding scenarioId which shouldn't be updated)
    const validated = assumptionUpdateSchema.parse(data);
    
    try {
      const [updated] = await db.update(fcScenarioAssumptions)
        .set(validated)
        .where(eq(fcScenarioAssumptions.id, id))
        .returning();
      
      return updated || null;
    } catch (error) {
      log.error({ err: error }, "UpdateAssumption error");
      throw new Error("Failed to update assumption");
    }
  }

  async deleteAssumption(id: string): Promise<boolean> {
    if (!id || typeof id !== 'string') {
      throw new Error("Invalid assumption ID");
    }

    try {
      const result = await db.delete(fcScenarioAssumptions)
        .where(eq(fcScenarioAssumptions.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      log.error({ err: error }, "DeleteAssumption error");
      throw new Error("Failed to delete assumption");
    }
  }

  async getAssumptions(scenarioId: string): Promise<FcScenarioAssumption[]> {
    if (!scenarioId || typeof scenarioId !== 'string') {
      return [];
    }

    try {
      return db.select()
        .from(fcScenarioAssumptions)
        .where(eq(fcScenarioAssumptions.scenarioId, scenarioId))
        .orderBy(asc(fcScenarioAssumptions.order), asc(fcScenarioAssumptions.category));
    } catch (error) {
      log.error({ err: error }, "GetAssumptions error");
      return [];
    }
  }

  async getAssumptionsByCategory(scenarioId: string): Promise<Record<string, FcScenarioAssumption[]>> {
    const assumptions = await this.getAssumptions(scenarioId);
    
    const grouped: Record<string, FcScenarioAssumption[]> = {};
    for (const assumption of assumptions) {
      if (!grouped[assumption.category]) {
        grouped[assumption.category] = [];
      }
      grouped[assumption.category].push(assumption);
    }
    
    return grouped;
  }

  async calculateProjections(scenarioId: string): Promise<ProjectionResult> {
    const scenario = await this.getById(scenarioId);
    if (!scenario) {
      throw new Error("Scenario not found");
    }

    const assumptions = await this.getAssumptionsByCategory(scenarioId);
    
    // Validate scenario data
    const projectionYears = Math.max(1, Math.min(scenario.projectionYears || 5, 20));
    const baseYear = scenario.baseYear || new Date().getFullYear();
    
    const years = Array.from({ length: projectionYears }, (_, i) => baseYear + i);
    const discountRate = this.safeGetAssumptionValue(assumptions, "cost", "discount_rate", 0.10);
    
    // Ensure discount rate is reasonable
    const safeDiscountRate = Math.max(0, Math.min(discountRate, 1));
    
    const costs: number[] = [];
    const benefits: number[] = [];
    
    try {
      for (let year = 0; year < projectionYears; year++) {
        const yearCosts = this.calculateYearCosts(assumptions, year, projectionYears);
        const yearBenefits = this.calculateYearBenefits(assumptions, year, projectionYears);
        
        // Ensure non-negative and finite values
        costs.push(Math.max(0, isFinite(yearCosts) ? yearCosts : 0));
        benefits.push(Math.max(0, isFinite(yearBenefits) ? yearBenefits : 0));
      }
      
      const netCashFlow = years.map((_, i) => benefits[i] - costs[i]);
      
      const cumulativeCashFlow: number[] = [];
      let cumulative = 0;
      for (const cf of netCashFlow) {
        cumulative += cf;
        cumulativeCashFlow.push(cumulative);
      }
      
      const npv = this.calculateNPV(netCashFlow, safeDiscountRate);
      const irr = this.calculateIRR(netCashFlow);
      const paybackMonths = this.calculatePayback(netCashFlow);
      const totalCost = costs.reduce((sum, c) => sum + c, 0);
      const totalBenefit = benefits.reduce((sum, b) => sum + b, 0);
      const roi = totalCost > 0 ? ((totalBenefit - totalCost) / totalCost) * 100 : 0;
      
      // Update scenario with calculated projections
      await this.update(scenarioId, {
        projections: { years, costs, benefits, netCashFlow, cumulativeCashFlow },
        npv: isFinite(npv) ? npv : 0,
        irr: irr !== null && isFinite(irr) ? irr : null,
        paybackMonths: paybackMonths !== null && isFinite(paybackMonths) ? paybackMonths : null,
        totalCost: isFinite(totalCost) ? totalCost : 0,
        totalBenefit: isFinite(totalBenefit) ? totalBenefit : 0,
      } as any);

      return {
        years,
        costs,
        benefits,
        netCashFlow,
        cumulativeCashFlow,
        npv: isFinite(npv) ? npv : 0,
        irr: irr !== null && isFinite(irr) ? irr : null,
        paybackMonths: paybackMonths !== null && isFinite(paybackMonths) ? paybackMonths : null,
        roi: isFinite(roi) ? roi : 0,
      };
    } catch (error) {
      log.error({ err: error }, "CalculateProjections error");
      throw new Error("Failed to calculate projections: malformed input data");
    }
  }

  async compareScenarios(scenarioIds: string[]): Promise<ScenarioComparison> {
    // Validate input
    if (!Array.isArray(scenarioIds) || scenarioIds.length < 2) {
      throw new Error("At least 2 scenario IDs are required for comparison");
    }
    
    // Limit to reasonable number of scenarios
    const limitedIds = scenarioIds.slice(0, 10);
    
    const scenarios: FcScenario[] = [];
    const metrics: ScenarioComparison["metrics"] = [];
    
    for (const id of limitedIds) {
      if (!id || typeof id !== 'string') continue;
      
      const scenario = await this.getById(id);
      if (!scenario) continue;
      
      scenarios.push(scenario);
      
      const totalCost = scenario.totalCost || 0;
      const totalBenefit = scenario.totalBenefit || 0;
      const roi = totalCost > 0 ? ((totalBenefit - totalCost) / totalCost) * 100 : 0;
      
      metrics.push({
        scenarioId: scenario.id,
        name: scenario.name,
        npv: scenario.npv || 0,
        irr: scenario.irr,
        paybackMonths: scenario.paybackMonths,
        totalCost,
        totalBenefit,
        roi: isFinite(roi) ? roi : 0,
      });
    }
    
    metrics.sort((a, b) => b.npv - a.npv);
    
    let recommendation = "";
    if (metrics.length > 0) {
      const best = metrics[0];
      recommendation = `Based on NPV analysis, "${best.name}" offers the highest value with an NPV of £${best.npv.toLocaleString()}`;
      
      if (best.irr !== null) {
        recommendation += ` and an IRR of ${(best.irr * 100).toFixed(1)}%`;
      }
      
      if (best.paybackMonths !== null) {
        const years = Math.floor(best.paybackMonths / 12);
        const months = best.paybackMonths % 12;
        recommendation += `. Payback period: ${years > 0 ? years + " years " : ""}${months} months`;
      }
      
      recommendation += ".";
    }

    return {
      scenarios,
      metrics,
      recommendation,
    };
  }

  async cloneScenario(scenarioId: string, newName: string, createdBy?: string): Promise<FcScenario> {
    if (!scenarioId || typeof scenarioId !== 'string') {
      throw new Error("Invalid scenario ID");
    }
    if (!newName || typeof newName !== 'string' || newName.length > 200) {
      throw new Error("Invalid scenario name");
    }

    const original = await this.getById(scenarioId);
    if (!original) {
      throw new Error("Scenario not found");
    }

    const originalAssumptions = await this.getAssumptions(scenarioId);
    
    try {
      const [cloned] = await db.insert(fcScenarios).values({
        assessmentId: original.assessmentId,
        companyId: original.companyId,
        name: newName.slice(0, 200),
        description: `Clone of ${original.name}`,
        scenarioType: original.scenarioType,
        baseYear: original.baseYear,
        projectionYears: original.projectionYears,
        assumptions: original.assumptions,
        isBaseline: false,
        createdBy,
      }).returning();
      
      for (const assumption of originalAssumptions) {
        await db.insert(fcScenarioAssumptions).values({
          scenarioId: cloned.id,
          category: assumption.category,
          name: assumption.name,
          description: assumption.description,
          value: assumption.value,
          unit: assumption.unit,
          minValue: assumption.minValue,
          maxValue: assumption.maxValue,
          isEditable: assumption.isEditable,
          dependsOn: assumption.dependsOn,
          formula: assumption.formula,
          order: assumption.order,
        });
      }

      return cloned;
    } catch (error) {
      log.error({ err: error }, "CloneScenario error");
      throw new Error("Failed to clone scenario");
    }
  }

  async createDefaultAssumptions(scenarioId: string): Promise<FcScenarioAssumption[]> {
    if (!scenarioId || typeof scenarioId !== 'string') {
      throw new Error("Invalid scenario ID");
    }

    const defaultAssumptions: Omit<InsertFcScenarioAssumption, "scenarioId">[] = [
      { category: "cost", name: "implementation_cost", description: "Initial implementation cost", value: 500000, unit: "GBP", order: 1 },
      { category: "cost", name: "annual_license", description: "Annual software licensing", value: 100000, unit: "GBP/year", order: 2 },
      { category: "cost", name: "training_cost", description: "Staff training investment", value: 50000, unit: "GBP", order: 3 },
      { category: "cost", name: "change_management", description: "Change management costs", value: 75000, unit: "GBP", order: 4 },
      { category: "cost", name: "discount_rate", description: "Cost of capital / discount rate", value: 0.10, unit: "%", order: 5 },
      { category: "benefit", name: "fte_savings", description: "Annual FTE cost savings", value: 150000, unit: "GBP/year", order: 1 },
      { category: "benefit", name: "process_efficiency", description: "Process efficiency gains", value: 100000, unit: "GBP/year", order: 2 },
      { category: "benefit", name: "error_reduction", description: "Error reduction savings", value: 50000, unit: "GBP/year", order: 3 },
      { category: "benefit", name: "faster_close", description: "Faster close cycle benefits", value: 75000, unit: "GBP/year", order: 4 },
      { category: "timeline", name: "implementation_months", description: "Implementation duration", value: 12, unit: "months", order: 1 },
      { category: "timeline", name: "benefit_ramp_months", description: "Months to full benefit realisation", value: 18, unit: "months", order: 2 },
      { category: "growth", name: "benefit_growth_rate", description: "Annual benefit growth rate", value: 0.05, unit: "%", order: 1 },
      { category: "risk", name: "implementation_risk", description: "Implementation risk factor", value: 0.15, unit: "%", order: 1 },
    ];

    const created: FcScenarioAssumption[] = [];
    for (const assumption of defaultAssumptions) {
      try {
        const result = await this.addAssumption({ ...assumption, scenarioId });
        created.push(result);
      } catch (error) {
        log.error({ err: error }, "Failed to create default assumption");
        // Continue with other assumptions
      }
    }

    return created;
  }

  private safeGetAssumptionValue(
    assumptions: Record<string, FcScenarioAssumption[]>,
    category: string,
    name: string,
    defaultValue: number
  ): number {
    try {
      const categoryAssumptions = assumptions[category] || [];
      const found = categoryAssumptions.find(a => a.name === name);
      const value = found?.value;
      return value !== null && value !== undefined && isFinite(value) ? value : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private getAssumptionValue(
    assumptions: Record<string, FcScenarioAssumption[]>,
    category: string,
    name: string
  ): number | null {
    try {
      const categoryAssumptions = assumptions[category] || [];
      const found = categoryAssumptions.find(a => a.name === name);
      return found?.value !== null && found?.value !== undefined && isFinite(found.value) ? found.value : null;
    } catch {
      return null;
    }
  }

  private calculateYearCosts(
    assumptions: Record<string, FcScenarioAssumption[]>,
    year: number,
    totalYears: number
  ): number {
    try {
      let costs = 0;
      
      if (year === 0) {
        costs += this.getAssumptionValue(assumptions, "cost", "implementation_cost") || 0;
        costs += this.getAssumptionValue(assumptions, "cost", "training_cost") || 0;
        costs += this.getAssumptionValue(assumptions, "cost", "change_management") || 0;
      }
      
      costs += this.getAssumptionValue(assumptions, "cost", "annual_license") || 0;
      
      const riskFactor = this.getAssumptionValue(assumptions, "risk", "implementation_risk") || 0;
      const safeRiskFactor = Math.max(0, Math.min(riskFactor, 1));
      costs *= (1 + safeRiskFactor);

      return isFinite(costs) ? costs : 0;
    } catch {
      return 0;
    }
  }

  private calculateYearBenefits(
    assumptions: Record<string, FcScenarioAssumption[]>,
    year: number,
    totalYears: number
  ): number {
    try {
      const implMonths = this.getAssumptionValue(assumptions, "timeline", "implementation_months") || 12;
      const rampMonths = this.getAssumptionValue(assumptions, "timeline", "benefit_ramp_months") || 18;
      const growthRate = this.getAssumptionValue(assumptions, "growth", "benefit_growth_rate") || 0.05;
      
      // Ensure reasonable bounds
      const safeGrowthRate = Math.max(-0.5, Math.min(growthRate, 1));
      
      const monthsFromStart = (year + 1) * 12;
      let benefitMultiplier = 0;
      
      if (monthsFromStart <= implMonths) {
        benefitMultiplier = 0;
      } else if (monthsFromStart <= implMonths + rampMonths) {
        benefitMultiplier = (monthsFromStart - implMonths) / Math.max(1, rampMonths);
      } else {
        benefitMultiplier = 1;
      }
      
      const baseBenefits = (
        (this.getAssumptionValue(assumptions, "benefit", "fte_savings") || 0) +
        (this.getAssumptionValue(assumptions, "benefit", "process_efficiency") || 0) +
        (this.getAssumptionValue(assumptions, "benefit", "error_reduction") || 0) +
        (this.getAssumptionValue(assumptions, "benefit", "faster_close") || 0)
      );
      
      const growthMultiplier = Math.pow(1 + safeGrowthRate, Math.max(0, year - 1));
      
      const result = baseBenefits * benefitMultiplier * growthMultiplier;
      return isFinite(result) ? result : 0;
    } catch {
      return 0;
    }
  }

  private calculateNPV(cashFlows: number[], discountRate: number): number {
    try {
      const safeRate = Math.max(0, Math.min(discountRate, 1));
      return cashFlows.reduce((npv, cf, year) => {
        const discounted = cf / Math.pow(1 + safeRate, year + 1);
        return npv + (isFinite(discounted) ? discounted : 0);
      }, 0);
    } catch {
      return 0;
    }
  }

  private calculateIRR(cashFlows: number[], maxIterations = 1000, tolerance = 0.0001): number | null {
    try {
      if (!Array.isArray(cashFlows) || cashFlows.length === 0) {
        return null;
      }
      
      if (cashFlows.every(cf => cf >= 0) || cashFlows.every(cf => cf <= 0)) {
        return null;
      }

      let guess = 0.1;
      
      for (let i = 0; i < maxIterations; i++) {
        let npv = 0;
        let dnpv = 0;
        
        for (let j = 0; j < cashFlows.length; j++) {
          const denominator = Math.pow(1 + guess, j + 1);
          if (!isFinite(denominator) || denominator === 0) continue;
          
          npv += cashFlows[j] / denominator;
          dnpv -= (j + 1) * cashFlows[j] / Math.pow(1 + guess, j + 2);
        }
        
        if (Math.abs(dnpv) < tolerance || !isFinite(dnpv)) {
          return null;
        }
        
        const newGuess = guess - npv / dnpv;
        
        if (!isFinite(newGuess)) {
          return null;
        }
        
        if (Math.abs(newGuess - guess) < tolerance) {
          return isFinite(newGuess) ? newGuess : null;
        }
        
        guess = newGuess;
        
        if (guess < -0.99 || guess > 10) {
          return null;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  private calculatePayback(cashFlows: number[]): number | null {
    try {
      if (!Array.isArray(cashFlows) || cashFlows.length === 0) {
        return null;
      }
      
      let cumulative = 0;
      
      for (let month = 0; month < cashFlows.length * 12; month++) {
        const yearIndex = Math.floor(month / 12);
        if (yearIndex >= cashFlows.length) break;
        
        cumulative += cashFlows[yearIndex] / 12;
        
        if (cumulative >= 0) {
          return month + 1;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  async getStats(companyId?: string): Promise<{
    total: number;
    byType: Record<string, number>;
    averageNPV: number;
    averagePayback: number | null;
  }> {
    try {
      const conditions = companyId ? [eq(fcScenarios.companyId, companyId)] : [];
      
      const scenarios = await db.select()
        .from(fcScenarios)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      
      const byType: Record<string, number> = {};
      let totalNPV = 0;
      let npvCount = 0;
      let totalPayback = 0;
      let paybackCount = 0;
      
      for (const scenario of scenarios) {
        byType[scenario.scenarioType] = (byType[scenario.scenarioType] || 0) + 1;
        
        if (scenario.npv !== null && isFinite(scenario.npv)) {
          totalNPV += scenario.npv;
          npvCount++;
        }
        
        if (scenario.paybackMonths !== null && isFinite(scenario.paybackMonths)) {
          totalPayback += scenario.paybackMonths;
          paybackCount++;
        }
      }

      return {
        total: scenarios.length,
        byType,
        averageNPV: npvCount > 0 ? totalNPV / npvCount : 0,
        averagePayback: paybackCount > 0 ? Math.round(totalPayback / paybackCount) : null,
      };
    } catch (error) {
      log.error({ err: error }, "GetStats error");
      return {
        total: 0,
        byType: {},
        averageNPV: 0,
        averagePayback: null,
      };
    }
  }
}

export const scenarioService = new ScenarioService();
