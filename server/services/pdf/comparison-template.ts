/**
 * Comparison Tool PDF Template
 * 
 * Clean, website-matching PDF export with cover page and proper footers.
 */

import { LOGO_TURQUOISE_BASE64, ICON_WHITE_BASE64 } from '../../pdf-logo-base64';

const BRAND = {
  navy: '#02205B',
  cyan: '#12EBFC',
  teal: '#0884AA',
  cream: '#FEFFF3',
  white: '#FFFFFF',
  muted: '#64748b',
  cardBg: '#f8fafc',
  cardBorder: '#e2e8f0',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

const IMPLEMENTATION_PHASES = [
  { name: 'Discovery & Planning', startPct: 0, endPct: 0.15, color: '#02205B' },
  { name: 'Design & Configuration', startPct: 0.12, endPct: 0.45, color: '#0884AA' },
  { name: 'Build & Testing', startPct: 0.40, endPct: 0.75, color: '#12EBFC' },
  { name: 'Training & Go-Live', startPct: 0.70, endPct: 1.0, color: '#10b981' },
];

function parseImplementationTime(timeStr?: string): { min: number; max: number } {
  if (!timeStr) return { min: 12, max: 18 };
  
  // Handle weeks format (e.g., "4-6 weeks")
  const weeksMatch = timeStr.match(/(\d+)-(\d+)\s*weeks?/i);
  if (weeksMatch) {
    const minWeeks = parseInt(weeksMatch[1], 10);
    const maxWeeks = parseInt(weeksMatch[2], 10);
    return { min: Math.max(1, Math.round(minWeeks / 4)), max: Math.max(1, Math.round(maxWeeks / 4)) };
  }
  
  // Handle months format (e.g., "6-12 months")
  const monthsMatch = timeStr.match(/(\d+)-(\d+)\s*months?/i);
  if (monthsMatch) {
    return { min: parseInt(monthsMatch[1], 10), max: parseInt(monthsMatch[2], 10) };
  }
  
  // Handle single value
  const singleMatch = timeStr.match(/(\d+)\s*(months?|weeks?)/i);
  if (singleMatch) {
    const val = parseInt(singleMatch[1], 10);
    const isWeeks = singleMatch[2].toLowerCase().startsWith('week');
    const months = isWeeks ? Math.max(1, Math.round(val / 4)) : val;
    return { min: months, max: months };
  }
  
  return { min: 12, max: 18 };
}

function generateGanttHTML(platforms: CalculatedPlatform[]): string {
  const top4 = platforms.slice(0, 4);
  const timelines = top4.map(p => {
    const months = parseImplementationTime(p.implementationTime);
    const avgMonths = (months.min + months.max) / 2;
    const totalWeeks = avgMonths * 4;
    
    return {
      name: p.shortName || p.name,
      implementationTime: p.implementationTime || `${months.min}-${months.max} months`,
      months,
      phases: IMPLEMENTATION_PHASES.map(phase => ({
        name: phase.name,
        startWeek: Math.round(phase.startPct * totalWeeks),
        endWeek: Math.round(phase.endPct * totalWeeks),
        color: phase.color,
      })),
    };
  });
  
  const maxWeeks = Math.max(...timelines.flatMap(t => t.phases.map(p => p.endWeek)), 24);
  const maxMonths = Math.ceil(maxWeeks / 4);
  const monthMarkers = Array.from({ length: maxMonths + 1 }, (_, i) => i);
  
  return `
    <div class="gantt-chart">
      <div class="gantt-header">
        <div class="gantt-label-col"></div>
        <div class="gantt-bars-col">
          <div class="gantt-months">
            ${monthMarkers.map(m => `<div class="gantt-month">M${m}</div>`).join('')}
          </div>
        </div>
      </div>
      ${timelines.map(timeline => `
        <div class="gantt-row">
          <div class="gantt-label-col">
            <div class="gantt-platform-name">${escapeHtml(timeline.name)}</div>
            <div class="gantt-platform-time">${escapeHtml(timeline.implementationTime)}</div>
          </div>
          <div class="gantt-bars-col">
            <div class="gantt-track">
              ${timeline.phases.map(phase => {
                const left = (phase.startWeek / maxWeeks) * 100;
                const width = ((phase.endWeek - phase.startWeek) / maxWeeks) * 100;
                return `<div class="gantt-bar" style="left: ${left}%; width: ${width}%; background: ${phase.color};" title="${phase.name}"></div>`;
              }).join('')}
            </div>
          </div>
        </div>
      `).join('')}
      <div class="gantt-legend">
        ${IMPLEMENTATION_PHASES.map(p => `
          <div class="legend-item">
            <div class="legend-color" style="background: ${p.color};"></div>
            <span>${p.name}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

interface Platform {
  id: string;
  name: string;
  shortName?: string;
  marketPosition?: string;
  implementationTime?: string;
  priceRange?: string;
  roiPotential?: string;
  bestFor?: string;
  description?: string;
  scores: Record<string, number>;
  strengths?: string[];
  limitations?: string[];
}

interface CalculatedPlatform extends Platform {
  calculatedScore: number;
  fitAdjustedScore?: number;
  fitLevel?: string;
}

interface Category {
  id: string;
  name: string;
}

interface CompanyProfile {
  revenue?: string | null;
  companySize?: string | null;
  industry?: string | null;
}

interface ChartImages {
  radarChart?: string;
}

export interface ComparisonExportData {
  categoryType: 'epm' | 'erp' | 'ai';
  platforms: Platform[];
  categories: Category[];
  calculatedScores: CalculatedPlatform[];
  categoryWeights: Record<string, number>;
  companyProfile?: CompanyProfile;
  industryLabel?: string | null;
  presetLabel?: string | null;
  chartImages?: ChartImages;
}

const categoryTitles: Record<string, string> = {
  epm: 'EPM Platform Comparison',
  erp: 'ERP Platform Comparison',
  ai: 'AI Platform Comparison',
};

const categorySubtitles: Record<string, string> = {
  epm: 'Enterprise Performance Management Selection Guide',
  erp: 'Enterprise Resource Planning Selection Guide',
  ai: 'AI Solution Selection Guide',
};

const PROFILE_LABELS: Record<string, Record<string, string>> = {
  revenue: {
    'under-10m': 'Under £10M',
    '10m-50m': '£10M - £50M',
    '50m-250m': '£50M - £250M',
    '250m-1b': '£250M - £1B',
    'over-1b': 'Over £1B',
  },
  companySize: {
    'startup': 'Startup (<50)',
    'small': 'Small (50-200)',
    'medium': 'Medium (200-1000)',
    'large': 'Large (1000-5000)',
    'enterprise': 'Enterprise (5000+)',
  },
  industry: {
    'manufacturing': 'Manufacturing',
    'financial-services': 'Financial Services',
    'professional-services': 'Professional Services',
    'retail': 'Retail & Consumer',
    'technology': 'Technology',
    'healthcare': 'Healthcare',
    'energy': 'Energy & Utilities',
    'real-estate': 'Real Estate',
    'other': 'Other',
  },
};

function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatScore(score: number): number {
  return Math.round(score);
}

function normalizeScore(score: number): number {
  if (score <= 10 && score > 0) {
    return score * 10;
  }
  return score;
}

function formatWeight(weight: number): string {
  const pct = weight <= 1 ? Math.round(weight * 100) : Math.round(weight);
  return `${pct}%`;
}

function getScoreColor(score: number): string {
  const normalized = normalizeScore(score);
  if (normalized >= 85) return BRAND.success;
  if (normalized >= 70) return BRAND.teal;
  if (normalized >= 55) return BRAND.warning;
  return BRAND.danger;
}

function getProfileLabel(field: string, value: string | null | undefined): string {
  if (!value) return '';
  return PROFILE_LABELS[field]?.[value] || value;
}

export function generateComparisonHTML(data: ComparisonExportData): string {
  const sortedPlatforms = [...data.calculatedScores].sort((a, b) => {
    const scoreA = a.fitAdjustedScore ?? a.calculatedScore;
    const scoreB = b.fitAdjustedScore ?? b.calculatedScore;
    return scoreB - scoreA;
  });

  const topPlatform = sortedPlatforms[0];
  const topFour = sortedPlatforms.slice(0, 4);
  const topThree = sortedPlatforms.slice(0, 3);

  const logoHtml = LOGO_TURQUOISE_BASE64
    ? `<img src="${LOGO_TURQUOISE_BASE64}" alt="1QG" style="height: 24px;" />`
    : `<span style="font-size: 18px; font-weight: bold; color: ${BRAND.cyan};">1QG</span>`;

  const iconHtml = ICON_WHITE_BASE64
    ? `<img src="${ICON_WHITE_BASE64}" alt="1QG" style="position: absolute; top: 20mm; right: 20mm; width: 30mm; opacity: 0.1;" />`
    : '';

  const dateStr = new Date().toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  const hasProfile = data.companyProfile && (
    data.companyProfile.revenue || 
    data.companyProfile.companySize || 
    data.companyProfile.industry
  );

  const topScore = topPlatform ? formatScore((topPlatform.fitAdjustedScore ?? topPlatform.calculatedScore) * 10) : 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(categoryTitles[data.categoryType])}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm 20mm 15mm;
      
      @bottom-left {
        content: "1QG | ${data.categoryType.toUpperCase()} Comparison Report";
        font-family: 'Inter', Arial, sans-serif;
        font-size: 8pt;
        color: ${BRAND.navy};
        border-top: 2pt solid ${BRAND.cyan};
        padding-top: 8pt;
      }
      @bottom-center {
        content: "info@1qg.com | 1qg.com";
        font-family: 'Inter', Arial, sans-serif;
        font-size: 8pt;
        color: ${BRAND.teal};
        border-top: 2pt solid ${BRAND.cyan};
        padding-top: 8pt;
      }
      @bottom-right {
        content: "Page " counter(page);
        font-family: 'Inter', Arial, sans-serif;
        font-size: 8pt;
        color: ${BRAND.navy};
        border-top: 2pt solid ${BRAND.cyan};
        padding-top: 8pt;
      }
    }
    
    @page cover {
      margin: 0;
      @bottom-left { content: none; }
      @bottom-right { content: none; }
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: ${BRAND.navy};
      background: ${BRAND.white};
    }
    
    /* COVER PAGE */
    .cover-page {
      page: cover;
      background: linear-gradient(135deg, ${BRAND.navy} 0%, #041a47 100%);
      color: ${BRAND.cream};
      min-height: 297mm;
      padding: 25mm;
      position: relative;
    }
    .cover-logo { height: 28px; margin-bottom: 60mm; }
    .cover-badge {
      display: inline-block;
      font-size: 10pt;
      font-weight: 600;
      color: ${BRAND.cyan};
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 12pt;
    }
    .cover-title {
      font-size: 36pt;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 12pt;
    }
    .cover-subtitle {
      font-size: 14pt;
      color: rgba(254, 255, 243, 0.8);
      margin-bottom: 40pt;
    }
    .cover-stats {
      display: flex;
      gap: 24pt;
      margin-bottom: 40pt;
    }
    .stat-box {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8pt;
      padding: 16pt 24pt;
      text-align: center;
    }
    .stat-value {
      font-size: 28pt;
      font-weight: 700;
      color: ${BRAND.cyan};
    }
    .stat-label {
      font-size: 9pt;
      color: rgba(254, 255, 243, 0.7);
      margin-top: 4pt;
    }
    .cover-footer {
      position: absolute;
      bottom: 25mm;
      left: 25mm;
      right: 25mm;
    }
    .tagline {
      font-size: 12pt;
      color: ${BRAND.cream};
      margin-bottom: 8pt;
    }
    .tagline .highlight { color: ${BRAND.cyan}; font-style: italic; }
    .cover-contact {
      font-size: 10pt;
      color: rgba(254, 255, 243, 0.6);
    }
    
    /* CONTENT PAGES */
    .content-page {
      page: content;
      page-break-before: always;
    }
    
    .section-title {
      font-size: 16pt;
      font-weight: 700;
      color: ${BRAND.navy};
      margin: 24pt 0 16pt 0;
      padding-bottom: 8pt;
      border-bottom: 2px solid ${BRAND.cyan};
    }
    .section-title:first-child {
      margin-top: 0;
    }
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12pt;
      margin-bottom: 20pt;
      border-bottom: 2px solid ${BRAND.navy};
    }
    .page-title {
      font-size: 18pt;
      font-weight: 700;
      color: ${BRAND.navy};
    }
    
    /* CARDS - Website Style */
    .card {
      background: ${BRAND.white};
      border: 1px solid ${BRAND.cardBorder};
      border-radius: 8pt;
      padding: 16pt;
      margin-bottom: 16pt;
    }
    .card-gradient {
      background: linear-gradient(135deg, rgba(2,32,91,0.03) 0%, rgba(8,132,170,0.03) 100%);
      border-color: rgba(18,235,252,0.3);
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 12pt;
      margin-bottom: 12pt;
    }
    .card-icon {
      width: 36pt;
      height: 36pt;
      border-radius: 50%;
      background: rgba(18,235,252,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${BRAND.cyan};
      font-size: 16pt;
    }
    .card-title {
      font-size: 14pt;
      font-weight: 600;
      color: ${BRAND.navy};
    }
    .card-desc {
      font-size: 10pt;
      color: ${BRAND.muted};
    }
    
    /* PROFILE BOX */
    .profile-box {
      background: ${BRAND.cardBg};
      border-left: 3pt solid ${BRAND.teal};
      padding: 14pt;
      margin-bottom: 16pt;
      border-radius: 0 6pt 6pt 0;
    }
    .profile-title {
      font-size: 12pt;
      font-weight: 600;
      color: ${BRAND.navy};
      margin-bottom: 10pt;
    }
    .profile-grid {
      display: flex;
      gap: 32pt;
    }
    .profile-item { }
    .profile-label {
      font-size: 9pt;
      color: ${BRAND.muted};
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      margin-bottom: 2pt;
    }
    .profile-value {
      font-size: 11pt;
      font-weight: 600;
      color: ${BRAND.navy};
    }
    
    /* WEIGHTS BAR */
    .weights-bar {
      background: ${BRAND.cardBg};
      border: 1px solid ${BRAND.cardBorder};
      border-radius: 6pt;
      padding: 12pt 16pt;
      margin-bottom: 16pt;
    }
    .weights-title {
      font-size: 11pt;
      font-weight: 600;
      color: ${BRAND.navy};
      margin-bottom: 8pt;
    }
    .weights-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8pt 20pt;
    }
    .weight-item {
      display: flex;
      align-items: center;
      gap: 6pt;
    }
    .weight-name {
      font-size: 9pt;
      color: ${BRAND.navy};
    }
    .weight-value {
      font-size: 9pt;
      font-weight: 700;
      color: ${BRAND.teal};
    }
    
    /* RECOMMENDATION CARDS - Website Style */
    .recommendation-list {
      display: flex;
      flex-direction: column;
      gap: 12pt;
    }
    .rec-card {
      display: flex;
      align-items: flex-start;
      gap: 12pt;
      padding: 14pt;
      border-radius: 8pt;
      border: 1px solid ${BRAND.cardBorder};
      background: ${BRAND.white};
    }
    .rec-card.top {
      border-color: rgba(18,235,252,0.5);
      background: rgba(18,235,252,0.05);
    }
    .rank-circle {
      width: 36pt;
      height: 36pt;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14pt;
      flex-shrink: 0;
    }
    .rank-circle.r1 { background: ${BRAND.cyan}; color: ${BRAND.navy}; }
    .rank-circle.r2 { background: rgba(8,132,170,0.2); color: ${BRAND.teal}; }
    .rank-circle.r3, .rank-circle.r4 { background: ${BRAND.cardBg}; color: ${BRAND.muted}; }
    
    .rec-content { flex: 1; min-width: 0; }
    .rec-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6pt;
    }
    .rec-name {
      font-size: 13pt;
      font-weight: 600;
      color: ${BRAND.navy};
    }
    .rec-badges {
      display: flex;
      gap: 6pt;
      margin-left: 8pt;
    }
    .badge {
      display: inline-block;
      font-size: 8pt;
      font-weight: 600;
      padding: 2pt 8pt;
      border-radius: 10pt;
    }
    .badge-best {
      background: rgba(18,235,252,0.2);
      color: ${BRAND.teal};
    }
    .badge-outline {
      background: transparent;
      border: 1px solid ${BRAND.cardBorder};
      color: ${BRAND.muted};
    }
    .rec-score {
      font-size: 16pt;
      font-weight: 700;
      color: ${BRAND.cyan};
    }
    .rec-score-max {
      font-size: 10pt;
      color: ${BRAND.muted};
      margin-left: 2pt;
    }
    
    /* Score bar */
    .score-bar {
      height: 6pt;
      background: ${BRAND.cardBg};
      border-radius: 3pt;
      margin: 8pt 0;
      overflow: hidden;
    }
    .score-bar-fill {
      height: 100%;
      border-radius: 3pt;
    }
    .score-bar-fill.top { background: ${BRAND.cyan}; }
    .score-bar-fill.second { background: ${BRAND.teal}; }
    .score-bar-fill.other { background: ${BRAND.muted}; }
    
    .rec-bestfor {
      font-size: 10pt;
      color: ${BRAND.muted};
      margin-bottom: 8pt;
    }
    
    /* Strength tags */
    .tag-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6pt;
      margin-bottom: 8pt;
    }
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 4pt;
      font-size: 9pt;
      padding: 3pt 8pt;
      border-radius: 4pt;
    }
    .tag-green {
      background: rgba(16,185,129,0.1);
      color: #047857;
    }
    .tag-teal {
      background: rgba(8,132,170,0.1);
      color: ${BRAND.teal};
    }
    
    /* Meta row */
    .rec-meta {
      display: flex;
      gap: 16pt;
      padding-top: 8pt;
      border-top: 1px solid ${BRAND.cardBorder};
      font-size: 10pt;
      color: ${BRAND.muted};
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 4pt;
    }
    
    /* RANKINGS TABLE */
    .rankings-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin-top: 12pt;
    }
    .rankings-table th {
      background: ${BRAND.navy};
      color: ${BRAND.white};
      padding: 10pt 12pt;
      text-align: left;
      font-weight: 600;
    }
    .rankings-table th:first-child { border-radius: 6pt 0 0 0; }
    .rankings-table th:last-child { border-radius: 0 6pt 0 0; }
    .rankings-table td {
      padding: 10pt 12pt;
      border-bottom: 1px solid ${BRAND.cardBorder};
    }
    .rankings-table tr:nth-child(even) { background: ${BRAND.cardBg}; }
    .rankings-table tr:first-child td { background: rgba(18,235,252,0.08); }
    
    .rank-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24pt;
      height: 24pt;
      border-radius: 50%;
      font-weight: 700;
      font-size: 10pt;
    }
    .rank-badge.top { background: ${BRAND.cyan}; color: ${BRAND.navy}; }
    .rank-badge.other { background: ${BRAND.cardBg}; color: ${BRAND.navy}; }
    
    .score-pill {
      display: inline-block;
      padding: 4pt 12pt;
      border-radius: 12pt;
      font-weight: 700;
      font-size: 11pt;
      color: ${BRAND.white};
    }
    
    /* DIMENSION TABLE */
    .dimension-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
    }
    .dimension-table th {
      background: ${BRAND.navy};
      color: ${BRAND.white};
      padding: 8pt 10pt;
      text-align: left;
      font-weight: 600;
    }
    .dimension-table th:first-child { border-radius: 6pt 0 0 0; }
    .dimension-table th:last-child { border-radius: 0 6pt 0 0; }
    .dimension-table td {
      padding: 8pt 10pt;
      border-bottom: 1px solid ${BRAND.cardBorder};
    }
    .dimension-table tr:nth-child(even) { background: ${BRAND.cardBg}; }
    .weight-cell { color: ${BRAND.teal}; font-weight: 700; }
    
    /* CHART */
    .chart-container {
      text-align: center;
      padding: 16pt;
    }
    .chart-container img {
      max-width: 100%;
      max-height: 180mm;
      border-radius: 6pt;
    }
    .chart-caption {
      font-size: 10pt;
      color: ${BRAND.muted};
      margin-top: 12pt;
    }
    
    /* NEXT STEPS */
    .next-steps-box {
      background: ${BRAND.navy};
      border-radius: 8pt;
      padding: 20pt;
      color: ${BRAND.cream};
    }
    .steps-list {
      list-style: none;
    }
    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 12pt;
      padding: 10pt 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .step-item:last-child { border-bottom: none; }
    .step-num {
      width: 24pt;
      height: 24pt;
      border-radius: 50%;
      background: ${BRAND.cyan};
      color: ${BRAND.navy};
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 11pt;
      flex-shrink: 0;
    }
    .step-text {
      font-size: 11pt;
      line-height: 1.4;
    }
    .step-text strong { font-weight: 600; }
    
    .cta-box {
      background: ${BRAND.cyan};
      color: ${BRAND.navy};
      border-radius: 8pt;
      text-align: center;
      margin-top: 20pt;
      padding: 32pt;
    }
    .cta-title { 
      font-size: 16pt; 
      font-weight: 700; 
      margin-bottom: 20pt;
    }
    .cta-link {
      display: inline-block;
      background: ${BRAND.navy};
      color: ${BRAND.cream};
      padding: 12pt 32pt;
      border-radius: 20pt;
      font-size: 12pt;
      font-weight: 600;
      text-decoration: none;
    }
    
    /* GANTT CHART */
    .gantt-chart {
      background: ${BRAND.cardBg};
      border: 1px solid ${BRAND.cardBorder};
      border-radius: 8pt;
      padding: 16pt;
      margin-top: 16pt;
    }
    .gantt-header {
      display: flex;
      margin-bottom: 8pt;
    }
    .gantt-label-col {
      width: 120pt;
      flex-shrink: 0;
    }
    .gantt-bars-col {
      flex: 1;
    }
    .gantt-months {
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: ${BRAND.muted};
      padding-bottom: 6pt;
      border-bottom: 1px solid ${BRAND.cardBorder};
    }
    .gantt-month {
      text-align: center;
    }
    .gantt-row {
      display: flex;
      align-items: center;
      padding: 8pt 0;
      border-bottom: 1px solid ${BRAND.cardBorder};
    }
    .gantt-row:last-of-type {
      border-bottom: none;
    }
    .gantt-platform-name {
      font-size: 10pt;
      font-weight: 600;
      color: ${BRAND.navy};
    }
    .gantt-platform-time {
      font-size: 8pt;
      color: ${BRAND.muted};
    }
    .gantt-track {
      position: relative;
      height: 20pt;
      background: ${BRAND.white};
      border-radius: 4pt;
    }
    .gantt-bar {
      position: absolute;
      top: 2pt;
      height: 16pt;
      border-radius: 3pt;
      opacity: 0.9;
    }
    .gantt-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 12pt;
      margin-top: 12pt;
      padding-top: 12pt;
      border-top: 1px solid ${BRAND.cardBorder};
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6pt;
      font-size: 8pt;
      color: ${BRAND.muted};
    }
    .legend-color {
      width: 12pt;
      height: 8pt;
      border-radius: 2pt;
    }
    
    /* PLATFORM DETAIL CARDS */
    .detail-card {
      background: ${BRAND.white};
      border: 1px solid ${BRAND.cardBorder};
      border-radius: 8pt;
      padding: 16pt;
      margin-bottom: 16pt;
      page-break-inside: avoid;
    }
    .detail-header {
      display: flex;
      align-items: center;
      gap: 12pt;
      margin-bottom: 12pt;
    }
    .detail-rank {
      width: 32pt;
      height: 32pt;
      border-radius: 50%;
      background: ${BRAND.cyan};
      color: ${BRAND.navy};
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14pt;
      flex-shrink: 0;
    }
    .detail-info { flex: 1; }
    .detail-name {
      font-size: 14pt;
      font-weight: 700;
      color: ${BRAND.navy};
    }
    .detail-position {
      font-size: 10pt;
      color: ${BRAND.muted};
    }
    .detail-score {
      padding: 6pt 14pt;
      border-radius: 16pt;
      color: ${BRAND.white};
      font-weight: 700;
      font-size: 14pt;
    }
    .detail-desc {
      font-size: 10pt;
      color: ${BRAND.muted};
      margin-bottom: 12pt;
      line-height: 1.5;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12pt;
      margin-bottom: 12pt;
      background: ${BRAND.cardBg};
      padding: 12pt;
      border-radius: 6pt;
    }
    .detail-item { }
    .detail-label {
      font-size: 9pt;
      color: ${BRAND.muted};
      margin-bottom: 2pt;
    }
    .detail-value {
      font-size: 11pt;
      font-weight: 600;
      color: ${BRAND.navy};
    }
    .detail-section {
      margin-top: 10pt;
    }
    .detail-section-title {
      font-size: 10pt;
      font-weight: 600;
      color: ${BRAND.navy};
      margin-bottom: 6pt;
    }
    .detail-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .detail-list li {
      font-size: 10pt;
      color: ${BRAND.navy};
      padding: 4pt 0 4pt 16pt;
      position: relative;
    }
    .detail-list li::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: ${BRAND.success};
      font-weight: 700;
    }
    .detail-list.limitations li::before {
      content: "•";
      color: ${BRAND.warning};
    }
    
    /* DISCLAIMER */
    .disclaimer {
      background: ${BRAND.cardBg};
      border-left: 3pt solid ${BRAND.teal};
      padding: 12pt;
      margin-top: 16pt;
      font-size: 9pt;
      color: ${BRAND.muted};
      line-height: 1.5;
      border-radius: 0 6pt 6pt 0;
    }
    .disclaimer-title {
      font-weight: 600;
      color: ${BRAND.navy};
      margin-bottom: 4pt;
      font-size: 10pt;
    }
  </style>
</head>
<body>
  <!-- COVER PAGE -->
  <div class="cover-page">
    ${iconHtml}
    <div class="cover-logo">${logoHtml}</div>
    
    <div class="cover-badge">${data.categoryType.toUpperCase()} Comparison Report</div>
    <h1 class="cover-title">${escapeHtml(categoryTitles[data.categoryType])}</h1>
    <p class="cover-subtitle">${escapeHtml(categorySubtitles[data.categoryType])}</p>
    
    <div class="cover-stats">
      <div class="stat-box">
        <div class="stat-value">${data.calculatedScores.length}</div>
        <div class="stat-label">Platforms Analysed</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${data.categories.length}</div>
        <div class="stat-label">Capability Dimensions</div>
      </div>
      ${topPlatform ? `
      <div class="stat-box">
        <div class="stat-value">${topScore}</div>
        <div class="stat-label">Top Score</div>
      </div>
      ` : ''}
    </div>
    
    <div class="cover-footer">
      <div class="tagline">Finance Transformed. Designed for Change. <span class="highlight">Driven by Technology.</span></div>
      <div class="cover-contact">info@1qg.com | 1qg.com | London, United Kingdom</div>
    </div>
  </div>
  
  <!-- CONTENT PAGES -->
  <div class="content-page">
    <!-- TOP RECOMMENDATIONS -->
    <h2 class="section-title">Your Top Recommendations</h2>
    
    ${hasProfile ? `
    <div class="profile-box">
      <div class="profile-title">Your Organisation Profile</div>
      <div class="profile-grid">
        ${data.companyProfile?.industry ? `
        <div class="profile-item">
          <div class="profile-label">Industry</div>
          <div class="profile-value">${escapeHtml(data.industryLabel || getProfileLabel('industry', data.companyProfile.industry))}</div>
        </div>
        ` : ''}
        ${data.companyProfile?.revenue ? `
        <div class="profile-item">
          <div class="profile-label">Revenue Band</div>
          <div class="profile-value">${escapeHtml(getProfileLabel('revenue', data.companyProfile.revenue))}</div>
        </div>
        ` : ''}
        ${data.companyProfile?.companySize ? `
        <div class="profile-item">
          <div class="profile-label">Organisation Size</div>
          <div class="profile-value">${escapeHtml(getProfileLabel('companySize', data.companyProfile.companySize))}</div>
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}
    
    <div class="weights-bar">
      <div class="weights-title">Evaluation Criteria Weightings</div>
      <div class="weights-grid">
        ${data.categories.map(cat => `
        <div class="weight-item">
          <span class="weight-name">${escapeHtml(cat.name)}</span>
          <span class="weight-value">${formatWeight(data.categoryWeights[cat.id] ?? 1)}</span>
        </div>
        `).join('')}
      </div>
    </div>
    
    <div class="recommendation-list">
      ${topFour.map((platform, index) => {
        const score = formatScore((platform.fitAdjustedScore ?? platform.calculatedScore) * 10);
        const topScoreVal = (topFour[0].fitAdjustedScore ?? topFour[0].calculatedScore) * 10;
        const scorePercent = Math.round((score / topScoreVal) * 100);
        const rankClass = index === 0 ? 'r1' : index === 1 ? 'r2' : index === 2 ? 'r3' : 'r4';
        const barClass = index === 0 ? 'top' : index === 1 ? 'second' : 'other';
        
        return `
        <div class="rec-card ${index === 0 ? 'top' : ''}">
          <div class="rank-circle ${rankClass}">${index + 1}</div>
          <div class="rec-content">
            <div class="rec-header">
              <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 6pt;">
                <span class="rec-name">${escapeHtml(platform.shortName || platform.name)}</span>
                <div class="rec-badges">
                  ${index === 0 ? '<span class="badge badge-best">Best Match</span>' : ''}
                  <span class="badge badge-outline">${escapeHtml(platform.marketPosition || '')}</span>
                </div>
              </div>
              <div>
                <span class="rec-score">${score}</span>
                <span class="rec-score-max">/ 100</span>
              </div>
            </div>
            
            <div class="score-bar">
              <div class="score-bar-fill ${barClass}" style="width: ${scorePercent}%;"></div>
            </div>
            
            <div class="rec-bestfor">${escapeHtml(platform.bestFor || '')}</div>
            
            ${platform.strengths && platform.strengths.length > 0 ? `
            <div class="tag-row">
              ${platform.strengths.slice(0, 2).map(s => `
                <span class="tag tag-green">✓ ${escapeHtml(s.length > 35 ? s.substring(0, 32) + '...' : s)}</span>
              `).join('')}
            </div>
            ` : ''}
            
            <div class="rec-meta">
              <span class="meta-item">⏱ ${escapeHtml(platform.implementationTime || 'Varies')}</span>
              <span class="meta-item">💰 ${escapeHtml(platform.priceRange || 'Contact vendor')}</span>
            </div>
          </div>
        </div>
        `;
      }).join('')}
    </div>
    
    <!-- FULL RANKINGS -->
    <h2 class="section-title">Platform Rankings</h2>
    
    <table class="rankings-table">
      <thead>
        <tr>
          <th style="width: 50pt;">Rank</th>
          <th>Platform</th>
          <th style="width: 80pt;">Score</th>
          <th>Implementation</th>
          <th>Investment</th>
        </tr>
      </thead>
      <tbody>
        ${sortedPlatforms.map((platform, index) => {
          const score = formatScore((platform.fitAdjustedScore ?? platform.calculatedScore) * 10);
          const scoreColor = getScoreColor(score);
          return `
          <tr>
            <td><span class="rank-badge ${index === 0 ? 'top' : 'other'}">${index + 1}</span></td>
            <td><strong>${escapeHtml(platform.name)}</strong></td>
            <td><span class="score-pill" style="background: ${scoreColor};">${score}</span></td>
            <td>${escapeHtml(platform.implementationTime || '—')}</td>
            <td>${escapeHtml(platform.priceRange || '—')}</td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    
    <!-- DIMENSION ANALYSIS -->
    <h2 class="section-title">Scores by Dimension</h2>
    <p style="color: ${BRAND.muted}; margin-bottom: 16pt;">Top 3 platforms compared across all evaluation criteria</p>
    
    <table class="dimension-table">
      <thead>
        <tr>
          <th>Dimension</th>
          <th style="width: 60pt;">Weight</th>
          ${topThree.map(p => `<th style="width: 70pt;">${escapeHtml(p.shortName || p.name.split(' ')[0])}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data.categories.map(category => {
          const weight = data.categoryWeights[category.id] ?? 1;
          return `
          <tr>
            <td><strong>${escapeHtml(category.name)}</strong></td>
            <td class="weight-cell">${formatWeight(weight)}</td>
            ${topThree.map(platform => {
              const rawScore = platform.scores[category.id] ?? 0;
              const normalizedScore = normalizeScore(rawScore);
              const scoreColor = getScoreColor(normalizedScore);
              return `<td style="color: ${scoreColor}; font-weight: 700;">${formatScore(normalizedScore)}</td>`;
            }).join('')}
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    
    ${data.chartImages?.radarChart ? `
    <div class="chart-container">
      <img src="${data.chartImages.radarChart}" alt="Capability Comparison" />
      <p class="chart-caption">Platform capabilities compared across all ${data.categories.length} evaluation dimensions</p>
    </div>
    ` : ''}
    
    <!-- IMPLEMENTATION TIMELINE - New Page -->
    <div style="page-break-before: always;"></div>
    <h2 class="section-title">Implementation Timeline Comparison</h2>
    <p style="color: ${BRAND.muted}; margin-bottom: 8pt;">Typical project phases for top-ranked platforms</p>
    ${generateGanttHTML(sortedPlatforms)}
    
    <!-- PLATFORM DETAILS - New Page -->
    <div style="page-break-before: always;"></div>
    <h2 class="section-title">Platform Details</h2>
    
    ${topFour.map((platform, index) => {
      const score = formatScore((platform.fitAdjustedScore ?? platform.calculatedScore) * 10);
      return `
      <div class="detail-card">
        <div class="detail-header">
          <div class="detail-rank">${index + 1}</div>
          <div class="detail-info">
            <div class="detail-name">${escapeHtml(platform.name)}</div>
            <div class="detail-position">${escapeHtml(platform.marketPosition || '')}</div>
          </div>
          <div class="detail-score" style="background: ${getScoreColor(score)};">${score}</div>
        </div>
        
        ${platform.description ? `
        <p class="detail-desc">${escapeHtml(platform.description)}</p>
        ` : ''}
        
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">Implementation Timeline</div>
            <div class="detail-value">${escapeHtml(platform.implementationTime || 'Varies by scope')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Investment Range</div>
            <div class="detail-value">${escapeHtml(platform.priceRange || 'Contact vendor')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">ROI Potential</div>
            <div class="detail-value">${escapeHtml(platform.roiPotential || 'High')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Best For</div>
            <div class="detail-value">${escapeHtml(platform.bestFor || '')}</div>
          </div>
        </div>
        
        ${platform.strengths && platform.strengths.length > 0 ? `
        <div class="detail-section">
          <div class="detail-section-title">Key Strengths</div>
          <ul class="detail-list">
            ${platform.strengths.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
        
        ${platform.limitations && platform.limitations.length > 0 ? `
        <div class="detail-section">
          <div class="detail-section-title">Considerations</div>
          <ul class="detail-list limitations">
            ${platform.limitations.map(l => `<li>${escapeHtml(l)}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
      </div>
      `;
    }).join('')}
    
    <!-- NEXT STEPS - New Page -->
    <div style="page-break-before: always;"></div>
    <h2 class="section-title">Recommended Next Steps</h2>
    
    <div class="next-steps-box">
      <ul class="steps-list">
        <li class="step-item">
          <span class="step-num">1</span>
          <span class="step-text"><strong>Review Platform Profiles</strong> – Explore each platform's capabilities and specifications in detail</span>
        </li>
        <li class="step-item">
          <span class="step-num">2</span>
          <span class="step-text"><strong>Schedule Vendor Demonstrations</strong> – See platforms in action with your specific use cases</span>
        </li>
        <li class="step-item">
          <span class="step-num">3</span>
          <span class="step-text"><strong>Conduct Reference Checks</strong> – Speak with similar organisations about their experience</span>
        </li>
        <li class="step-item">
          <span class="step-num">4</span>
          <span class="step-text"><strong>Evaluate Total Cost of Ownership</strong> – Consider licensing, implementation, and ongoing costs</span>
        </li>
        <li class="step-item">
          <span class="step-num">5</span>
          <span class="step-text"><strong>Assess Integration Requirements</strong> – Review compatibility with your existing systems</span>
        </li>
      </ul>
    </div>
    
    <div class="cta-box">
      <div class="cta-title">Ready to take the next step?</div>
      <div><a href="https://1qg.com/finance-compass" class="cta-link">Try FinanceCompass Free</a></div>
    </div>
    
    <div class="disclaimer">
      <div class="disclaimer-title">Disclaimer</div>
      <p>This document has been prepared using publicly available information and is intended for general informational purposes only. It does not constitute professional advice or a formal recommendation. Scores, fit recommendations, and vendor comparisons are based on 1QG consultant experience and publicly available information including analyst reports and vendor materials. Always validate through vendor demonstrations, proof-of-concept evaluations, and reference checks specific to your requirements before making selection decisions. To discuss how 1QG can support your specific requirements, contact info@1qg.com or visit 1qg.com.</p>
    </div>
  </div>
</body>
</html>`;
}
