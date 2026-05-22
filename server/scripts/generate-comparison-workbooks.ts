import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

const BRAND = {
  navy: '02205B',
  cyan: '12EBFC',
  teal: '0884AA',
  cream: 'FEFFF3',
  white: 'FFFFFF',
};

interface Platform {
  id: string;
  name: string;
  shortName: string;
  marketPosition: string;
  priceRange: string;
  priceTier: number;
  implementationTime: string;
  bestFor: string;
  scores: Record<string, number>;
}

interface Category {
  id: string;
  name: string;
  weight: number;
  description: string;
}

const epmCategories: Category[] = [
  { id: "consolidationClose", name: "Consolidation & Close", weight: 17, description: "Multi-entity consolidation, intercompany eliminations, financial close management" },
  { id: "planningForecasting", name: "Planning & Forecasting", weight: 18, description: "Budgeting, forecasting, scenario modelling, driver-based planning" },
  { id: "aiAutomation", name: "AI & Automation", weight: 16, description: "Predictive analytics, anomaly detection, intelligent automation, ML capabilities" },
  { id: "modellingExtensibility", name: "Modelling & Extensibility", weight: 9, description: "Flexible data modelling, custom dimensions, extensibility, and low-code capabilities" },
  { id: "integrationDataFabric", name: "Integration & Data Fabric", weight: 8, description: "ERP/source system connectivity, data integration, API availability" },
  { id: "reportingVisualization", name: "Reporting & Visualisation", weight: 7, description: "Native dashboards, self-service analytics, BI capabilities, data visualisation" },
  { id: "governanceCompliance", name: "Governance & Compliance", weight: 7, description: "Audit trails, security controls, SOX readiness" },
  { id: "regulatoryCompliance", name: "Regulatory Compliance", weight: 8, description: "IFRS, GAAP, statutory reporting, tax compliance, regulatory disclosure automation" },
  { id: "timeToValue", name: "Time-to-Value", weight: 4, description: "Implementation speed, deployment complexity, time to go-live" },
  { id: "totalCostOwnership", name: "Total Cost of Ownership", weight: 4, description: "Licensing, implementation, maintenance, and operational costs" },
  { id: "supportEcosystem", name: "Support & Ecosystem", weight: 2, description: "Partner network, customer support, community resources, vendor stability" },
];

const erpCategories: Category[] = [
  { id: "businessProcessAlignment", name: "Business Process Alignment", weight: 10, description: "How well the ERP aligns with your workflows" },
  { id: "industryCapabilities", name: "Industry-Specific Capabilities", weight: 10, description: "Features tailored to industry requirements" },
  { id: "cloudArchitecture", name: "Cloud Architecture", weight: 8, description: "Cloud-native design, multi-tenant SaaS, deployment flexibility" },
  { id: "reportingAnalytics", name: "Reporting & Analytics", weight: 8, description: "Built-in reporting, dashboards, BI integration" },
  { id: "scalabilityGrowth", name: "Scalability & Future Growth", weight: 8, description: "Ability to scale with users, volume, functionality" },
  { id: "integrationCapabilities", name: "Integration Capabilities", weight: 8, description: "APIs, pre-built connectors, middleware support" },
  { id: "tcoRoi", name: "Total Cost of Ownership & ROI", weight: 10, description: "Full lifetime cost vs expected ROI" },
  { id: "aiAutomation", name: "AI & Automation", weight: 8, description: "Built-in AI/ML capabilities, intelligent automation" },
  { id: "vendorSupport", name: "Vendor Support & Training", weight: 5, description: "SLA levels, local consultants, training programs" },
  { id: "customizationFlexibility", name: "Customization & Flexibility", weight: 6, description: "Configuration tools, custom modules, extension frameworks" },
  { id: "implementationTime", name: "Implementation Time & Complexity", weight: 6, description: "Project timeline, partner availability" },
  { id: "userExperience", name: "User Experience & Adoption", weight: 6, description: "Interface design, mobile access, learning curve" },
  { id: "securityCompliance", name: "Security & Compliance", weight: 5, description: "Data encryption, access controls, audit logging" },
  { id: "aiEcosystemFit", name: "AI Ecosystem Fit", weight: 5, description: "Openness to external AI tools, API extensibility" },
];

const epmPlatforms: Platform[] = [
  { id: "onestream", name: "OneStream", shortName: "OneStream", marketPosition: "Leader", priceRange: "£150K-£500K+/year", priceTier: 4, implementationTime: "9-18 months", bestFor: "Large enterprises with complex consolidation needs", scores: { consolidationClose: 9.5, planningForecasting: 9.0, aiAutomation: 8.8, modellingExtensibility: 9.0, integrationDataFabric: 9.0, reportingVisualization: 8.0, governanceCompliance: 9.2, regulatoryCompliance: 8.5, timeToValue: 5.5, totalCostOwnership: 5.5, supportEcosystem: 8.8 } },
  { id: "anaplan", name: "Anaplan", shortName: "Anaplan", marketPosition: "Leader", priceRange: "£100K-£400K/year", priceTier: 4, implementationTime: "6-12 months", bestFor: "Dynamic FP&A and connected planning at scale", scores: { consolidationClose: 6.0, planningForecasting: 9.5, aiAutomation: 8.5, modellingExtensibility: 9.5, integrationDataFabric: 8.5, reportingVisualization: 7.5, governanceCompliance: 8.0, regulatoryCompliance: 5.5, timeToValue: 6.0, totalCostOwnership: 5.0, supportEcosystem: 8.5 } },
  { id: "workday-adaptive", name: "Workday Adaptive Planning", shortName: "Adaptive", marketPosition: "Leader", priceRange: "£60K-£200K/year", priceTier: 3, implementationTime: "3-6 months", bestFor: "Mid-market companies needing planning focus", scores: { consolidationClose: 5.0, planningForecasting: 9.0, aiAutomation: 8.0, modellingExtensibility: 7.0, integrationDataFabric: 8.0, reportingVisualization: 8.5, governanceCompliance: 7.5, regulatoryCompliance: 5.0, timeToValue: 8.5, totalCostOwnership: 7.0, supportEcosystem: 8.5 } },
  { id: "oracle-epm", name: "Oracle EPM Cloud", shortName: "Oracle EPM", marketPosition: "Leader", priceRange: "£100K-£500K+/year", priceTier: 4, implementationTime: "6-18 months", bestFor: "Oracle EBS/Fusion customers with complex needs", scores: { consolidationClose: 9.5, planningForecasting: 8.5, aiAutomation: 8.0, modellingExtensibility: 8.0, integrationDataFabric: 9.0, reportingVisualization: 8.0, governanceCompliance: 9.5, regulatoryCompliance: 9.5, timeToValue: 5.0, totalCostOwnership: 5.0, supportEcosystem: 9.0 } },
  { id: "sap-analytics", name: "SAP Analytics Cloud", shortName: "SAC", marketPosition: "Leader", priceRange: "£80K-£300K/year", priceTier: 3, implementationTime: "4-9 months", bestFor: "SAP customers seeking integrated planning", scores: { consolidationClose: 7.5, planningForecasting: 8.5, aiAutomation: 8.5, modellingExtensibility: 7.5, integrationDataFabric: 9.5, reportingVisualization: 9.0, governanceCompliance: 8.5, regulatoryCompliance: 8.0, timeToValue: 6.5, totalCostOwnership: 6.0, supportEcosystem: 8.5 } },
  { id: "wolters-kluwer", name: "Wolters Kluwer CCH Tagetik", shortName: "CCH Tagetik", marketPosition: "Leader", priceRange: "£100K-£350K/year", priceTier: 4, implementationTime: "6-12 months", bestFor: "Regulatory-heavy industries (banking, insurance)", scores: { consolidationClose: 9.5, planningForecasting: 8.0, aiAutomation: 7.5, modellingExtensibility: 8.0, integrationDataFabric: 8.0, reportingVisualization: 7.5, governanceCompliance: 9.5, regulatoryCompliance: 9.8, timeToValue: 5.5, totalCostOwnership: 5.5, supportEcosystem: 8.0 } },
  { id: "pigment", name: "Pigment", shortName: "Pigment", marketPosition: "Challenger", priceRange: "£60K-£150K/year", priceTier: 2, implementationTime: "6-12 weeks", bestFor: "Fast-growing tech companies needing flexibility", scores: { consolidationClose: 4.0, planningForecasting: 9.0, aiAutomation: 8.5, modellingExtensibility: 9.0, integrationDataFabric: 8.5, reportingVisualization: 8.0, governanceCompliance: 6.5, regulatoryCompliance: 4.0, timeToValue: 9.0, totalCostOwnership: 7.5, supportEcosystem: 7.0 } },
  { id: "abacum", name: "Abacum", shortName: "Abacum", marketPosition: "Challenger (FP&A)", priceRange: "£40K-£60K/year", priceTier: 1, implementationTime: "4-6 weeks", bestFor: "Fast-growing SMBs (50-500 employees)", scores: { consolidationClose: 3.5, planningForecasting: 9.0, aiAutomation: 9.0, modellingExtensibility: 7.5, integrationDataFabric: 9.0, reportingVisualization: 7.5, governanceCompliance: 6.0, regulatoryCompliance: 3.0, timeToValue: 9.5, totalCostOwnership: 9.0, supportEcosystem: 7.0 } },
];

const erpPlatforms: Platform[] = [
  { id: "sap-s4hana", name: "SAP S/4HANA Cloud", shortName: "S/4HANA", marketPosition: "Leader", priceRange: "£200K-£1M+/year", priceTier: 5, implementationTime: "12-24 months", bestFor: "Large enterprises with complex global operations", scores: { businessProcessAlignment: 9.5, industryCapabilities: 9.5, cloudArchitecture: 8.5, reportingAnalytics: 8.5, scalabilityGrowth: 9.5, integrationCapabilities: 9.0, tcoRoi: 4.5, aiAutomation: 8.5, vendorSupport: 9.0, customizationFlexibility: 8.5, implementationTime: 4.0, userExperience: 7.0, securityCompliance: 9.5, aiEcosystemFit: 8.0 } },
  { id: "oracle-fusion", name: "Oracle Fusion Cloud ERP", shortName: "Fusion", marketPosition: "Leader", priceRange: "£150K-£800K+/year", priceTier: 5, implementationTime: "9-18 months", bestFor: "Large enterprises needing comprehensive suite", scores: { businessProcessAlignment: 9.0, industryCapabilities: 9.0, cloudArchitecture: 9.0, reportingAnalytics: 9.0, scalabilityGrowth: 9.5, integrationCapabilities: 9.0, tcoRoi: 5.0, aiAutomation: 9.0, vendorSupport: 8.5, customizationFlexibility: 7.5, implementationTime: 5.0, userExperience: 7.5, securityCompliance: 9.5, aiEcosystemFit: 8.5 } },
  { id: "dynamics365", name: "Microsoft Dynamics 365", shortName: "D365", marketPosition: "Leader", priceRange: "£80K-£400K/year", priceTier: 3, implementationTime: "6-12 months", bestFor: "Microsoft-centric organisations", scores: { businessProcessAlignment: 8.5, industryCapabilities: 8.0, cloudArchitecture: 9.0, reportingAnalytics: 9.0, scalabilityGrowth: 9.0, integrationCapabilities: 9.5, tcoRoi: 7.0, aiAutomation: 9.0, vendorSupport: 8.5, customizationFlexibility: 8.0, implementationTime: 7.0, userExperience: 8.5, securityCompliance: 9.0, aiEcosystemFit: 9.5 } },
  { id: "netsuite", name: "Oracle NetSuite", shortName: "NetSuite", marketPosition: "Leader", priceRange: "£40K-£200K/year", priceTier: 2, implementationTime: "3-9 months", bestFor: "Growing mid-market companies", scores: { businessProcessAlignment: 8.0, industryCapabilities: 7.5, cloudArchitecture: 9.5, reportingAnalytics: 7.5, scalabilityGrowth: 8.5, integrationCapabilities: 8.0, tcoRoi: 7.5, aiAutomation: 7.0, vendorSupport: 7.5, customizationFlexibility: 7.5, implementationTime: 8.0, userExperience: 8.0, securityCompliance: 8.5, aiEcosystemFit: 7.5 } },
  { id: "workday-financials", name: "Workday Financial Management", shortName: "Workday", marketPosition: "Leader", priceRange: "£100K-£500K/year", priceTier: 4, implementationTime: "6-12 months", bestFor: "Services organisations and HCM integration", scores: { businessProcessAlignment: 8.0, industryCapabilities: 7.5, cloudArchitecture: 9.5, reportingAnalytics: 9.0, scalabilityGrowth: 9.0, integrationCapabilities: 8.5, tcoRoi: 6.0, aiAutomation: 8.5, vendorSupport: 8.5, customizationFlexibility: 6.5, implementationTime: 7.0, userExperience: 9.0, securityCompliance: 9.0, aiEcosystemFit: 8.0 } },
  { id: "sage-intacct", name: "Sage Intacct", shortName: "Intacct", marketPosition: "Leader", priceRange: "£25K-£100K/year", priceTier: 2, implementationTime: "2-4 months", bestFor: "SMBs and non-profits needing solid financials", scores: { businessProcessAlignment: 7.5, industryCapabilities: 7.0, cloudArchitecture: 9.0, reportingAnalytics: 8.5, scalabilityGrowth: 7.5, integrationCapabilities: 8.5, tcoRoi: 8.5, aiAutomation: 6.5, vendorSupport: 8.0, customizationFlexibility: 7.0, implementationTime: 9.0, userExperience: 8.5, securityCompliance: 8.0, aiEcosystemFit: 7.0 } },
  { id: "acumatica", name: "Acumatica", shortName: "Acumatica", marketPosition: "Challenger", priceRange: "£20K-£80K/year", priceTier: 1, implementationTime: "2-4 months", bestFor: "SMBs needing flexible cloud ERP", scores: { businessProcessAlignment: 7.5, industryCapabilities: 7.0, cloudArchitecture: 9.0, reportingAnalytics: 7.5, scalabilityGrowth: 8.0, integrationCapabilities: 8.5, tcoRoi: 9.0, aiAutomation: 7.0, vendorSupport: 7.5, customizationFlexibility: 8.5, implementationTime: 8.5, userExperience: 8.0, securityCompliance: 7.5, aiEcosystemFit: 7.5 } },
];

async function generateWorkbook(
  type: 'epm' | 'erp',
  platforms: Platform[],
  categories: Category[],
  outputPath: string
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Constancia';
  workbook.created = new Date();
  
  const scoreSheet = workbook.addWorksheet('Vendor Scores', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 3 }]
  });
  
  const weightSheet = workbook.addWorksheet('Weight Configuration');
  const calculatorSheet = workbook.addWorksheet('Score Calculator');
  const instructionsSheet = workbook.addWorksheet('Instructions');
  
  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND.navy}` } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: {
      top: { style: 'thin', color: { argb: `FF${BRAND.teal}` } },
      bottom: { style: 'thin', color: { argb: `FF${BRAND.teal}` } },
      left: { style: 'thin', color: { argb: `FF${BRAND.teal}` } },
      right: { style: 'thin', color: { argb: `FF${BRAND.teal}` } },
    }
  };
  
  const subHeaderStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: `FF${BRAND.navy}` }, size: 10 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND.cyan}` } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  };
  
  scoreSheet.getColumn(1).width = 25;
  for (let i = 2; i <= platforms.length + 1; i++) {
    scoreSheet.getColumn(i).width = 15;
  }
  
  const titleRow = scoreSheet.addRow([`${type.toUpperCase()} Vendor Comparison Scorecard`]);
  titleRow.font = { bold: true, size: 16, color: { argb: `FF${BRAND.navy}` } };
  scoreSheet.mergeCells(1, 1, 1, platforms.length + 1);
  titleRow.getCell(1).alignment = { horizontal: 'center' };
  
  scoreSheet.addRow(['Generated by Constancia - Independent EPM & ERP Advisory']);
  scoreSheet.getRow(2).font = { italic: true, size: 10, color: { argb: `FF${BRAND.teal}` } };
  scoreSheet.mergeCells(2, 1, 2, platforms.length + 1);
  scoreSheet.getRow(2).getCell(1).alignment = { horizontal: 'center' };
  
  const vendorRow = scoreSheet.addRow(['Category / Vendor', ...platforms.map(p => p.shortName)]);
  vendorRow.eachCell((cell, colNumber) => {
    Object.assign(cell, { style: headerStyle });
  });
  vendorRow.height = 30;
  
  const weightTotalRow = categories.reduce((sum, c) => sum + c.weight, 0);
  
  categories.forEach((category, catIndex) => {
    const rowData = [category.name];
    platforms.forEach(platform => {
      const score = platform.scores[category.id] || 0;
      rowData.push(score.toString());
    });
    
    const row = scoreSheet.addRow(rowData);
    row.getCell(1).font = { bold: true };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    
    for (let i = 2; i <= platforms.length + 1; i++) {
      const cell = row.getCell(i);
      cell.alignment = { horizontal: 'center' };
      cell.numFmt = '0.0';
      
      const score = parseFloat(cell.value as string) || 0;
      if (score >= 8.5) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
      } else if (score >= 7) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
      } else if (score < 5) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
      }
    }
  });
  
  scoreSheet.addRow([]);
  
  const priceRow = scoreSheet.addRow(['Price Tier (1-5)', ...platforms.map(p => p.priceTier)]);
  priceRow.getCell(1).font = { bold: true, italic: true };
  for (let i = 2; i <= platforms.length + 1; i++) {
    priceRow.getCell(i).alignment = { horizontal: 'center' };
  }
  
  const implRow = scoreSheet.addRow(['Implementation Time', ...platforms.map(p => p.implementationTime)]);
  implRow.getCell(1).font = { bold: true, italic: true };
  
  const priceRangeRow = scoreSheet.addRow(['Price Range', ...platforms.map(p => p.priceRange)]);
  priceRangeRow.getCell(1).font = { bold: true, italic: true };
  
  weightSheet.getColumn(1).width = 35;
  weightSheet.getColumn(2).width = 15;
  weightSheet.getColumn(3).width = 20;
  weightSheet.getColumn(4).width = 50;
  
  weightSheet.addRow(['Weight Configuration']);
  weightSheet.getRow(1).font = { bold: true, size: 14, color: { argb: `FF${BRAND.navy}` } };
  
  weightSheet.addRow(['Adjust weights below to match your priorities. Total must equal 100%.']);
  weightSheet.getRow(2).font = { italic: true, size: 10, color: { argb: `FF${BRAND.teal}` } };
  
  weightSheet.addRow([]);
  
  const weightHeaderRow = weightSheet.addRow(['Category', 'Weight (%)', 'Normalised', 'Description']);
  weightHeaderRow.eachCell(cell => {
    Object.assign(cell, { style: headerStyle });
  });
  
  categories.forEach((category, index) => {
    const rowNum = 5 + index;
    const row = weightSheet.addRow([category.name, category.weight, '', category.description]);
    row.getCell(2).numFmt = '0';
    row.getCell(3).value = { formula: `B${rowNum}/SUM(B5:B${4 + categories.length})*100` };
    row.getCell(3).numFmt = '0.0"%"';
  });
  
  const totalRow = weightSheet.addRow(['TOTAL', { formula: `SUM(B5:B${4 + categories.length})` }, '100%', '']);
  totalRow.font = { bold: true };
  totalRow.getCell(2).numFmt = '0';
  
  calculatorSheet.getColumn(1).width = 30;
  for (let i = 2; i <= platforms.length + 1; i++) {
    calculatorSheet.getColumn(i).width = 14;
  }
  
  calculatorSheet.addRow(['Weighted Score Calculator']);
  calculatorSheet.getRow(1).font = { bold: true, size: 14, color: { argb: `FF${BRAND.navy}` } };
  
  calculatorSheet.addRow(['Scores are automatically calculated using the formulas below.']);
  calculatorSheet.getRow(2).font = { italic: true, size: 10, color: { argb: `FF${BRAND.teal}` } };
  
  calculatorSheet.addRow([]);
  
  const calcHeaderRow = calculatorSheet.addRow(['Category / Vendor', ...platforms.map(p => p.shortName)]);
  calcHeaderRow.eachCell(cell => {
    Object.assign(cell, { style: headerStyle });
  });
  calcHeaderRow.height = 25;
  
  const scoreStartRow = 4;
  const calcStartRow = 5;
  
  categories.forEach((category, catIndex) => {
    const rowNum = calcStartRow + catIndex;
    const scoreSheetRow = 4 + catIndex;
    const weightSheetRow = 5 + catIndex;
    
    const rowData: (string | { formula: string })[] = [category.name];
    
    platforms.forEach((_, pIndex) => {
      const scoreCol = String.fromCharCode(66 + pIndex);
      const formula = `'Vendor Scores'!${scoreCol}${scoreSheetRow}*('Weight Configuration'!B${weightSheetRow}/100)`;
      rowData.push({ formula });
    });
    
    const row = calculatorSheet.addRow(rowData);
    row.getCell(1).font = { bold: true };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    
    for (let i = 2; i <= platforms.length + 1; i++) {
      row.getCell(i).numFmt = '0.00';
      row.getCell(i).alignment = { horizontal: 'center' };
    }
  });
  
  calculatorSheet.addRow([]);
  
  const totalRowNum = calcStartRow + categories.length + 1;
  const totalFormulas: (string | { formula: string })[] = ['Total (0-10 scale)'];
  platforms.forEach((_, pIndex) => {
    const col = String.fromCharCode(66 + pIndex);
    const formula = `SUM(${col}${calcStartRow}:${col}${calcStartRow + categories.length - 1})`;
    totalFormulas.push({ formula });
  });
  const totalScoreRow = calculatorSheet.addRow(totalFormulas);
  totalScoreRow.font = { bold: true };
  totalScoreRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND.cyan}` } };
  for (let i = 2; i <= platforms.length + 1; i++) {
    totalScoreRow.getCell(i).numFmt = '0.00';
    totalScoreRow.getCell(i).alignment = { horizontal: 'center' };
    totalScoreRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND.cyan}` } };
  }
  
  const displayFormulas: (string | { formula: string })[] = ['Display Score (0-100)'];
  platforms.forEach((_, pIndex) => {
    const col = String.fromCharCode(66 + pIndex);
    displayFormulas.push({ formula: `${col}${totalRowNum}*10` });
  });
  const displayScoreRow = calculatorSheet.addRow(displayFormulas);
  displayScoreRow.font = { bold: true };
  displayScoreRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND.navy}` } };
  displayScoreRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  for (let i = 2; i <= platforms.length + 1; i++) {
    displayScoreRow.getCell(i).numFmt = '0.0';
    displayScoreRow.getCell(i).alignment = { horizontal: 'center' };
    displayScoreRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND.navy}` } };
    displayScoreRow.getCell(i).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  }
  
  calculatorSheet.addRow([]);
  calculatorSheet.addRow([]);
  
  const priceRowNum = scoreStartRow + categories.length + 1;
  calculatorSheet.addRow(['TCO Adjustment Formula']);
  calculatorSheet.getRow(calculatorSheet.rowCount).font = { bold: true, size: 12, color: { argb: `FF${BRAND.navy}` } };
  
  const tcoHeaderRow = calculatorSheet.addRow(['Metric / Vendor', ...platforms.map(p => p.shortName)]);
  tcoHeaderRow.eachCell(cell => {
    Object.assign(cell, { style: subHeaderStyle });
  });
  
  const priceTierValues: (string | number)[] = ['Price Tier'];
  platforms.forEach(p => priceTierValues.push(p.priceTier));
  const priceTierRow = calculatorSheet.addRow(priceTierValues);
  priceTierRow.getCell(1).font = { bold: true };
  for (let i = 2; i <= platforms.length + 1; i++) {
    priceTierRow.getCell(i).alignment = { horizontal: 'center' };
  }
  
  const tcoMultiplierRowNum = calculatorSheet.rowCount + 1;
  const tcoMultiplierFormulas: (string | { formula: string })[] = ['TCO Multiplier'];
  platforms.forEach((_, pIndex) => {
    const col = String.fromCharCode(66 + pIndex);
    const priceTierRef = `${col}${tcoMultiplierRowNum - 1}`;
    tcoMultiplierFormulas.push({ formula: `MAX(0.6,MIN(1.0,1.1-${priceTierRef}*0.1))` });
  });
  const tcoMultiplierRow = calculatorSheet.addRow(tcoMultiplierFormulas);
  tcoMultiplierRow.getCell(1).font = { bold: true };
  for (let i = 2; i <= platforms.length + 1; i++) {
    tcoMultiplierRow.getCell(i).numFmt = '0.00';
    tcoMultiplierRow.getCell(i).alignment = { horizontal: 'center' };
  }
  
  const adjustedFormulas: (string | { formula: string })[] = ['TCO-Adjusted Score'];
  platforms.forEach((_, pIndex) => {
    const col = String.fromCharCode(66 + pIndex);
    adjustedFormulas.push({ formula: `${col}${totalRowNum + 1}*${col}${tcoMultiplierRowNum}` });
  });
  const adjustedScoreRow = calculatorSheet.addRow(adjustedFormulas);
  adjustedScoreRow.font = { bold: true };
  adjustedScoreRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND.teal}` } };
  adjustedScoreRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  for (let i = 2; i <= platforms.length + 1; i++) {
    adjustedScoreRow.getCell(i).numFmt = '0.0';
    adjustedScoreRow.getCell(i).alignment = { horizontal: 'center' };
    adjustedScoreRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND.teal}` } };
    adjustedScoreRow.getCell(i).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  }
  
  calculatorSheet.addRow([]);
  calculatorSheet.addRow(['Formula Reference:']);
  calculatorSheet.getRow(calculatorSheet.rowCount).font = { bold: true };
  calculatorSheet.addRow(['• Weighted Score = Category Score × (Weight / 100)']);
  calculatorSheet.addRow(['• Total Score = Sum of all weighted scores (0-10 scale)']);
  calculatorSheet.addRow(['• Display Score = Total Score × 10 (0-100 scale)']);
  calculatorSheet.addRow(['• TCO Multiplier = MAX(0.6, MIN(1.0, 1.1 - PriceTier × 0.1))']);
  calculatorSheet.addRow(['• TCO-Adjusted Score = Display Score × TCO Multiplier']);
  
  instructionsSheet.getColumn(1).width = 80;
  
  instructionsSheet.addRow([`Constancia ${type.toUpperCase()} Selection Toolkit - Instructions`]);
  instructionsSheet.getRow(1).font = { bold: true, size: 16, color: { argb: `FF${BRAND.navy}` } };
  
  instructionsSheet.addRow(['']);
  instructionsSheet.addRow(['How to Use This Workbook:']);
  instructionsSheet.getRow(3).font = { bold: true, size: 12 };
  
  const instructions = [
    '1. Review the vendor scores on the "Vendor Scores" sheet',
    '2. Adjust category weights on the "Weight Configuration" sheet to match your priorities',
    '3. The normalised weights will automatically recalculate',
    '4. Use the Score Calculator formulas to compute weighted scores',
    '5. Consider implementation time and price range for your final decision',
    '',
    'About the Scores:',
    '• Scores are from 1-10 based on Constancia\'s independent research',
    '• Higher scores indicate stronger capability in that category',
    '• Green cells (8.5+) = Strong, Yellow cells (7-8.4) = Good, Red cells (<5) = Weak',
    '',
    'Customising for Your Organisation:',
    '• Adjust weights based on your specific requirements',
    '• Consider your industry, company size, and strategic priorities',
    '• Use the Cost-Conscious preset for budget-focused evaluations',
    '• Use the Consolidation Focus preset for complex group structures',
    '',
    'For more detailed analysis, visit:',
    `https://constancia.com/${type}-comparison`,
    '',
    'Contact Constancia for independent advisory:',
    'info@constancia.io | https://constancia.com',
  ];
  
  instructions.forEach(line => {
    const row = instructionsSheet.addRow([line]);
    if (line.startsWith('About') || line.startsWith('Customising')) {
      row.font = { bold: true };
    }
  });
  
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Generated: ${outputPath}`);
}

async function main() {
  const resourcesDir = path.join(process.cwd(), 'public', 'resources');
  
  await generateWorkbook(
    'epm',
    epmPlatforms,
    epmCategories,
    path.join(resourcesDir, 'epm-selection-implementation-toolkit.xlsx')
  );
  
  await generateWorkbook(
    'erp',
    erpPlatforms,
    erpCategories,
    path.join(resourcesDir, 'erp-selection-implementation-toolkit.xlsx')
  );
  
  console.log('All workbooks generated successfully!');
}

main().catch(console.error);
