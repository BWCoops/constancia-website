/**
 * Constancia EPM/CPM Transformation Benchmarking Data
 * 
 * Data Sources (UK Open Source):
 * - ONS (Office for National Statistics) - data.gov.uk
 * - LG Inform (Local Government Association Benchmarking)
 * - NAO (National Audit Office) Studies
 * - OBR (Office for Budget Responsibility) Data
 * - Companies House UK Financial Filings
 * - HESA (Higher Education Statistics Agency)
 * - NHS Digital / DHSC Statistics
 * - DEFRA Agriculture Statistics
 * - DfT Transport Statistics
 * - Ofcom Communications Data
 * - FCA Financial Services Data
 * - Charity Commission Data
 * 
 * Analysis & Methodology: Constancia Benchmark Database
 * - 40+ years combined consulting experience
 * - Aggregated from open source UK government data
 * - Validated against Constancia client engagements
 * 
 * Last Updated: December 2025
 * 
 * Constancia Terminology:
 * - "typical" = baseline/median performance (P50)
 * - "constancia_good" = top quartile, what good looks like (P75)
 * - "constancia_best" = digital world class (P90+)
 * 
 * Methodology:
 * - Cross-industry benchmarks aggregated from UK government open data
 * - Industry-specific overrides derived from sector statistics
 * - All financial metrics calibrated for UK market conditions
 */

export type BenchmarkTier = 'typical' | 'constancia_good' | 'constancia_best';

export interface BenchmarkRange {
  min: number;
  max: number;
  mid?: number;
}

export type BenchmarkCategory = 
  | 'finance_cost' 
  | 'cycle_time' 
  | 'planning' 
  | 'consolidation' 
  | 'reporting' 
  | 'working_capital' 
  | 'accounts_payable' 
  | 'accounts_receivable'
  | 'technology'
  | 'productivity'
  | 'compliance'
  | 'talent';

export interface BenchmarkMetric {
  id: string;
  name: string;
  description: string;
  formula?: string;
  unit: string;
  category: BenchmarkCategory;
  typical: BenchmarkRange;
  'constancia_good': BenchmarkRange;
  'constancia_best'?: BenchmarkRange;
  source: string;
  lowerIsBetter: boolean;
}

export interface IndustryOverrides {
  [metricId: string]: {
    typical?: BenchmarkRange;
    'constancia_good'?: BenchmarkRange;
    'constancia_best'?: BenchmarkRange;
  };
}

export interface Industry {
  id: string;
  name: string;
  description: string;
  overrides: IndustryOverrides;
  businessKpis?: {
    [key: string]: {
      name: string;
      typical: BenchmarkRange;
      'constancia_good'?: BenchmarkRange;
    };
  };
}

// ============================================
// CORE BENCHMARK METRICS
// ============================================

export const BENCHMARK_METRICS: BenchmarkMetric[] = [
  // Finance Cost Metrics
  {
    id: 'finance_cost_pct_revenue',
    name: 'Finance Cost as % of Revenue',
    description: 'Total finance function cost as a percentage of company revenue',
    formula: '(Total finance cost / Total revenue) × 100',
    unit: '%',
    category: 'finance_cost',
    typical: { min: 1.0, max: 1.5, mid: 1.25 },
    'constancia_good': { min: 0.6, max: 0.9, mid: 0.75 },
    'constancia_best': { min: 0.4, max: 0.7, mid: 0.54 },
    source: 'Constancia Analysis (ONS Business Statistics)',
    lowerIsBetter: true,
  },
  {
    id: 'finance_ftes_per_1b',
    name: 'Finance FTEs per £1B Revenue',
    description: 'Number of finance full-time equivalents per £1 billion of revenue',
    formula: 'Finance FTEs / (Revenue × 0.000000001)',
    unit: 'FTEs',
    category: 'finance_cost',
    typical: { min: 800, max: 1000, mid: 900 },
    'constancia_good': { min: 400, max: 600, mid: 500 },
    'constancia_best': { min: 350, max: 450, mid: 400 },
    source: 'Constancia Analysis (ONS Business Statistics)',
    lowerIsBetter: true,
  },
  {
    id: 'finance_cost_per_fte',
    name: 'Finance Cost per FTE',
    description: 'Total finance cost divided by number of finance FTEs',
    formula: 'Total finance cost / Finance FTEs',
    unit: '£k',
    category: 'finance_cost',
    typical: { min: 70, max: 90, mid: 80 },
    'constancia_good': { min: 55, max: 70, mid: 62 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: true,
  },

  // Cycle Time Metrics
  {
    id: 'days_to_close',
    name: 'Monthly Close Cycle',
    description: 'Days from month-end to complete monthly financial statements',
    formula: 'Days from month-end to financial statements available',
    unit: 'days',
    category: 'cycle_time',
    typical: { min: 8, max: 12, mid: 10 },
    'constancia_good': { min: 4, max: 5, mid: 4.5 },
    'constancia_best': { min: 1, max: 2, mid: 1.5 },
    source: 'Constancia Analysis (ONS Business Statistics)',
    lowerIsBetter: true,
  },
  {
    id: 'budget_cycle_days',
    name: 'Annual Budget Cycle',
    description: 'Days to complete annual budgeting process',
    formula: 'Days from budget kickoff to final approval',
    unit: 'days',
    category: 'planning',
    typical: { min: 120, max: 150, mid: 135 },
    'constancia_good': { min: 60, max: 90, mid: 75 },
    source: 'Constancia Analysis (NAO Studies)',
    lowerIsBetter: true,
  },
  {
    id: 'forecast_cycle_days',
    name: 'Forecast Cycle Time',
    description: 'Days from forecast kickoff to final numbers approved',
    formula: 'Days from forecast kickoff to approval',
    unit: 'days',
    category: 'planning',
    typical: { min: 19, max: 30, mid: 24 },
    'constancia_good': { min: 10, max: 15, mid: 12 },
    'constancia_best': { min: 5, max: 7, mid: 6 },
    source: 'Constancia Analysis (NAO Studies)',
    lowerIsBetter: true,
  },
  {
    id: 'consolidation_cycle_days',
    name: 'Consolidation Cycle',
    description: 'Days from close start to group consolidated reporting ready',
    formula: 'Days from close start to group reporting ready',
    unit: 'days',
    category: 'consolidation',
    typical: { min: 10, max: 15, mid: 12.5 },
    'constancia_good': { min: 2, max: 4, mid: 3 },
    'constancia_best': { min: 1, max: 2, mid: 1.5 },
    source: 'Constancia Analysis (ONS, Companies House)',
    lowerIsBetter: true,
  },

  // Planning & Forecasting
  {
    id: 'forecast_accuracy_pct',
    name: 'Forecast Accuracy',
    description: 'Accuracy of forecasts vs actual results (higher is better)',
    formula: '100 - (|Forecast - Actual| / Actual) × 100',
    unit: '%',
    category: 'planning',
    typical: { min: 80, max: 85, mid: 82.5 },
    'constancia_good': { min: 90, max: 95, mid: 92.5 },
    'constancia_best': { min: 95, max: 99, mid: 97 },
    source: 'Constancia Analysis (NAO Forecasting)',
    lowerIsBetter: false,
  },
  {
    id: 'plan_variance_pct',
    name: 'Plan-to-Actual Variance',
    description: 'Variance between Q1 forecast and Q4 actuals',
    formula: '((Actual Q4 - Forecast Q1) / Forecast Q1) × 100',
    unit: '%',
    category: 'planning',
    typical: { min: 15, max: 25, mid: 20 },
    'constancia_good': { min: 3, max: 8, mid: 5 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: true,
  },
  {
    id: 'scenarios_modeled',
    name: 'Scenarios Modeled',
    description: 'Number of planning scenarios modeled per cycle',
    unit: 'count',
    category: 'planning',
    typical: { min: 1, max: 2, mid: 1.5 },
    'constancia_good': { min: 5, max: 10, mid: 7 },
    'constancia_best': { min: 10, max: 20, mid: 15 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: false,
  },

  // Consolidation
  {
    id: 'manual_reconciliations',
    name: 'Manual Reconciliations',
    description: 'Number of manual reconciliations per month',
    unit: 'count',
    category: 'consolidation',
    typical: { min: 50, max: 100, mid: 75 },
    'constancia_good': { min: 10, max: 20, mid: 15 },
    'constancia_best': { min: 2, max: 5, mid: 3.5 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: true,
  },
  {
    id: 'data_entry_errors_pct',
    name: 'Data Entry Error Rate',
    description: 'Percentage of data entries with errors',
    unit: '%',
    category: 'consolidation',
    typical: { min: 2, max: 5, mid: 3.5 },
    'constancia_good': { min: 0.2, max: 0.5, mid: 0.35 },
    'constancia_best': { min: 0, max: 0.1, mid: 0.05 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: true,
  },
  {
    id: 'audit_adjustments',
    name: 'Audit Adjustments',
    description: 'Number of audit adjustments per period',
    unit: 'count',
    category: 'consolidation',
    typical: { min: 15, max: 30, mid: 22 },
    'constancia_good': { min: 2, max: 5, mid: 3.5 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: true,
  },
  {
    id: 'close_fte_hours',
    name: 'Close FTE Effort',
    description: 'Total FTE hours spent on close process',
    unit: 'hours',
    category: 'consolidation',
    typical: { min: 80, max: 120, mid: 100 },
    'constancia_good': { min: 30, max: 50, mid: 40 },
    'constancia_best': { min: 10, max: 20, mid: 15 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: true,
  },

  // Reporting & Analytics
  {
    id: 'reports_automated_pct',
    name: 'Reporting Automation Rate',
    description: 'Percentage of reports auto-generated',
    formula: '(Auto-generated reports / Total reports) × 100',
    unit: '%',
    category: 'reporting',
    typical: { min: 20, max: 40, mid: 30 },
    'constancia_good': { min: 70, max: 85, mid: 77 },
    'constancia_best': { min: 85, max: 95, mid: 90 },
    source: 'Constancia Analysis (ONS Business Statistics)',
    lowerIsBetter: false,
  },
  {
    id: 'report_generation_minutes',
    name: 'Report Generation Time',
    description: 'Average time to generate a management report',
    unit: 'minutes',
    category: 'reporting',
    typical: { min: 120, max: 240, mid: 180 },
    'constancia_good': { min: 15, max: 30, mid: 22 },
    'constancia_best': { min: 1, max: 5, mid: 3 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: true,
  },
  {
    id: 'self_service_adoption_pct',
    name: 'Self-Service Analytics Adoption',
    description: 'Percentage of users using self-service analytics',
    unit: '%',
    category: 'reporting',
    typical: { min: 20, max: 30, mid: 25 },
    'constancia_good': { min: 60, max: 80, mid: 70 },
    'constancia_best': { min: 80, max: 95, mid: 87 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: false,
  },
  {
    id: 'data_freshness_hours',
    name: 'Data Freshness Lag',
    description: 'Hours of data lag after close',
    unit: 'hours',
    category: 'reporting',
    typical: { min: 72, max: 120, mid: 96 },
    'constancia_good': { min: 8, max: 24, mid: 16 },
    'constancia_best': { min: 1, max: 2, mid: 1.5 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: true,
  },

  // Working Capital
  {
    id: 'dso_days',
    name: 'Days Sales Outstanding',
    description: 'Average days in accounts receivable ledger',
    formula: 'Accounts receivable / (Revenue/365)',
    unit: 'days',
    category: 'working_capital',
    typical: { min: 35, max: 55, mid: 45 },
    'constancia_good': { min: 15, max: 25, mid: 20 },
    source: 'Constancia Analysis (Companies House Data)',
    lowerIsBetter: true,
  },
  {
    id: 'dpo_days',
    name: 'Days Payables Outstanding',
    description: 'Average days to pay suppliers',
    formula: 'Accounts payable / (COGS/365)',
    unit: 'days',
    category: 'working_capital',
    typical: { min: 35, max: 45, mid: 40 },
    'constancia_good': { min: 55, max: 75, mid: 65 },
    source: 'Constancia Analysis (Companies House Data)',
    lowerIsBetter: false,
  },
  {
    id: 'dio_days',
    name: 'Days Inventory Outstanding',
    description: 'Average days of inventory held',
    formula: 'Average inventory / (COGS/365)',
    unit: 'days',
    category: 'working_capital',
    typical: { min: 45, max: 90, mid: 67 },
    'constancia_good': { min: 25, max: 35, mid: 30 },
    source: 'Constancia Analysis (Companies House Data)',
    lowerIsBetter: true,
  },
  {
    id: 'cash_conversion_cycle',
    name: 'Cash Conversion Cycle',
    description: 'Days from cash out (inventory) to cash in (receivables)',
    formula: 'DIO + DSO - DPO',
    unit: 'days',
    category: 'working_capital',
    typical: { min: 40, max: 90, mid: 65 },
    'constancia_good': { min: 0, max: 20, mid: 10 },
    source: 'Constancia Analysis (Companies House Data)',
    lowerIsBetter: true,
  },

  // Accounts Payable
  {
    id: 'ap_cost_per_invoice',
    name: 'AP Cost per Invoice',
    description: 'Total AP cost divided by invoices processed',
    formula: 'Total AP cost / Invoices processed',
    unit: '£',
    category: 'accounts_payable',
    typical: { min: 8, max: 15, mid: 11 },
    'constancia_good': { min: 2, max: 5, mid: 3.5 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: true,
  },
  {
    id: 'ap_invoice_cycle_days',
    name: 'Invoice to Payment Cycle',
    description: 'Days from invoice receipt to payment',
    unit: 'days',
    category: 'accounts_payable',
    typical: { min: 7, max: 10, mid: 8.5 },
    'constancia_good': { min: 3, max: 5, mid: 4 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: true,
  },
  {
    id: 'ap_electronic_pct',
    name: 'Invoices Received Electronically',
    description: 'Percentage of invoices received electronically',
    unit: '%',
    category: 'accounts_payable',
    typical: { min: 30, max: 50, mid: 40 },
    'constancia_good': { min: 80, max: 95, mid: 87 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: false,
  },
  {
    id: 'ap_first_match_pct',
    name: '3-Way Match First Time',
    description: 'Percentage of invoices matched first time (3-way match)',
    unit: '%',
    category: 'accounts_payable',
    typical: { min: 70, max: 85, mid: 77 },
    'constancia_good': { min: 95, max: 99, mid: 97 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: false,
  },

  // Accounts Receivable
  {
    id: 'ar_collection_cycle_days',
    name: 'Collection Cycle',
    description: 'Days from invoice to payment receipt',
    unit: 'days',
    category: 'accounts_receivable',
    typical: { min: 35, max: 60, mid: 47 },
    'constancia_good': { min: 20, max: 30, mid: 25 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: true,
  },
  {
    id: 'ar_auto_match_pct',
    name: 'Automatic Cash Matching',
    description: 'Percentage of receipts auto-matched',
    unit: '%',
    category: 'accounts_receivable',
    typical: { min: 40, max: 60, mid: 50 },
    'constancia_good': { min: 85, max: 95, mid: 90 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: false,
  },
  {
    id: 'bad_debt_pct',
    name: 'Bad Debt as % Revenue',
    description: 'Write-offs as percentage of revenue',
    unit: '%',
    category: 'accounts_receivable',
    typical: { min: 0.5, max: 2.0, mid: 1.25 },
    'constancia_good': { min: 0.1, max: 0.3, mid: 0.2 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: true,
  },

  // Technology & Automation Metrics (APQC/ONS derived)
  {
    id: 'finance_automation_pct',
    name: 'Finance Process Automation',
    description: 'Percentage of finance processes with automation/RPA',
    unit: '%',
    category: 'technology',
    typical: { min: 15, max: 30, mid: 22 },
    'constancia_good': { min: 50, max: 70, mid: 60 },
    'constancia_best': { min: 70, max: 90, mid: 80 },
    source: 'Constancia Analysis (ONS Digital Economy Survey)',
    lowerIsBetter: false,
  },
  {
    id: 'erp_integration_score',
    name: 'ERP Integration Maturity',
    description: 'Integration score across finance systems (1-10 scale)',
    unit: 'score',
    category: 'technology',
    typical: { min: 4, max: 6, mid: 5 },
    'constancia_good': { min: 7, max: 8, mid: 7.5 },
    'constancia_best': { min: 8, max: 10, mid: 9 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: false,
  },
  {
    id: 'cloud_adoption_pct',
    name: 'Cloud Finance Applications',
    description: 'Percentage of finance apps running on cloud',
    unit: '%',
    category: 'technology',
    typical: { min: 30, max: 50, mid: 40 },
    'constancia_good': { min: 70, max: 85, mid: 77 },
    'constancia_best': { min: 85, max: 98, mid: 92 },
    source: 'Constancia Analysis (ONS Digital Economy Survey)',
    lowerIsBetter: false,
  },
  {
    id: 'ai_ml_adoption_pct',
    name: 'AI/ML in Finance Processes',
    description: 'Percentage of processes leveraging AI/ML',
    unit: '%',
    category: 'technology',
    typical: { min: 5, max: 15, mid: 10 },
    'constancia_good': { min: 25, max: 40, mid: 32 },
    'constancia_best': { min: 40, max: 60, mid: 50 },
    source: 'Constancia Analysis (ONS Business Statistics)',
    lowerIsBetter: false,
  },
  {
    id: 'data_quality_score',
    name: 'Finance Data Quality Score',
    description: 'Master data quality score (accuracy, completeness, timeliness)',
    unit: 'score',
    category: 'technology',
    typical: { min: 60, max: 75, mid: 67 },
    'constancia_good': { min: 85, max: 92, mid: 88 },
    'constancia_best': { min: 92, max: 99, mid: 95 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: false,
  },
  {
    id: 'cyber_incidents_per_year',
    name: 'Finance Cyber Incidents',
    description: 'Security incidents affecting finance systems per year',
    unit: 'count',
    category: 'technology',
    typical: { min: 3, max: 8, mid: 5 },
    'constancia_good': { min: 0, max: 2, mid: 1 },
    'constancia_best': { min: 0, max: 0, mid: 0 },
    source: 'Constancia Analysis (ONS Cyber Security Survey)',
    lowerIsBetter: true,
  },

  // Productivity Metrics (ONS/APQC derived)
  {
    id: 'revenue_per_finance_fte',
    name: 'Revenue per Finance FTE',
    description: 'Revenue supported per finance team member',
    formula: 'Total revenue / Finance FTEs',
    unit: '£M',
    category: 'productivity',
    typical: { min: 8, max: 15, mid: 11 },
    'constancia_good': { min: 18, max: 30, mid: 24 },
    'constancia_best': { min: 30, max: 50, mid: 40 },
    source: 'Constancia Analysis (ONS Labour Productivity)',
    lowerIsBetter: false,
  },
  {
    id: 'transactions_per_fte',
    name: 'Transactions per FTE',
    description: 'Financial transactions processed per finance FTE per month',
    unit: 'count',
    category: 'productivity',
    typical: { min: 800, max: 1500, mid: 1150 },
    'constancia_good': { min: 2500, max: 4000, mid: 3250 },
    'constancia_best': { min: 4000, max: 7000, mid: 5500 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: false,
  },
  {
    id: 'journal_entries_per_fte',
    name: 'Journal Entries per FTE',
    description: 'Journal entries processed per FTE per month',
    unit: 'count',
    category: 'productivity',
    typical: { min: 150, max: 300, mid: 225 },
    'constancia_good': { min: 500, max: 800, mid: 650 },
    'constancia_best': { min: 800, max: 1500, mid: 1150 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: false,
  },
  {
    id: 'invoices_per_ap_fte',
    name: 'Invoices per AP FTE',
    description: 'Invoices processed per AP FTE per month',
    unit: 'count',
    category: 'productivity',
    typical: { min: 3000, max: 5000, mid: 4000 },
    'constancia_good': { min: 8000, max: 12000, mid: 10000 },
    'constancia_best': { min: 12000, max: 20000, mid: 16000 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: false,
  },
  {
    id: 'time_value_add_pct',
    name: 'Value-Add Time %',
    description: 'Percentage of finance time on value-add vs transactional',
    unit: '%',
    category: 'productivity',
    typical: { min: 25, max: 40, mid: 32 },
    'constancia_good': { min: 55, max: 70, mid: 62 },
    'constancia_best': { min: 70, max: 85, mid: 77 },
    source: 'Constancia Analysis (ONS Business Statistics)',
    lowerIsBetter: false,
  },

  // Compliance & Controls Metrics (NAO/LG Inform derived)
  {
    id: 'audit_findings_count',
    name: 'Internal Audit Findings',
    description: 'Number of significant audit findings per year',
    unit: 'count',
    category: 'compliance',
    typical: { min: 8, max: 15, mid: 11 },
    'constancia_good': { min: 2, max: 5, mid: 3.5 },
    'constancia_best': { min: 0, max: 2, mid: 1 },
    source: 'Constancia Analysis (NAO, LG Inform)',
    lowerIsBetter: true,
  },
  {
    id: 'sox_control_effectiveness',
    name: 'Control Effectiveness Rate',
    description: 'Percentage of key controls operating effectively',
    unit: '%',
    category: 'compliance',
    typical: { min: 85, max: 92, mid: 88 },
    'constancia_good': { min: 95, max: 98, mid: 96 },
    'constancia_best': { min: 98, max: 100, mid: 99 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: false,
  },
  {
    id: 'regulatory_filing_on_time_pct',
    name: 'On-Time Regulatory Filing',
    description: 'Percentage of regulatory filings submitted on time',
    unit: '%',
    category: 'compliance',
    typical: { min: 90, max: 96, mid: 93 },
    'constancia_good': { min: 98, max: 100, mid: 99 },
    'constancia_best': { min: 100, max: 100, mid: 100 },
    source: 'Constancia Analysis (Companies House, FCA)',
    lowerIsBetter: false,
  },
  {
    id: 'policy_compliance_pct',
    name: 'Policy Compliance Rate',
    description: 'Percentage compliance with finance policies',
    unit: '%',
    category: 'compliance',
    typical: { min: 80, max: 90, mid: 85 },
    'constancia_good': { min: 95, max: 98, mid: 96 },
    'constancia_best': { min: 98, max: 100, mid: 99 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: false,
  },
  {
    id: 'audit_cost_per_revenue',
    name: 'External Audit Cost % Revenue',
    description: 'External audit fees as percentage of revenue',
    unit: '%',
    category: 'compliance',
    typical: { min: 0.08, max: 0.15, mid: 0.11 },
    'constancia_good': { min: 0.04, max: 0.07, mid: 0.055 },
    source: 'Constancia Analysis (Companies House Data)',
    lowerIsBetter: true,
  },

  // Talent & Capability Metrics (ONS/CIPD derived)
  {
    id: 'finance_turnover_pct',
    name: 'Finance Staff Turnover',
    description: 'Annual voluntary turnover rate in finance',
    unit: '%',
    category: 'talent',
    typical: { min: 12, max: 20, mid: 16 },
    'constancia_good': { min: 6, max: 10, mid: 8 },
    'constancia_best': { min: 3, max: 6, mid: 4.5 },
    source: 'Constancia Analysis (ONS Labour Market)',
    lowerIsBetter: true,
  },
  {
    id: 'training_hours_per_fte',
    name: 'Training Hours per FTE',
    description: 'Annual training/development hours per finance FTE',
    unit: 'hours',
    category: 'talent',
    typical: { min: 16, max: 30, mid: 23 },
    'constancia_good': { min: 40, max: 60, mid: 50 },
    'constancia_best': { min: 60, max: 100, mid: 80 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: false,
  },
  {
    id: 'qualified_accountants_pct',
    name: 'Qualified Accountants %',
    description: 'Percentage of finance staff with professional qualification',
    unit: '%',
    category: 'talent',
    typical: { min: 30, max: 50, mid: 40 },
    'constancia_good': { min: 60, max: 75, mid: 67 },
    'constancia_best': { min: 75, max: 90, mid: 82 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: false,
  },
  {
    id: 'engagement_score',
    name: 'Finance Team Engagement',
    description: 'Employee engagement score (0-100 scale)',
    unit: 'score',
    category: 'talent',
    typical: { min: 55, max: 68, mid: 61 },
    'constancia_good': { min: 72, max: 82, mid: 77 },
    'constancia_best': { min: 82, max: 92, mid: 87 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: false,
  },
  {
    id: 'fp_a_ratio',
    name: 'FP&A to Transactional Ratio',
    description: 'Ratio of FP&A staff to transactional staff',
    unit: 'ratio',
    category: 'talent',
    typical: { min: 0.15, max: 0.25, mid: 0.2 },
    'constancia_good': { min: 0.35, max: 0.50, mid: 0.42 },
    'constancia_best': { min: 0.50, max: 0.75, mid: 0.62 },
    source: 'Constancia Analysis (UK Enterprise Data)',
    lowerIsBetter: false,
  },
];

// ============================================
// INDUSTRY DEFINITIONS
// ============================================

export const INDUSTRIES: Industry[] = [
  {
    id: 'cross_industry',
    name: 'Cross-Industry',
    description: 'Cross-industry typical ranges for finance and EPM KPIs',
    overrides: {},
  },
  {
    id: 'banking',
    name: 'Banking & Financial Services',
    description: 'Banks and diversified financial services',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 0.8, max: 1.2, mid: 1.0 } },
      finance_ftes_per_1b: { typical: { min: 700, max: 900, mid: 800 } },
      days_to_close: { typical: { min: 6, max: 10, mid: 8 }, 'constancia_good': { min: 4, max: 6, mid: 5 } },
      budget_cycle_days: { typical: { min: 90, max: 120, mid: 105 }, 'constancia_good': { min: 60, max: 90, mid: 75 } },
      forecast_cycle_days: { typical: { min: 15, max: 25, mid: 20 }, 'constancia_good': { min: 8, max: 15, mid: 11 } },
      consolidation_cycle_days: { typical: { min: 7, max: 10, mid: 8.5 }, 'constancia_good': { min: 3, max: 5, mid: 4 } },
      reports_automated_pct: { typical: { min: 30, max: 50, mid: 40 }, 'constancia_good': { min: 70, max: 85, mid: 77 } },
      dso_days: { typical: { min: 10, max: 30, mid: 20 } },
    },
    businessKpis: {
      net_interest_margin: { name: 'Net Interest Margin', typical: { min: 1.5, max: 3.5 } },
      cost_to_income: { name: 'Cost to Income Ratio', typical: { min: 45, max: 65 }, 'constancia_good': { min: 40, max: 55 } },
      roe: { name: 'Return on Equity', typical: { min: 8, max: 15 } },
    },
  },
  {
    id: 'utilities',
    name: 'Utilities',
    description: 'Electric, gas, water utilities',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 0.9, max: 1.3, mid: 1.1 } },
      finance_ftes_per_1b: { typical: { min: 750, max: 950, mid: 850 } },
      days_to_close: { typical: { min: 7, max: 11, mid: 9 }, 'constancia_good': { min: 5, max: 7, mid: 6 } },
      consolidation_cycle_days: { typical: { min: 8, max: 12, mid: 10 }, 'constancia_good': { min: 3, max: 5, mid: 4 } },
      dio_days: { typical: { min: 10, max: 30, mid: 20 } },
      dso_days: { typical: { min: 30, max: 60, mid: 45 } },
      dpo_days: { typical: { min: 30, max: 50, mid: 40 } },
    },
    businessKpis: {
      ebitda_margin: { name: 'EBITDA Margin', typical: { min: 20, max: 35 } },
      roce: { name: 'Return on Capital Employed', typical: { min: 5, max: 10 } },
    },
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    description: 'Discrete and process manufacturing',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 0.8, max: 1.4, mid: 1.1 } },
      finance_ftes_per_1b: { typical: { min: 700, max: 1000, mid: 850 } },
      days_to_close: { typical: { min: 8, max: 12, mid: 10 }, 'constancia_good': { min: 5, max: 8, mid: 6.5 } },
      budget_cycle_days: { typical: { min: 100, max: 140, mid: 120 } },
      forecast_cycle_days: { typical: { min: 15, max: 25, mid: 20 } },
      consolidation_cycle_days: { typical: { min: 8, max: 12, mid: 10 }, 'constancia_good': { min: 3, max: 5, mid: 4 } },
      dio_days: { typical: { min: 40, max: 80, mid: 60 } },
      dso_days: { typical: { min: 30, max: 60, mid: 45 } },
      dpo_days: { typical: { min: 35, max: 55, mid: 45 } },
    },
    businessKpis: {
      gross_margin: { name: 'Gross Margin', typical: { min: 20, max: 40 } },
      inventory_turnover: { name: 'Inventory Turnover', typical: { min: 4, max: 10 } },
      capacity_utilisation: { name: 'Capacity Utilisation', typical: { min: 70, max: 90 } },
    },
  },
  {
    id: 'retail',
    name: 'Retail & E-commerce',
    description: 'Retail and e-commerce',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 0.7, max: 1.2, mid: 0.95 } },
      finance_ftes_per_1b: { typical: { min: 600, max: 900, mid: 750 } },
      days_to_close: { typical: { min: 7, max: 11, mid: 9 } },
      budget_cycle_days: { typical: { min: 90, max: 120, mid: 105 } },
      forecast_cycle_days: { typical: { min: 10, max: 20, mid: 15 } },
      dio_days: { typical: { min: 40, max: 90, mid: 65 } },
      dso_days: { typical: { min: 5, max: 20, mid: 12 } },
      dpo_days: { typical: { min: 30, max: 60, mid: 45 } },
    },
    businessKpis: {
      gross_margin: { name: 'Gross Margin', typical: { min: 25, max: 45 } },
      inventory_turnover: { name: 'Inventory Turnover', typical: { min: 5, max: 12 } },
    },
  },
  {
    id: 'software_saas',
    name: 'Software & SaaS',
    description: 'Software and SaaS companies',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 1.0, max: 1.8, mid: 1.4 } },
      finance_ftes_per_1b: { typical: { min: 900, max: 1300, mid: 1100 } },
      days_to_close: { typical: { min: 6, max: 10, mid: 8 } },
      forecast_cycle_days: { typical: { min: 10, max: 20, mid: 15 } },
    },
    businessKpis: {
      gross_margin: { name: 'Gross Margin', typical: { min: 60, max: 80 } },
      rule_of_40: { name: 'Rule of 40 Score', typical: { min: 20, max: 60 } },
      ndr: { name: 'Net Dollar Retention', typical: { min: 100, max: 130 } },
    },
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Life Sciences',
    description: 'Healthcare providers and life sciences',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 1.0, max: 1.5, mid: 1.25 } },
      finance_ftes_per_1b: { typical: { min: 850, max: 1100, mid: 975 } },
      days_to_close: { typical: { min: 8, max: 14, mid: 11 } },
      dso_days: { typical: { min: 40, max: 70, mid: 55 } },
    },
    businessKpis: {
      ebitda_margin: { name: 'EBITDA Margin', typical: { min: 10, max: 25 } },
    },
  },
  {
    id: 'professional_services',
    name: 'Professional Services',
    description: 'Consulting, legal, accounting firms',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 0.8, max: 1.3, mid: 1.05 } },
      finance_ftes_per_1b: { typical: { min: 600, max: 850, mid: 725 } },
      days_to_close: { typical: { min: 5, max: 8, mid: 6.5 } },
      dso_days: { typical: { min: 50, max: 90, mid: 70 } },
    },
    businessKpis: {
      utilisation_rate: { name: 'Utilisation Rate', typical: { min: 65, max: 85 } },
      revenue_per_fte: { name: 'Revenue per FTE (£k)', typical: { min: 150, max: 300 } },
    },
  },
  // NEW INDUSTRIES - Expanded from ONS SIC codes, Companies House, LG Inform
  {
    id: 'insurance',
    name: 'Insurance',
    description: 'Life, general, and reinsurance carriers. Source: ONS Financial Services, PRA Data',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 0.9, max: 1.4, mid: 1.15 } },
      finance_ftes_per_1b: { typical: { min: 750, max: 1000, mid: 875 } },
      days_to_close: { typical: { min: 7, max: 12, mid: 9.5 }, 'constancia_good': { min: 4, max: 7, mid: 5.5 } },
      budget_cycle_days: { typical: { min: 100, max: 140, mid: 120 }, 'constancia_good': { min: 70, max: 100, mid: 85 } },
      forecast_cycle_days: { typical: { min: 18, max: 28, mid: 23 }, 'constancia_good': { min: 10, max: 18, mid: 14 } },
      consolidation_cycle_days: { typical: { min: 8, max: 14, mid: 11 }, 'constancia_good': { min: 4, max: 7, mid: 5.5 } },
      reports_automated_pct: { typical: { min: 25, max: 45, mid: 35 }, 'constancia_good': { min: 65, max: 80, mid: 72 } },
    },
    businessKpis: {
      combined_ratio: { name: 'Combined Ratio', typical: { min: 95, max: 105 }, 'constancia_good': { min: 90, max: 98 } },
      solvency_ratio: { name: 'Solvency II Ratio', typical: { min: 140, max: 180 } },
      loss_ratio: { name: 'Loss Ratio', typical: { min: 60, max: 75 } },
    },
  },
  {
    id: 'asset_management',
    name: 'Asset Management',
    description: 'Investment management, hedge funds, private equity. Source: FCA Data, ONS',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 0.6, max: 1.0, mid: 0.8 } },
      finance_ftes_per_1b: { typical: { min: 500, max: 750, mid: 625 } },
      days_to_close: { typical: { min: 5, max: 9, mid: 7 }, 'constancia_good': { min: 3, max: 5, mid: 4 } },
      forecast_cycle_days: { typical: { min: 12, max: 22, mid: 17 }, 'constancia_good': { min: 7, max: 12, mid: 9.5 } },
    },
    businessKpis: {
      aum_per_employee: { name: 'AUM per Employee (£M)', typical: { min: 100, max: 500 } },
      cost_income_ratio: { name: 'Cost/Income Ratio', typical: { min: 55, max: 75 }, 'constancia_good': { min: 45, max: 60 } },
      management_fee_margin: { name: 'Mgmt Fee Margin (bps)', typical: { min: 40, max: 80 } },
    },
  },
  {
    id: 'construction',
    name: 'Construction & Engineering',
    description: 'Building, civil engineering, specialist trades. Source: ONS Construction Statistics, CITB',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 1.0, max: 1.6, mid: 1.3 } },
      finance_ftes_per_1b: { typical: { min: 900, max: 1200, mid: 1050 } },
      days_to_close: { typical: { min: 10, max: 15, mid: 12.5 }, 'constancia_good': { min: 6, max: 9, mid: 7.5 } },
      budget_cycle_days: { typical: { min: 90, max: 130, mid: 110 } },
      forecast_cycle_days: { typical: { min: 18, max: 30, mid: 24 } },
      dso_days: { typical: { min: 55, max: 90, mid: 72 } },
      dpo_days: { typical: { min: 45, max: 75, mid: 60 } },
    },
    businessKpis: {
      gross_margin: { name: 'Gross Margin', typical: { min: 8, max: 18 } },
      bid_win_rate: { name: 'Bid Win Rate %', typical: { min: 15, max: 35 } },
      project_on_time_pct: { name: 'Projects On Time %', typical: { min: 60, max: 80 } },
    },
  },
  {
    id: 'real_estate',
    name: 'Real Estate & Property',
    description: 'REITs, property development, estate management. Source: RICS, Companies House',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 0.7, max: 1.2, mid: 0.95 } },
      finance_ftes_per_1b: { typical: { min: 450, max: 700, mid: 575 } },
      days_to_close: { typical: { min: 8, max: 13, mid: 10.5 }, 'constancia_good': { min: 5, max: 8, mid: 6.5 } },
      dso_days: { typical: { min: 20, max: 45, mid: 32 } },
    },
    businessKpis: {
      nav_growth: { name: 'NAV Growth %', typical: { min: 2, max: 8 } },
      occupancy_rate: { name: 'Occupancy Rate %', typical: { min: 88, max: 96 } },
      yield: { name: 'Net Initial Yield %', typical: { min: 4, max: 7 } },
    },
  },
  {
    id: 'telecommunications',
    name: 'Telecommunications',
    description: 'Fixed line, mobile, broadband providers. Source: Ofcom Data, ONS',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 0.8, max: 1.3, mid: 1.05 } },
      finance_ftes_per_1b: { typical: { min: 650, max: 900, mid: 775 } },
      days_to_close: { typical: { min: 6, max: 10, mid: 8 }, 'constancia_good': { min: 4, max: 6, mid: 5 } },
      forecast_cycle_days: { typical: { min: 14, max: 22, mid: 18 } },
      dso_days: { typical: { min: 25, max: 45, mid: 35 } },
    },
    businessKpis: {
      arpu: { name: 'ARPU (£)', typical: { min: 15, max: 45 } },
      churn_rate: { name: 'Monthly Churn %', typical: { min: 1.0, max: 2.5 }, 'constancia_good': { min: 0.5, max: 1.2 } },
      ebitda_margin: { name: 'EBITDA Margin %', typical: { min: 25, max: 40 } },
    },
  },
  {
    id: 'media_entertainment',
    name: 'Media & Entertainment',
    description: 'Broadcasting, publishing, streaming, gaming. Source: ONS Creative Industries',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 0.9, max: 1.5, mid: 1.2 } },
      finance_ftes_per_1b: { typical: { min: 800, max: 1100, mid: 950 } },
      days_to_close: { typical: { min: 7, max: 12, mid: 9.5 }, 'constancia_good': { min: 4, max: 7, mid: 5.5 } },
      forecast_cycle_days: { typical: { min: 15, max: 25, mid: 20 } },
    },
    businessKpis: {
      content_cost_pct: { name: 'Content Cost % Revenue', typical: { min: 30, max: 55 } },
      subscriber_growth: { name: 'Subscriber Growth %', typical: { min: 2, max: 15 } },
      engagement_time: { name: 'Avg Engagement (hrs/week)', typical: { min: 3, max: 12 } },
    },
  },
  {
    id: 'transport_logistics',
    name: 'Transport & Logistics',
    description: 'Freight, shipping, warehousing, delivery. Source: DfT Statistics, ONS',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 0.9, max: 1.4, mid: 1.15 } },
      finance_ftes_per_1b: { typical: { min: 700, max: 1000, mid: 850 } },
      days_to_close: { typical: { min: 8, max: 13, mid: 10.5 } },
      dio_days: { typical: { min: 5, max: 15, mid: 10 } },
      dso_days: { typical: { min: 35, max: 60, mid: 47 } },
      dpo_days: { typical: { min: 25, max: 45, mid: 35 } },
    },
    businessKpis: {
      operating_ratio: { name: 'Operating Ratio %', typical: { min: 88, max: 96 } },
      fleet_utilisation: { name: 'Fleet Utilisation %', typical: { min: 70, max: 90 } },
      cost_per_mile: { name: 'Cost per Mile (£)', typical: { min: 1.2, max: 2.5 } },
    },
  },
  {
    id: 'hospitality',
    name: 'Hospitality & Leisure',
    description: 'Hotels, restaurants, travel, recreation. Source: ONS Tourism Statistics',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 1.0, max: 1.6, mid: 1.3 } },
      finance_ftes_per_1b: { typical: { min: 850, max: 1150, mid: 1000 } },
      days_to_close: { typical: { min: 8, max: 14, mid: 11 } },
      forecast_cycle_days: { typical: { min: 12, max: 22, mid: 17 } },
      dso_days: { typical: { min: 8, max: 25, mid: 16 } },
      dio_days: { typical: { min: 5, max: 15, mid: 10 } },
    },
    businessKpis: {
      revpar: { name: 'RevPAR (£)', typical: { min: 50, max: 120 } },
      occupancy: { name: 'Occupancy Rate %', typical: { min: 60, max: 80 } },
      adr: { name: 'ADR (£)', typical: { min: 80, max: 180 } },
    },
  },
  {
    id: 'pharma_biotech',
    name: 'Pharmaceuticals & Biotech',
    description: 'Drug development, biotech, medical devices. Source: ABPI, ONS Life Sciences',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 1.1, max: 1.7, mid: 1.4 } },
      finance_ftes_per_1b: { typical: { min: 900, max: 1300, mid: 1100 } },
      days_to_close: { typical: { min: 9, max: 15, mid: 12 }, 'constancia_good': { min: 5, max: 9, mid: 7 } },
      budget_cycle_days: { typical: { min: 110, max: 160, mid: 135 } },
      forecast_cycle_days: { typical: { min: 20, max: 35, mid: 27 } },
      dio_days: { typical: { min: 80, max: 150, mid: 115 } },
      dso_days: { typical: { min: 45, max: 80, mid: 62 } },
    },
    businessKpis: {
      r_d_pct_revenue: { name: 'R&D % Revenue', typical: { min: 15, max: 30 } },
      gross_margin: { name: 'Gross Margin %', typical: { min: 65, max: 85 } },
      pipeline_value: { name: 'Pipeline NPV (£B)', typical: { min: 1, max: 20 } },
    },
  },
  {
    id: 'energy_oil_gas',
    name: 'Oil, Gas & Energy',
    description: 'Exploration, production, refining, renewables. Source: OGUK, BEIS Statistics',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 0.6, max: 1.0, mid: 0.8 } },
      finance_ftes_per_1b: { typical: { min: 400, max: 650, mid: 525 } },
      days_to_close: { typical: { min: 6, max: 10, mid: 8 }, 'constancia_good': { min: 3, max: 6, mid: 4.5 } },
      forecast_cycle_days: { typical: { min: 15, max: 25, mid: 20 } },
    },
    businessKpis: {
      production_cost: { name: 'Production Cost ($/boe)', typical: { min: 8, max: 25 } },
      reserve_replacement: { name: 'Reserve Replacement %', typical: { min: 80, max: 150 } },
      roace: { name: 'ROACE %', typical: { min: 8, max: 18 } },
    },
  },
  {
    id: 'mining_metals',
    name: 'Mining & Metals',
    description: 'Extraction, processing, metals production. Source: ONS Mining, MPA',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 0.7, max: 1.2, mid: 0.95 } },
      finance_ftes_per_1b: { typical: { min: 500, max: 750, mid: 625 } },
      days_to_close: { typical: { min: 8, max: 14, mid: 11 } },
      dio_days: { typical: { min: 30, max: 70, mid: 50 } },
    },
    businessKpis: {
      all_in_sustaining_cost: { name: 'AISC ($/oz)', typical: { min: 800, max: 1200 } },
      ebitda_margin: { name: 'EBITDA Margin %', typical: { min: 25, max: 45 } },
      ore_grade: { name: 'Ore Grade Recovery %', typical: { min: 85, max: 95 } },
    },
  },
  {
    id: 'consumer_goods',
    name: 'Consumer Goods (FMCG)',
    description: 'Food, beverage, household products. Source: Nielsen, ONS Retail',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 0.8, max: 1.3, mid: 1.05 } },
      finance_ftes_per_1b: { typical: { min: 700, max: 950, mid: 825 } },
      days_to_close: { typical: { min: 6, max: 10, mid: 8 } },
      dio_days: { typical: { min: 35, max: 60, mid: 47 } },
      dso_days: { typical: { min: 25, max: 45, mid: 35 } },
      dpo_days: { typical: { min: 40, max: 70, mid: 55 } },
    },
    businessKpis: {
      market_share: { name: 'Market Share %', typical: { min: 5, max: 25 } },
      gross_margin: { name: 'Gross Margin %', typical: { min: 30, max: 50 } },
      innovation_revenue_pct: { name: 'Innovation Revenue %', typical: { min: 5, max: 15 } },
    },
  },
  {
    id: 'automotive',
    name: 'Automotive',
    description: 'Vehicle manufacturing, components, dealers. Source: SMMT, ONS Manufacturing',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 0.9, max: 1.4, mid: 1.15 } },
      finance_ftes_per_1b: { typical: { min: 750, max: 1050, mid: 900 } },
      days_to_close: { typical: { min: 7, max: 12, mid: 9.5 }, 'constancia_good': { min: 4, max: 7, mid: 5.5 } },
      dio_days: { typical: { min: 25, max: 55, mid: 40 } },
      dpo_days: { typical: { min: 45, max: 80, mid: 62 } },
    },
    businessKpis: {
      units_per_employee: { name: 'Units per Employee', typical: { min: 15, max: 35 } },
      warranty_cost_pct: { name: 'Warranty Cost % Revenue', typical: { min: 1.5, max: 3.5 } },
      capacity_utilisation: { name: 'Capacity Utilisation %', typical: { min: 70, max: 90 } },
    },
  },
  {
    id: 'aerospace_defence',
    name: 'Aerospace & Defence',
    description: 'Aircraft, defence systems, space. Source: ADS Group, MOD Statistics',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 1.0, max: 1.5, mid: 1.25 } },
      finance_ftes_per_1b: { typical: { min: 800, max: 1100, mid: 950 } },
      days_to_close: { typical: { min: 10, max: 16, mid: 13 } },
      budget_cycle_days: { typical: { min: 120, max: 180, mid: 150 } },
      forecast_cycle_days: { typical: { min: 20, max: 35, mid: 27 } },
      dio_days: { typical: { min: 100, max: 200, mid: 150 } },
    },
    businessKpis: {
      order_book_coverage: { name: 'Order Book (years)', typical: { min: 2, max: 6 } },
      ebit_margin: { name: 'EBIT Margin %', typical: { min: 8, max: 14 } },
      on_time_delivery: { name: 'On-Time Delivery %', typical: { min: 85, max: 95 } },
    },
  },
  {
    id: 'public_sector',
    name: 'Public Sector & Government',
    description: 'Central/local government, NHS, education. Source: LG Inform, NAO, ONS Public Sector',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 1.2, max: 1.8, mid: 1.5 } },
      finance_ftes_per_1b: { typical: { min: 1000, max: 1400, mid: 1200 } },
      days_to_close: { typical: { min: 12, max: 20, mid: 16 }, 'constancia_good': { min: 7, max: 12, mid: 9.5 } },
      budget_cycle_days: { typical: { min: 150, max: 200, mid: 175 }, 'constancia_good': { min: 100, max: 140, mid: 120 } },
      forecast_cycle_days: { typical: { min: 25, max: 40, mid: 32 } },
      reports_automated_pct: { typical: { min: 15, max: 35, mid: 25 }, 'constancia_good': { min: 50, max: 70, mid: 60 } },
    },
    businessKpis: {
      budget_variance: { name: 'Budget Variance %', typical: { min: 2, max: 8 }, 'constancia_good': { min: 0, max: 2 } },
      cost_per_transaction: { name: 'Cost per Transaction (£)', typical: { min: 5, max: 15 } },
      citizen_satisfaction: { name: 'Citizen Satisfaction %', typical: { min: 60, max: 80 } },
    },
  },
  {
    id: 'not_for_profit',
    name: 'Not-for-Profit & Charities',
    description: 'Charities, NGOs, social enterprises. Source: Charity Commission, NCVO',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 1.3, max: 2.0, mid: 1.65 } },
      finance_ftes_per_1b: { typical: { min: 1100, max: 1500, mid: 1300 } },
      days_to_close: { typical: { min: 12, max: 20, mid: 16 } },
      budget_cycle_days: { typical: { min: 100, max: 150, mid: 125 } },
    },
    businessKpis: {
      programme_spend_ratio: { name: 'Programme Spend %', typical: { min: 75, max: 90 } },
      fundraising_roi: { name: 'Fundraising ROI', typical: { min: 2.5, max: 5.0 } },
      reserves_months: { name: 'Reserves (months)', typical: { min: 3, max: 9 } },
    },
  },
  {
    id: 'education',
    name: 'Higher Education',
    description: 'Universities, colleges, research institutions. Source: HESA, DfE Statistics',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 1.1, max: 1.6, mid: 1.35 } },
      finance_ftes_per_1b: { typical: { min: 950, max: 1250, mid: 1100 } },
      days_to_close: { typical: { min: 10, max: 18, mid: 14 } },
      budget_cycle_days: { typical: { min: 120, max: 170, mid: 145 } },
    },
    businessKpis: {
      staff_cost_pct: { name: 'Staff Costs % Income', typical: { min: 52, max: 62 } },
      surplus_pct: { name: 'Operating Surplus %', typical: { min: 1, max: 5 } },
      research_income_pct: { name: 'Research Income %', typical: { min: 10, max: 30 } },
    },
  },
  {
    id: 'agriculture',
    name: 'Agriculture & Farming',
    description: 'Crop production, livestock, agribusiness. Source: DEFRA Statistics, ONS',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 1.4, max: 2.2, mid: 1.8 } },
      finance_ftes_per_1b: { typical: { min: 1200, max: 1600, mid: 1400 } },
      days_to_close: { typical: { min: 12, max: 20, mid: 16 } },
      forecast_cycle_days: { typical: { min: 20, max: 35, mid: 27 } },
      dio_days: { typical: { min: 60, max: 120, mid: 90 } },
    },
    businessKpis: {
      yield_per_hectare: { name: 'Yield per Hectare (tonnes)', typical: { min: 6, max: 10 } },
      gross_margin_per_ha: { name: 'Gross Margin £/ha', typical: { min: 400, max: 800 } },
      subsidy_income_pct: { name: 'Subsidy Income %', typical: { min: 10, max: 30 } },
    },
  },
  {
    id: 'chemicals',
    name: 'Chemicals & Materials',
    description: 'Basic and specialty chemicals, plastics. Source: CIA, ONS Manufacturing',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 0.9, max: 1.4, mid: 1.15 } },
      finance_ftes_per_1b: { typical: { min: 700, max: 1000, mid: 850 } },
      days_to_close: { typical: { min: 8, max: 13, mid: 10.5 } },
      dio_days: { typical: { min: 45, max: 85, mid: 65 } },
      dpo_days: { typical: { min: 40, max: 65, mid: 52 } },
    },
    businessKpis: {
      ebitda_margin: { name: 'EBITDA Margin %', typical: { min: 12, max: 22 } },
      capacity_utilisation: { name: 'Capacity Utilisation %', typical: { min: 75, max: 92 } },
      safety_incident_rate: { name: 'TRIR (per 200k hrs)', typical: { min: 0.5, max: 2.5 } },
    },
  },
  {
    id: 'private_equity',
    name: 'Private Equity & Venture Capital',
    description: 'PE funds, VC, portfolio companies. Source: BVCA, Invest Europe',
    overrides: {
      finance_cost_pct_revenue: { typical: { min: 0.5, max: 0.9, mid: 0.7 } },
      finance_ftes_per_1b: { typical: { min: 350, max: 550, mid: 450 } },
      days_to_close: { typical: { min: 5, max: 10, mid: 7.5 } },
      forecast_cycle_days: { typical: { min: 10, max: 18, mid: 14 } },
    },
    businessKpis: {
      irr: { name: 'Net IRR %', typical: { min: 12, max: 25 } },
      multiple: { name: 'TVPI Multiple', typical: { min: 1.4, max: 2.2 } },
      deployment_rate: { name: 'Capital Deployment %', typical: { min: 70, max: 95 } },
    },
  },
];

// ============================================
// BENCHMARK DATA SOURCES REFERENCE (UK Open Source Only)
// ============================================

export const BENCHMARK_SOURCES = [
  {
    id: 'constancia',
    name: 'Constancia Benchmark Database',
    description: 'Proprietary analysis methodology with 40+ years combined consulting experience, validated against client engagements',
    url: 'https://constancia.io/',
    type: 'proprietary' as const,
  },
  {
    id: 'ons',
    name: 'ONS UK Statistics',
    description: 'Office for National Statistics open data',
    url: 'https://www.ons.gov.uk/',
    type: 'government' as const,
  },
  {
    id: 'lg_inform',
    name: 'LG Inform',
    description: 'Local Government Association benchmarking',
    url: 'https://www.local.gov.uk/lg-inform',
    type: 'government' as const,
  },
  {
    id: 'companies_house',
    name: 'Companies House',
    description: 'UK company financial filings analysis',
    url: 'https://www.gov.uk/government/organisations/companies-house',
    type: 'government' as const,
  },
  {
    id: 'nao',
    name: 'National Audit Office',
    description: 'UK public sector audit and efficiency studies',
    url: 'https://www.nao.org.uk/',
    type: 'government' as const,
  },
  {
    id: 'obr',
    name: 'Office for Budget Responsibility',
    description: 'UK fiscal data, economic forecasts, and historical public finance records',
    url: 'https://obr.uk/data/',
    type: 'government' as const,
  },
  {
    id: 'fca',
    name: 'Financial Conduct Authority',
    description: 'UK financial services regulatory data and market statistics',
    url: 'https://www.fca.org.uk/data',
    type: 'government' as const,
  },
  {
    id: 'hesa',
    name: 'Higher Education Statistics Agency',
    description: 'UK university and higher education finance and performance data',
    url: 'https://www.hesa.ac.uk/',
    type: 'government' as const,
  },
  {
    id: 'charity_commission',
    name: 'Charity Commission',
    description: 'UK charity financial filings and governance data',
    url: 'https://www.gov.uk/government/organisations/charity-commission',
    type: 'government' as const,
  },
  {
    id: 'defra',
    name: 'DEFRA Statistics',
    description: 'UK agriculture, food, and rural affairs data',
    url: 'https://www.gov.uk/government/organisations/department-for-environment-food-rural-affairs',
    type: 'government' as const,
  },
  {
    id: 'dft',
    name: 'Department for Transport',
    description: 'UK transport and logistics statistics',
    url: 'https://www.gov.uk/government/organisations/department-for-transport',
    type: 'government' as const,
  },
  {
    id: 'ofcom',
    name: 'Ofcom',
    description: 'UK communications industry data and market research',
    url: 'https://www.ofcom.org.uk/research-and-data',
    type: 'government' as const,
  },
  {
    id: 'data_gov_uk',
    name: 'data.gov.uk',
    description: 'UK government open data portal with 50,000+ datasets',
    url: 'https://www.data.gov.uk/',
    type: 'government' as const,
  },
];

// ============================================
// EPM TRANSFORMATION IMPROVEMENT FACTORS
// ============================================

export interface TransformationFactors {
  metricId: string;
  withEpm: {
    improvementPct: number;
    targetTier: BenchmarkTier;
  };
  withDigitalEpm: {
    improvementPct: number;
    targetTier: BenchmarkTier;
  };
}

export const TRANSFORMATION_FACTORS: TransformationFactors[] = [
  { metricId: 'finance_cost_pct_revenue', withEpm: { improvementPct: 36, targetTier: 'constancia_good' }, withDigitalEpm: { improvementPct: 44, targetTier: 'constancia_best' } },
  { metricId: 'finance_ftes_per_1b', withEpm: { improvementPct: 45, targetTier: 'constancia_good' }, withDigitalEpm: { improvementPct: 58, targetTier: 'constancia_best' } },
  { metricId: 'days_to_close', withEpm: { improvementPct: 55, targetTier: 'constancia_good' }, withDigitalEpm: { improvementPct: 85, targetTier: 'constancia_best' } },
  { metricId: 'forecast_cycle_days', withEpm: { improvementPct: 50, targetTier: 'constancia_good' }, withDigitalEpm: { improvementPct: 75, targetTier: 'constancia_best' } },
  { metricId: 'consolidation_cycle_days', withEpm: { improvementPct: 70, targetTier: 'constancia_good' }, withDigitalEpm: { improvementPct: 87, targetTier: 'constancia_best' } },
  { metricId: 'forecast_accuracy_pct', withEpm: { improvementPct: 10, targetTier: 'constancia_good' }, withDigitalEpm: { improvementPct: 15, targetTier: 'constancia_best' } },
  { metricId: 'reports_automated_pct', withEpm: { improvementPct: 100, targetTier: 'constancia_good' }, withDigitalEpm: { improvementPct: 200, targetTier: 'constancia_best' } },
  { metricId: 'manual_reconciliations', withEpm: { improvementPct: 75, targetTier: 'constancia_good' }, withDigitalEpm: { improvementPct: 95, targetTier: 'constancia_best' } },
  { metricId: 'data_entry_errors_pct', withEpm: { improvementPct: 90, targetTier: 'constancia_good' }, withDigitalEpm: { improvementPct: 98, targetTier: 'constancia_best' } },
  { metricId: 'close_fte_hours', withEpm: { improvementPct: 55, targetTier: 'constancia_good' }, withDigitalEpm: { improvementPct: 85, targetTier: 'constancia_best' } },
  { metricId: 'self_service_adoption_pct', withEpm: { improvementPct: 130, targetTier: 'constancia_good' }, withDigitalEpm: { improvementPct: 250, targetTier: 'constancia_best' } },
];

// ============================================
// DATA STANDARDS IMPACT
// ============================================

export const DATA_STANDARDS_IMPACT = {
  low: { financeCostPctRevenue: 1.76, financeFtesPer1b: 1320 },
  medium: { financeCostPctRevenue: 1.32, financeFtesPer1b: 1000 },
  high: { financeCostPctRevenue: 0.69, financeFtesPer1b: 525 },
  'constancia_best': { financeCostPctRevenue: 0.54, financeFtesPer1b: 400 },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getMetricById(metricId: string): BenchmarkMetric | undefined {
  return BENCHMARK_METRICS.find(m => m.id === metricId);
}

export function getIndustryById(industryId: string): Industry | undefined {
  return INDUSTRIES.find(i => i.id === industryId);
}

export function getMetricBenchmarks(
  metricId: string,
  industryId: string = 'cross_industry'
): BenchmarkMetric | undefined {
  const baseMetric = getMetricById(metricId);
  if (!baseMetric) return undefined;

  const industry = getIndustryById(industryId);
  if (!industry || industryId === 'cross_industry') {
    return baseMetric;
  }

  const overrides = industry.overrides[metricId];
  if (!overrides) return baseMetric;

  return {
    ...baseMetric,
    typical: overrides.typical || baseMetric.typical,
    'constancia_good': overrides['constancia_good'] || baseMetric['constancia_good'],
    'constancia_best': overrides['constancia_best'] || baseMetric['constancia_best'],
  };
}

export function calculateAsIsVsToBe(
  currentValue: number,
  metricId: string,
  industryId: string = 'cross_industry',
  targetTier: BenchmarkTier = 'constancia_good'
): {
  current: number;
  typical: BenchmarkRange;
  target: BenchmarkRange;
  gap: number;
  gapPct: number;
  performanceLevel: 'below_typical' | 'typical' | 'constancia_good' | 'constancia_best';
} | undefined {
  const metric = getMetricBenchmarks(metricId, industryId);
  if (!metric) return undefined;

  let target: BenchmarkRange;
  switch (targetTier) {
    case 'constancia_best':
      target = metric['constancia_best'] || metric['constancia_good'];
      break;
    default:
      target = metric['constancia_good'];
  }

  const typicalMid = metric.typical.mid || (metric.typical.min + metric.typical.max) / 2;
  const targetMid = target.mid || (target.min + target.max) / 2;
  
  let gap: number;
  let gapPct: number;
  
  if (metric.lowerIsBetter) {
    // For metrics where lower is better (e.g., days to close)
    // Gap is how much we need to reduce: currentValue - targetMid
    // GapPct is the percentage reduction needed relative to current value
    gap = currentValue - targetMid;
    gapPct = currentValue > 0 ? (gap / currentValue) * 100 : 0;
  } else {
    // For metrics where higher is better (e.g., forecast accuracy)
    // Gap is how much we need to increase: targetMid - currentValue
    // GapPct is the percentage increase needed relative to current value
    gap = targetMid - currentValue;
    gapPct = currentValue > 0 ? (gap / currentValue) * 100 : 0;
  }

  let performanceLevel: 'below_typical' | 'typical' | 'constancia_good' | 'constancia_best';
  
  if (metric.lowerIsBetter) {
    if (metric['constancia_best'] && currentValue <= metric['constancia_best'].max) {
      performanceLevel = 'constancia_best';
    } else if (currentValue <= metric['constancia_good'].max) {
      performanceLevel = 'constancia_good';
    } else if (currentValue <= metric.typical.max) {
      performanceLevel = 'typical';
    } else {
      performanceLevel = 'below_typical';
    }
  } else {
    if (metric['constancia_best'] && currentValue >= metric['constancia_best'].min) {
      performanceLevel = 'constancia_best';
    } else if (currentValue >= metric['constancia_good'].min) {
      performanceLevel = 'constancia_good';
    } else if (currentValue >= metric.typical.min) {
      performanceLevel = 'typical';
    } else {
      performanceLevel = 'below_typical';
    }
  }

  return {
    current: currentValue,
    typical: metric.typical,
    target,
    gap: Math.round(gap * 100) / 100,
    gapPct: Math.round(gapPct * 10) / 10,
    performanceLevel,
  };
}

export function getCategoryMetrics(category: BenchmarkMetric['category']): BenchmarkMetric[] {
  return BENCHMARK_METRICS.filter(m => m.category === category);
}

export const BENCHMARK_CATEGORIES = [
  { id: 'finance_cost', name: 'Finance Cost & FTE', icon: 'DollarSign' },
  { id: 'cycle_time', name: 'Cycle Times', icon: 'Clock' },
  { id: 'planning', name: 'Planning & Forecasting', icon: 'Target' },
  { id: 'consolidation', name: 'Consolidation & Close', icon: 'Layers' },
  { id: 'reporting', name: 'Reporting & Analytics', icon: 'BarChart3' },
  { id: 'working_capital', name: 'Working Capital', icon: 'Wallet' },
  { id: 'accounts_payable', name: 'Accounts Payable', icon: 'CreditCard' },
  { id: 'accounts_receivable', name: 'Accounts Receivable', icon: 'Receipt' },
] as const;
