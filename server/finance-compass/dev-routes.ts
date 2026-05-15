/**
 * FinanceCompass Dev Routes
 * 
 * Development-only endpoints for testing and validation.
 * These routes are only registered when NODE_ENV === "development".
 */

import { Router, type Request, type Response } from "express";
import { createChildLogger } from "../lib/logger";
import { fcStorage } from "./storage";

const log = createChildLogger("fc-dev-routes");
import type { FCAssessmentTier } from "@shared/finance-compass-schema";
import {
  analysePreAssessment,
  analyseFullAssessment,
  type AnalysisResult,
} from "./ai-service";
import { clearNarrativeCache, generateAllNarratives, generateStakeholderNarrative, normalizeDimensionScores } from "./report-narrative-service";

// NATS (National Air Traffic Services) test profile
// Public sector aviation services organization with critical infrastructure requirements
const NATS_TEST_DATA = {
  company: {
    name: "NATS Holdings Limited",
    companyNumber: "04138252",
    sector: "Transportation & Logistics",
    sicCode: "5223",
    revenue: 900000000,
    employees: 4500,
    headquarters: "Hampshire, UK",
    financeCostPercentage: 1.8,
  },
  contact: {
    firstName: "James",
    lastName: "Mitchell",
    email: "test.finance@nats-test.example.com",
    roleTitle: "Finance Director",
    businessPhone: "+44 1489 612345",
    priorities: ["consolidation", "analytics", "ai"],
  },
  preAssessmentResponses: [
    { questionKey: "q2_annual_revenue", response: "500m_plus" },
    { questionKey: "q2_finance_team_size", response: { finance_fte: 45, finance_budget: 8000 } },
    { questionKey: "q2_transformation_budget", response: "500k_plus" },
    { questionKey: "q2_project_timeline", response: "next_12_months" },
    { questionKey: "q2_current_systems", response: ["sap", "oracle", "excel"] },
    { questionKey: "q2_consolidation_centralisation", response: "mostly_centralised" },
    { questionKey: "q2_close_cycle", response: 8 },
    { questionKey: "q2_close_reliability", response: "mostly" },
    { questionKey: "q2_manual_consolidation", response: "moderate" },
    { questionKey: "q2_reporting_centralisation", response: "mostly_centralised" },
    { questionKey: "q2_reporting_cycle", response: 3 },
    { questionKey: "q2_reporting_manual", response: "moderate" },
    { questionKey: "q2_self_service", response: "moderate" },
    { questionKey: "q2_data_visualisation", response: "moderate" },
    { questionKey: "q2_planning_centralisation", response: "mixed" },
    { questionKey: "q2_planning_cycle", response: 16 },
    { questionKey: "q2_forecast_frequency", response: "monthly" },
    { questionKey: "q2_scenario_planning", response: "moderate" },
    { questionKey: "q2_multi_currency", response: "multiple" },
    { questionKey: "q2_intercompany", response: "moderate" },
    { questionKey: "q2_regulatory", response: "extensive" },
    { questionKey: "q2_data_accuracy", response: "high" },
    { questionKey: "q2_data_integration", response: "moderate" },
    { questionKey: "q2_erp_landscape", response: "multiple_legacy" },
    { questionKey: "q2_planning_tools", response: "limited_epm" },
    { questionKey: "q2_cloud_adoption", response: "moderate" },
    { questionKey: "q2_automation", response: "moderate" },
    { questionKey: "q2_change_capacity", response: "moderate" },
    { questionKey: "q2_skills_gap", response: "moderate" },
    { questionKey: "q2_planning_reporting_time", response: 4 },
    { questionKey: "q2_epm_priority_focus", response: ["consolidation_close", "compliance_controls", "ai_automation"] },
    { questionKey: "q2_erp_selection_priorities", response: ["compliance", "integration", "scalability"] },
    { questionKey: "q2_ai_tool_priorities", response: ["predictive_analytics", "anomaly_detection", "process_automation"] },
    { questionKey: "q2_current_epm_vendor", response: ["oracle_epm"] },
  ],
  expectedScores: {
    overall: 3.5,
    filingSpeed: 3.0,
    closeCycle: 3.5,
    amendmentRate: 2.5,
    dso: 3.0,
    dataQuality: 4.0,
    marginStability: 3.5,
    auditReadiness: 4.0,
    technology: 3.0,
  },
};

// Constancia Group Limited - Small professional services consultancy
// Expert EPM/finance transformation advisory with 5 employees
const ONEQG_TEST_DATA = {
  company: {
    name: "Constancia Group Limited",
    companyNumber: "12345678",
    sector: "Professional Services",
    sicCode: "7022",
    revenue: 500000, // £500k
    employees: 5,
    headquarters: "London, UK",
    financeCostPercentage: 3.5,
  },
  contact: {
    firstName: "Bradley",
    lastName: "Cooper",
    email: "bradley.cooper@constancia.io",
    roleTitle: "Managing Director",
    businessPhone: "+44 20 7946 0958",
    priorities: ["ai_automation", "planning_forecasting", "reporting_viz"],
  },
  // Pre-assessment responses for small professional services firm with high expertise
  preAssessmentResponses: [
    { questionKey: "q2_annual_revenue", response: "under_10m" },
    { questionKey: "q2_finance_team_size", response: { finance_fte: 1, finance_budget: 25 } },
    { questionKey: "q2_transformation_budget", response: "under_50k" },
    { questionKey: "q2_project_timeline", response: "next_6_months" },
    { questionKey: "q2_current_systems", response: ["excel", "xero"] },
    { questionKey: "q2_consolidation_centralisation", response: "fully_centralised" },
    { questionKey: "q2_close_cycle", response: 3 },
    { questionKey: "q2_close_reliability", response: "always" },
    { questionKey: "q2_manual_consolidation", response: "low" },
    { questionKey: "q2_reporting_centralisation", response: "fully_centralised" },
    { questionKey: "q2_reporting_cycle", response: 2 },
    { questionKey: "q2_reporting_manual", response: "moderate" },
    { questionKey: "q2_self_service", response: "good" },
    { questionKey: "q2_data_visualisation", response: "good" },
    { questionKey: "q2_planning_centralisation", response: "fully_centralised" },
    { questionKey: "q2_planning_cycle", response: 5 },
    { questionKey: "q2_forecast_frequency", response: "monthly" },
    { questionKey: "q2_scenario_planning", response: "good" },
    { questionKey: "q2_multi_currency", response: "single" },
    { questionKey: "q2_intercompany", response: "none" },
    { questionKey: "q2_regulatory", response: "minimal" },
    { questionKey: "q2_data_accuracy", response: "high" },
    { questionKey: "q2_data_integration", response: "good" },
    { questionKey: "q2_erp_landscape", response: "cloud_modern" },
    { questionKey: "q2_planning_tools", response: "spreadsheet" },
    { questionKey: "q2_cloud_adoption", response: "advanced" },
    { questionKey: "q2_automation", response: "moderate" },
    { questionKey: "q2_change_capacity", response: "high" },
    { questionKey: "q2_skills_gap", response: "minor" },
    { questionKey: "q2_planning_reporting_time", response: 2 },
    { questionKey: "q2_planning_on_target", response: "always" },
    { questionKey: "q2_manual_planning", response: "medium" },
    { questionKey: "q2_reporting_inconsistency", response: "low" },
    { questionKey: "q2_data_complexity", response: "minimal" },
    { questionKey: "q2_scenario_complexity", response: "moderate" },
    { questionKey: "q2_org_structure_complexity", response: "minimal" },
    { questionKey: "q2_epm_fte_count", response: 1 },
    { questionKey: "q2_tool_satisfaction", response: 3 },
    { questionKey: "q2_dev_capability", response: "yes_likely" },
    { questionKey: "q2_analyst_capability", response: "yes" },
    { questionKey: "q2_ai_adoption", response: "expanding" },
    { questionKey: "q2_ai_use_cases", response: ["forecasting", "nlp_insights", "copilot_tools"] },
    { questionKey: "q2_data_science_capability", response: "dedicated" },
    { questionKey: "q2_ai_data_readiness", response: 4 },
    { questionKey: "q2_ai_governance", response: "basic" },
    { questionKey: "q2_epm_priority_focus", response: ["ai_automation", "planning_forecasting", "reporting_viz"] },
    { questionKey: "q2_erp_selection_priorities", response: ["cloud_architecture", "integration", "user_experience"] },
    { questionKey: "q2_ai_tool_priorities", response: ["finance_specific", "integration", "ease_of_use"] },
    { questionKey: "q2_current_epm_vendor", response: ["excel_legacy"] },
  ],
  expectedScores: {
    overall: 72,
    consolidation_close: 85,
    financial_planning_analysis: 75,
    management_reporting: 70,
    organisation_people: 80,
    data_analytics: 65,
    technology_systems: 70,
    financial_controls_compliance: 60,
    ai_machine_learning: 75,
  },
};

// TechFlow Solutions Ltd test data from test case JSON
const TECHFLOW_TEST_DATA = {
  company: {
    name: "TechFlow Solutions Ltd",
    companyNumber: "12345678",
    sector: "Technology Services",
    sicCode: "6203",
    revenue: 80000000,
    employees: 145,
    headquarters: "London, UK",
  },
  contact: {
    firstName: "Alex",
    lastName: "Thompson",
    email: "test.finance@techflow-test.example.com",
    roleTitle: "Finance Director",
    businessPhone: "+44 20 1234 5678",
  },
  // Pre-assessment responses mapped to actual database question keys
  preAssessmentResponses: [
    { questionKey: "q2_annual_revenue", response: "50_100m" },
    { questionKey: "q2_finance_team_size", response: { finance_fte: 4, finance_budget: 400 } },
    { questionKey: "q2_transformation_budget", response: "100k_250k" },
    { questionKey: "q2_project_timeline", response: "next_3_months" },
    { questionKey: "q2_current_systems", response: ["sap", "excel"] },
    { questionKey: "q2_consolidation_centralisation", response: "mixed" },
    { questionKey: "q2_close_cycle", response: 35 },
    { questionKey: "q2_close_reliability", response: "mostly" },
    { questionKey: "q2_manual_consolidation", response: "high" },
    { questionKey: "q2_reporting_centralisation", response: "mixed" },
    { questionKey: "q2_reporting_cycle", response: 5 },
    { questionKey: "q2_reporting_manual", response: "high" },
    { questionKey: "q2_self_service", response: "limited" },
    { questionKey: "q2_data_visualisation", response: "basic" },
    { questionKey: "q2_planning_centralisation", response: "mixed" },
    { questionKey: "q2_planning_cycle", response: 12 },
    { questionKey: "q2_forecast_frequency", response: "quarterly" },
    { questionKey: "q2_scenario_planning", response: "limited" },
    { questionKey: "q2_multi_currency", response: "single" },
    { questionKey: "q2_intercompany", response: "low" },
    { questionKey: "q2_regulatory", response: "moderate" },
    { questionKey: "q2_data_accuracy", response: "moderate" },
    { questionKey: "q2_data_integration", response: "limited" },
    { questionKey: "q2_erp_landscape", response: "legacy_single" },
    { questionKey: "q2_planning_tools", response: "spreadsheet" },
    { questionKey: "q2_cloud_adoption", response: "limited" },
    { questionKey: "q2_automation", response: "low" },
    { questionKey: "q2_change_capacity", response: "moderate" },
    { questionKey: "q2_skills_gap", response: "moderate" },
    { questionKey: "q2_planning_reporting_time", response: 5 },
    // New tool selection questions
    { questionKey: "q2_epm_priority_focus", response: ["consolidation_close", "planning_forecasting", "ai_automation"] },
    { questionKey: "q2_erp_selection_priorities", response: ["industry_fit", "integration", "scalability"] },
    { questionKey: "q2_ai_tool_priorities", response: ["predictive_analytics", "nlp_reporting", "anomaly_detection"] },
    { questionKey: "q2_current_epm_vendor", response: ["oracle_epm"] },
  ],
  expectedScores: {
    overall: 2.6,
    filingSpeed: 1.5,
    closeCycle: 4.0,
    amendmentRate: 1.8,
    dso: 3.2,
    dataQuality: 1.7,
    marginStability: 3.3,
    auditReadiness: 1.8,
    technology: 2.8,
  },
};

/**
 * Register dev routes on the public router.
 * Only registers routes if NODE_ENV === "development".
 */
export function registerDevRoutes(publicRouter: Router): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }
  
  log.info("DEV endpoints registered");

  publicRouter.post("/dev/create-test-assessment", async (req: Request, res: Response) => {
    try {
      const { 
        tier = "pre_assessment", 
        runAnalysis = true,
        profile = "techflow",
        companyName,
        contactEmail,
        contactFirstName,
        contactLastName,
        sector,
        revenue,
        employees
      } = req.body;
      
      // Select test data profile - "nats" for NATS, "constancia" for Constancia, default is "techflow"
      const TEST_PROFILES: Record<string, any> = {
        techflow: TECHFLOW_TEST_DATA,
        nats: NATS_TEST_DATA,
        "constancia": ONEQG_TEST_DATA,
        oneqg: ONEQG_TEST_DATA,
      };
      
      const selectedProfile = TEST_PROFILES[profile.toLowerCase()] || TECHFLOW_TEST_DATA;
      
      // Use custom data if provided, otherwise fall back to selected profile
      const testCompany = {
        name: companyName || selectedProfile.company.name,
        sector: sector || selectedProfile.company.sector,
        sicCode: selectedProfile.company.sicCode,
        revenueMillions: revenue || (selectedProfile.company.revenue / 1000000),
        totalFte: employees || selectedProfile.company.employees,
        financeCostPercentage: (selectedProfile.company as any).financeCostPercentage,
      };
      
      const testContact = {
        firstName: contactFirstName || selectedProfile.contact.firstName,
        lastName: contactLastName || selectedProfile.contact.lastName,
        email: contactEmail || selectedProfile.contact.email,
        roleTitle: selectedProfile.contact.roleTitle,
        phone: selectedProfile.contact.businessPhone,
        priorities: (selectedProfile.contact as any).priorities,
      };
      
      log.info({ company: testCompany.name, tier }, "Creating test assessment");
      
      // Check for existing test contact first
      let contact = await fcStorage.getContactByEmail(testContact.email);
      let company;
      
      if (contact && contact.companyId) {
        company = await fcStorage.getCompanyById(contact.companyId);
      }
      
      // Create company if needed
      if (!company) {
        company = await fcStorage.createCompany({
          name: testCompany.name,
          sector: testCompany.sector,
          sicCode: testCompany.sicCode,
          revenueMillions: testCompany.revenueMillions,
          totalFte: testCompany.totalFte,
          financeCostPercentage: testCompany.financeCostPercentage,
        });
      }
      
      // Create contact if needed
      if (!contact) {
        contact = await fcStorage.createContact({
          companyId: company.id,
          firstName: testContact.firstName,
          lastName: testContact.lastName,
          email: testContact.email,
          roleTitle: testContact.roleTitle,
          phone: testContact.phone,
          priorities: testContact.priorities,
        });
      }
      
      // Create a new assessment
      const assessment = await fcStorage.createAssessment({
        contactId: contact.id,
        companyId: company.id,
        tier: tier as FCAssessmentTier,
        status: "in_progress",
      });
      
      // Get questions for tier
      const questions = await fcStorage.getQuestionsByTier(tier as FCAssessmentTier);
      
      // Create responses based on selected profile's test data
      const responses = selectedProfile.preAssessmentResponses;
      for (const respData of responses) {
        const question = questions.find(q => q.questionKey === respData.questionKey);
        if (question) {
          await fcStorage.createResponse({
            assessmentId: assessment.id,
            questionId: question.id,
            tier: tier as FCAssessmentTier,
            response: respData.response,
            rawValue: typeof respData.response === "string" ? respData.response : JSON.stringify(respData.response),
          });
        }
      }
      
      // Mark assessment as completed
      await fcStorage.updateAssessment(assessment.id, { status: "completed" });
      
      // Establish session for dev testing (bypasses OTP for E2E tests)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      (req.session as any).fcVerified = {
        contactId: contact.id,
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        expiresAt: expiresAt.toISOString(),
      };
      
      // Fallback analysis result for testing (based on expected test data)
      const fallbackAnalysis: AnalysisResult = {
        overallScore: 52, // 2.6/5 = 52%
        readinessLevel: "moderate" as const,
        summary: "Test assessment with fallback scores.",
        dimensionScores: {
          "filing-speed": 30,
          "close-cycle": 80,
          "amendment-rate": 36,
          "dso": 64,
          "data-quality": 34,
          "margin-stability": 66,
          "audit-readiness": 36,
          "technology": 56,
        },
        keyFindings: ["Test assessment created via dev endpoint"],
        prioritisedRecommendations: [],
        nextSteps: ["Review findings with stakeholders"],
      };
      
      let analysisResult: AnalysisResult = fallbackAnalysis;
      
      // Run AI analysis if requested (optional - fallback used if fails or skipped)
      if (runAnalysis) {
        log.info({ assessmentId: assessment.id }, "Running analysis for assessment");
        const allResponses = await fcStorage.getResponsesByAssessmentId(assessment.id);
        
        try {
          let aiResult: AnalysisResult | null = null;
          if (tier === "pre_assessment") {
            aiResult = await analysePreAssessment(assessment, allResponses, questions);
          } else if (tier === "full") {
            aiResult = await analyseFullAssessment(assessment, allResponses, questions);
          }
          if (aiResult) {
            analysisResult = aiResult;
            log.info({ assessmentId: assessment.id }, "AI Analysis succeeded");
          }
        } catch (analysisError) {
          log.error({ err: analysisError }, "AI Analysis failed, using fallback scores");
        }
      }
      
      // Always update to analysed status with dimension scores (either AI or fallback)
      await fcStorage.updateAssessment(assessment.id, {
        status: "analysed", // Critical: set to analysed so PDF download works
        epmReadinessScore: analysisResult.overallScore, // Required for results page display
        overallMaturityScore: analysisResult.overallScore,
        dimensionScores: analysisResult.dimensionScores as any,
        completedAt: new Date(),
      });
      
      res.json({
        success: true,
        data: {
          assessmentId: assessment.id,
          companyId: company.id,
          contactId: contact.id,
          tier,
          status: "completed",
          analysis: analysisResult ? {
            overallScore: analysisResult.overallScore,
            readinessLevel: analysisResult.readinessLevel,
            dimensionScores: analysisResult.dimensionScores,
          } : null,
          expectedScores: TECHFLOW_TEST_DATA.expectedScores,
          urls: {
            results: `/finance-compass/results/${assessment.id}`,
            pdfReport: `/api/finance-compass/public/assessments/${assessment.id}/report`,
          },
        },
      });
    } catch (error) {
      log.error({ err: error }, "Create test assessment error");
      res.status(500).json({ success: false, error: String(error) });
    }
  });
  
  // Dev endpoint to pre-generate AI narratives for an assessment
  publicRouter.post("/dev/regenerate-narratives", async (req: Request, res: Response) => {
    try {
      const { assessmentIds } = req.body;
      
      if (!assessmentIds || !Array.isArray(assessmentIds) || assessmentIds.length === 0) {
        return res.status(400).json({ success: false, error: "assessmentIds array required" });
      }
      
      log.info({ count: assessmentIds.length }, "Pre-generating narratives");
      
      const results: { assessmentId: string; success: boolean; sections?: number; error?: string }[] = [];
      
      for (const assessmentId of assessmentIds) {
        try {
          const details = await fcStorage.getAssessmentWithDetails(assessmentId);
          if (!details) {
            results.push({ assessmentId, success: false, error: "Assessment not found" });
            continue;
          }
          
          const { assessment, company, responses } = details;
          const dimensionScores = normalizeDimensionScores(assessment.dimensionScores);
          
          log.info({ assessmentId }, "Clearing cache and generating narratives");
          log.info({ assessmentId, dimensionScores }, "Dimension scores");
          clearNarrativeCache(assessmentId);
          
          const startTime = Date.now();
          const narratives = await generateAllNarratives(assessment, responses, dimensionScores, company);
          
          // Also generate stakeholder narratives for full assessments
          const metrics = {
            overallScore: assessment.epmReadinessScore || assessment.overallMaturityScore || 0,
            dimensionScores,
          };
          
          log.info("Generating stakeholder narratives");
          const [cfoNarrative, fpaDirectorNarrative, itDirectorNarrative] = await Promise.all([
            generateStakeholderNarrative(assessment, responses, company, metrics, "cfo"),
            generateStakeholderNarrative(assessment, responses, company, metrics, "fpa_director"),
            generateStakeholderNarrative(assessment, responses, company, metrics, "it_director"),
          ]);
          
          // Store stakeholder narratives in dataSynthesis
          const narrativesWithStakeholders = {
            ...narratives,
            dataSynthesis: {
              ...narratives.dataSynthesis,
              stakeholderNarratives: {
                cfo: cfoNarrative,
                fpaDirector: fpaDirectorNarrative,
                itDirector: itDirectorNarrative,
              },
            },
          };
          
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          
          await fcStorage.saveReportNarrative(assessmentId, narrativesWithStakeholders as any);
          log.info({ assessmentId, sections: Object.keys(narrativesWithStakeholders).length, elapsed }, "Generated and saved narrative sections");
          results.push({ assessmentId, success: true, sections: Object.keys(narrativesWithStakeholders).length });
        } catch (err: any) {
          log.error({ err, assessmentId }, "Failed to generate narratives");
          results.push({ assessmentId, success: false, error: err.message || "Unknown error" });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      
      res.json({
        success: true,
        data: {
          results,
          summary: {
            total: assessmentIds.length,
            succeeded: successCount,
            failed: assessmentIds.length - successCount,
          },
        },
        message: `Pre-generated narratives for ${successCount}/${assessmentIds.length} assessments`,
      });
    } catch (error) {
      log.error({ err: error }, "Regenerate narratives error");
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Dev endpoint to regenerate AI analysis for an assessment
  publicRouter.post("/dev/regenerate-analysis/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const assessment = await fcStorage.getAssessmentById(id);
      if (!assessment) {
        return res.status(404).json({ success: false, error: "Assessment not found" });
      }
      
      log.info({ assessmentId: id, tier: assessment.tier }, "Regenerating AI analysis");
      
      const responses = await fcStorage.getResponsesByAssessmentId(id);
      const questions = await fcStorage.getQuestionsByTier(assessment.tier as any);
      
      let analysisResult: any;
      const startTime = Date.now();
      
      switch (assessment.tier) {
        case "quick_assessment":
        case "pre_assessment":
          analysisResult = await analysePreAssessment(assessment, responses, questions);
          break;
        case "full":
          analysisResult = await analyseFullAssessment(assessment, responses, questions);
          break;
        default:
          return res.status(400).json({ success: false, error: `Unknown tier: ${assessment.tier}` });
      }
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      // Save results
      const updateData: any = {
        status: "analysed",
        analysedAt: new Date(),
      };
      
      if ("epmReadinessScore" in analysisResult) {
        updateData.epmReadinessScore = analysisResult.epmReadinessScore;
        updateData.overallMaturityScore = analysisResult.epmReadinessScore;
        updateData.quickWins = analysisResult.quickWins;
        updateData.recommendations = [analysisResult.upgradeRecommendation];
      } else {
        updateData.epmReadinessScore = analysisResult.overallScore;
        updateData.overallMaturityScore = analysisResult.overallScore;
        updateData.dimensionScores = analysisResult.dimensionScores;
        updateData.recommendations = analysisResult.prioritisedRecommendations?.map((r: any) => r.description) || [];
      }
      
      await fcStorage.updateAssessment(id, updateData);
      
      // Clear narrative cache so it regenerates with new analysis
      clearNarrativeCache(id);
      
      log.info({ assessmentId: id, elapsed }, "AI analysis regenerated");
      
      res.json({
        success: true,
        data: {
          assessmentId: id,
          tier: assessment.tier,
          elapsedSeconds: parseFloat(elapsed),
          analysis: analysisResult,
        },
        message: `AI analysis regenerated in ${elapsed}s using GPT-5.2`,
      });
    } catch (error) {
      log.error({ err: error }, "Regenerate analysis error");
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Dev endpoint to get narratives without session (for testing)
  publicRouter.get("/dev/narratives/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const saved = await fcStorage.getReportNarrative(id);
      
      if (!saved) {
        return res.status(404).json({ success: false, error: "Narratives not found for this assessment" });
      }
      
      res.json({
        success: true,
        data: {
          assessmentId: id,
          cachedAt: saved.generatedAt,
          isFallback: saved.isFallback,
          executiveBrief: saved.executiveSummary,
          dimensionNarratives: saved.dimensionNarratives,
          keyFindings: saved.keyFindings,
          actionPlan: saved.actionPlan,
          stakeholderNarratives: {
            cfo: (saved.dataSynthesis as any)?.stakeholderNarratives?.cfo,
            fpaDirector: (saved.dataSynthesis as any)?.stakeholderNarratives?.fpaDirector,
            itDirector: (saved.dataSynthesis as any)?.stakeholderNarratives?.itDirector,
          },
        },
      });
    } catch (error) {
      log.error({ err: error }, "Get narratives error");
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Dev endpoint to get/create ROI profile without session (for testing)
  publicRouter.get("/dev/roi/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { createDefault } = req.query;
      
      const assessment = await fcStorage.getAssessmentById(id);
      if (!assessment) {
        return res.status(404).json({ success: false, error: "Assessment not found" });
      }
      
      let profile = await fcStorage.getRoiProfileByAssessmentId(id);
      
      // Create default ROI profile if requested and doesn't exist
      if (!profile && createDefault === "true") {
        const company = assessment.companyId ? await fcStorage.getCompanyById(assessment.companyId) : null;
        const revenueMillions = company?.revenueMillions || 50;
        const employees = company?.totalFte || 100;
        
        // Calculate sensible defaults based on company size
        const baseLicenseCost = Math.max(50000, Math.min(500000, revenueMillions * 1000));
        const baseImplementationCost = baseLicenseCost * 1.5;
        const expectedBenefits = baseLicenseCost * 2.5;
        
        profile = await fcStorage.upsertRoiProfile(id, {
          assessmentId: id,
          contactId: assessment.contactId,
          companyId: assessment.companyId,
          currency: "GBP",
          horizonYears: 3,
          discountRate: 10,
          softwareLicenses: Math.round(baseLicenseCost),
          changeManagement: Math.round(baseImplementationCost * 0.15),
          trainingCosts: Math.round(baseImplementationCost * 0.1),
          dataCleansingMigration: Math.round(baseImplementationCost * 0.15),
          annualMaintenance: Math.round(baseLicenseCost * 0.2),
          cloudHosting: Math.round(baseLicenseCost * 0.1),
          internalSupport: Math.round(employees * 500),
          efficiencyGains: Math.round(expectedBenefits * 0.35),
          closeAccelerationValue: Math.round(expectedBenefits * 0.2),
          headcountAvoidance: Math.round(expectedBenefits * 0.25),
          errorReduction: Math.round(expectedBenefits * 0.1),
          complianceRiskAvoidance: Math.round(expectedBenefits * 0.1),
        } as any);
        
        log.info({ assessmentId: id }, "Created default ROI profile");
      }
      
      if (!profile) {
        return res.json({
          success: true,
          data: { profile: null, metrics: null, message: "No ROI profile exists. Use ?createDefault=true to create one." },
        });
      }
      
      // Calculate metrics using the calculator
      const { calculateRoiMetrics } = await import("@shared/roi-calculator");
      const metrics = calculateRoiMetrics(profile);
      
      res.json({
        success: true,
        data: { profile, metrics },
      });
    } catch (error) {
      log.error({ err: error }, "Get ROI profile error");
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Dev endpoint to download PDF without session (for testing)
  publicRouter.get("/dev/report/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const assessmentDetails = await fcStorage.getAssessmentWithDetails(id);
      if (!assessmentDetails) {
        return res.status(404).json({ success: false, error: "Assessment not found" });
      }
      
      const { assessment, company, contact } = assessmentDetails;
      
      if (assessment.status !== "analysed" && assessment.status !== "report_generated") {
        return res.status(400).json({ success: false, error: "Assessment must be analysed before generating report" });
      }
      
      log.info({ assessmentId: id }, "Generating PDF report");
      
      // Import PDF service
      const { generateAssessmentPDF } = await import("./pdf-service");
      
      // Build analysis result - matches the expected AnalysisResult type
      const dimScores = assessment.dimensionScores as Record<string, any> || {};
      const analysisResult = {
        overallScore: assessment.epmReadinessScore || assessment.overallMaturityScore || 0,
        dimensionScores: Object.fromEntries(
          Object.entries(dimScores).map(([k, v]) => [k, typeof v === 'object' && v !== null ? (v as any).score ?? v : v])
        ),
        recommendations: Array.isArray(assessment.recommendations) ? assessment.recommendations : [],
        keyFindings: [],
        actionPlan: [],
        summary: "Assessment analysis complete.",
        prioritisedRecommendations: [],
      };
      
      // generateAssessmentPDF takes assessmentId and analysis, fetches rest internally
      const pdfBuffer = await generateAssessmentPDF(id, analysisResult as any);
      
      const filename = `FinanceCompass_${assessment.tier}_${company?.name?.replace(/\s+/g, '_') || 'Assessment'}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      log.error({ err: error }, "Generate report error");
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Dev endpoint to validate scores against expected values
  publicRouter.get("/dev/validate-assessment/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const assessment = await fcStorage.getAssessmentById(id);
      
      if (!assessment) {
        return res.status(404).json({ success: false, error: "Assessment not found" });
      }
      
      const expected = TECHFLOW_TEST_DATA.expectedScores;
      const actual = {
        overall: assessment.overallMaturityScore || 0,
        dimensionScores: assessment.dimensionScores || {},
      };
      
      // Calculate score on 1-5 scale from percentage
      const actualOverall5Scale = (actual.overall / 100) * 5;
      const overallTolerance = 0.5;
      const overallMatch = Math.abs(actualOverall5Scale - expected.overall) <= overallTolerance;
      
      res.json({
        success: true,
        data: {
          assessmentId: id,
          validation: {
            overallScore: {
              expected: `${expected.overall}/5 (${expected.overall * 20}%)`,
              actual: `${actualOverall5Scale.toFixed(2)}/5 (${actual.overall}%)`,
              tolerance: overallTolerance,
              pass: overallMatch,
            },
          },
          rawData: {
            expected,
            actual,
          },
        },
      });
    } catch (error) {
      log.error({ err: error }, "Validate assessment error");
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Dev endpoint to regenerate narratives for a specific assessment
  publicRouter.post("/dev/regenerate-narratives/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      log.info({ assessmentId: id }, "Regenerating narratives");
      
      // Get assessment with full details
      const details = await fcStorage.getAssessmentWithDetails(id);
      if (!details) {
        return res.status(404).json({ success: false, error: "Assessment not found" });
      }
      
      const { assessment, responses, company } = details;
      
      if (assessment.status !== "analysed" && assessment.status !== "report_generated" && assessment.status !== "completed") {
        return res.status(400).json({ 
          success: false, 
          error: `Assessment must be analysed, report_generated, or completed. Current status: ${assessment.status}` 
        });
      }
      
      // Normalize dimension scores
      const dimensionScores = normalizeDimensionScores(assessment.dimensionScores as Record<string, number> | null);
      
      // Clear any existing cache
      clearNarrativeCache(id);
      
      // Generate all narratives
      log.info({ assessmentId: id }, "Generating all narratives");
      const narratives = await generateAllNarratives(assessment, responses, dimensionScores, company);
      
      log.info({ assessmentId: id }, "Successfully regenerated narratives");
      
      res.json({
        success: true,
        data: {
          assessmentId: id,
          tier: assessment.tier,
          status: assessment.status,
          sectionsGenerated: Object.keys(narratives).length,
          sections: Object.keys(narratives),
          message: "Narratives regenerated successfully. View the results page to see the updated report.",
        },
      });
    } catch (error) {
      log.error({ err: error }, "Regenerate narratives error");
      res.status(500).json({ success: false, error: String(error) });
    }
  });
}

export { TECHFLOW_TEST_DATA };
