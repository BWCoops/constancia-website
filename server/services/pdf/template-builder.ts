/**
 * PDF Template Builder
 * 
 * Provides modular, pixel-perfect HTML templates for PDF generation.
 * Designed to work with Adobe PDF Services API for high-fidelity output.
 */

import { LOGO_TURQUOISE_BASE64, ICON_WHITE_BASE64 } from '../../pdf-logo-base64';
import {
  BRAND_COLORS,
  TYPOGRAPHY,
  SPACING,
  PAGE,
  GRADIENTS,
  BORDERS,
  CONTACT_INFO,
  generateBaseStyles,
} from './design-system';

export interface CoverPageOptions {
  title: string;
  subtitle?: string;
  category: string;
  description: string;
  publishedAt: string;
  version?: string;
}

export interface SectionContent {
  heading: string;
  content: string;
  type?: 'text' | 'list' | 'table' | 'checklist' | 'cards' | 'metrics';
  items?: Array<string | { text: string; context?: string }>;
  tableData?: { headers: string[]; rows: string[][] };
  cards?: Array<{ title: string; value: string; subtitle?: string; color?: string }>;
}

export interface DocumentOptions {
  title: string;
  subtitle?: string;
  category: string;
  description: string;
  sections: SectionContent[];
  publishedAt: string;
  version?: string;
  showTableOfContents?: boolean;
  showExecutiveSummary?: boolean;
  showAboutSection?: boolean;
  showDisclaimer?: boolean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateCoverPage(options: CoverPageOptions): string {
  const logoHtml = LOGO_TURQUOISE_BASE64
    ? `<img src="${LOGO_TURQUOISE_BASE64}" alt="Constancia" class="cover-logo" />`
    : `<div class="cover-logo-text">Constancia</div>`;

  return `
    <div class="cover-page">
      <div class="cover-pattern"></div>
      <div class="cover-content">
        ${logoHtml}
        <div class="cover-category">${escapeHtml(options.category)}</div>
        <h1 class="cover-title">${escapeHtml(options.title)}</h1>
        ${options.subtitle ? `<div class="cover-subtitle">${escapeHtml(options.subtitle)}</div>` : ''}
        <div class="cover-accent-line"></div>
        <p class="cover-description">${escapeHtml(options.description)}</p>
        
        <div class="cover-footer">
          <div class="cover-tagline">
            Finance Transformed. Designed for Change. <span class="highlight">Driven by Technology.</span>
          </div>
          <div class="cover-contact">
            ${CONTACT_INFO.address}<br />
            ${CONTACT_INFO.email} | ${CONTACT_INFO.website}
          </div>
        </div>
        
        <div class="cover-date">
          Published: ${formatDate(options.publishedAt)}<br />
          ${options.version ? `Version: ${options.version}` : ''}
        </div>
      </div>
    </div>
  `;
}

export function generateTableOfContents(sections: SectionContent[]): string {
  return `
    <div class="toc no-break">
      <h2 class="toc-heading">Contents</h2>
      ${sections
        .map(
          (section, index) => `
        <div class="toc-item">
          <span class="toc-number">${index + 1}.</span>
          <span class="toc-title">${escapeHtml(section.heading)}</span>
          <span class="toc-dots"></span>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

export function generateExecutiveSummary(description: string): string {
  return `
    <div class="executive-summary no-break">
      <h3 class="executive-summary-heading">Executive Summary</h3>
      <p class="executive-summary-content">${escapeHtml(description)}</p>
    </div>
  `;
}

function renderTextContent(content: string): string {
  return `<div class="section-text">${content}</div>`;
}

function renderListContent(items: Array<string | { text: string; context?: string }>): string {
  return `
    <ul class="content-list">
      ${items
        .map((item) => {
          const text = typeof item === 'string' ? item : item.text;
          const context = typeof item === 'object' && item.context ? item.context : null;
          return `
            <li class="content-list-item no-break">
              <span class="list-bullet"></span>
              <div class="list-content">
                <span class="list-text">${escapeHtml(text)}</span>
                ${context ? `<span class="list-context">${escapeHtml(context)}</span>` : ''}
              </div>
            </li>
          `;
        })
        .join('')}
    </ul>
  `;
}

function renderChecklistContent(items: Array<string | { text: string; context?: string }>): string {
  return `
    <div class="checklist">
      ${items
        .map((item) => {
          const text = typeof item === 'string' ? item : item.text;
          const context = typeof item === 'object' && item.context ? item.context : null;
          return `
            <div class="checklist-item no-break">
              <span class="checkbox"></span>
              <div class="checkbox-content">
                <span class="checkbox-text">${escapeHtml(text)}</span>
                ${context ? `<span class="checkbox-context">${escapeHtml(context)}</span>` : ''}
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderTableContent(tableData: { headers: string[]; rows: string[][] }): string {
  return `
    <table class="content-table no-break">
      <thead>
        <tr>
          ${tableData.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${tableData.rows
          .map(
            (row, index) => `
          <tr class="${index % 2 === 1 ? 'alt-row' : ''}">
            ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderMetricCards(
  cards: Array<{ title: string; value: string; subtitle?: string; color?: string }>
): string {
  return `
    <div class="metrics-grid">
      ${cards
        .map(
          (card) => `
        <div class="metric-card no-break" style="${card.color ? `--accent-color: ${card.color}` : ''}">
          <div class="metric-value">${escapeHtml(card.value)}</div>
          <div class="metric-title">${escapeHtml(card.title)}</div>
          ${card.subtitle ? `<div class="metric-subtitle">${escapeHtml(card.subtitle)}</div>` : ''}
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

export function generateSection(section: SectionContent, index: number): string {
  let contentHtml = '';

  switch (section.type) {
    case 'list':
      contentHtml = section.items ? renderListContent(section.items) : renderTextContent(section.content);
      break;
    case 'checklist':
      contentHtml = section.items ? renderChecklistContent(section.items) : renderTextContent(section.content);
      break;
    case 'table':
      contentHtml = section.tableData
        ? renderTableContent(section.tableData)
        : renderTextContent(section.content);
      break;
    case 'metrics':
    case 'cards':
      contentHtml = section.cards ? renderMetricCards(section.cards) : renderTextContent(section.content);
      break;
    default:
      contentHtml = renderTextContent(section.content);
  }

  return `
    <section class="document-section">
      <h2 class="section-heading keep-with-next">
        <span class="section-number">${index + 1}.</span>
        ${escapeHtml(section.heading)}
      </h2>
      ${contentHtml}
    </section>
  `;
}

export function generateAboutSection(): string {
  return `
    <div class="about-section no-break">
      <h3 class="about-heading">About Constancia</h3>
      <p class="about-content">
        Constancia is a leading technology consultancy specialising in Enterprise Performance Management (EPM), 
        Enterprise Resource Planning (ERP), and AI-powered business solutions. With decades of combined 
        expertise across finance transformation, we help organisations navigate complex technology decisions 
        and implementations. Our independent approach ensures clients receive objective, tailored guidance 
        aligned with their strategic objectives.
      </p>
    </div>
    
    <div class="contact-cta no-break">
      <h4 class="cta-heading">Ready to Transform Your Finance Function?</h4>
      <p class="cta-content">
        Use FinanceCompass to baseline your current state, understand TCO/ROI potential, 
        and build a compelling business case for transformation.
      </p>
      <a href="https://constancia.io/finance-compass" class="cta-link">Try FinanceCompass Free</a>
      <p class="cta-contact">
        For independent selection support: <a href="mailto:${CONTACT_INFO.email}">${CONTACT_INFO.email}</a> | <a href="${CONTACT_INFO.website}">${CONTACT_INFO.website}</a>
      </p>
    </div>
  `;
}

export function generateDisclaimer(): string {
  return `
    <div class="disclaimer-section no-break">
      <div class="disclaimer-box">
        <h4 class="disclaimer-heading">Important Notice</h4>
        <p class="disclaimer-text">
          This document has been prepared by Constancia Group Limited using publicly available information, 
          proprietary research, and extensive industry expertise. It is intended for general informational 
          and educational purposes only and does not constitute professional advice, a formal recommendation, 
          or an offer of services.
        </p>
        <p class="disclaimer-text">
          The information contained herein is believed to be accurate at the time of publication but may be 
          subject to change without notice as market conditions, vendor offerings, and regulatory requirements evolve.
        </p>
        <p class="disclaimer-text">
          &copy; ${new Date().getFullYear()} Constancia Group Limited. All rights reserved.
        </p>
      </div>
    </div>
  `;
}

export function generateDocumentStyles(): string {
  return `
    ${generateBaseStyles()}
    
    /* Cover Page Styles */
    .cover-page {
      width: ${PAGE.width};
      height: ${PAGE.height};
      background: ${GRADIENTS.primaryCover};
      color: ${BRAND_COLORS.cream};
      position: relative;
      page-break-after: always;
      overflow: hidden;
    }
    
    .cover-pattern {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: 
        radial-gradient(circle at 20% 80%, rgba(18, 235, 252, 0.12) 0%, transparent 45%),
        radial-gradient(circle at 80% 20%, rgba(8, 132, 170, 0.18) 0%, transparent 45%),
        radial-gradient(circle at 60% 60%, rgba(2, 32, 91, 0.1) 0%, transparent 30%);
      pointer-events: none;
    }
    
    .cover-content {
      position: relative;
      z-index: 1;
      padding: 50mm 35mm 40mm 35mm;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .cover-logo {
      max-width: 110px;
      height: auto;
      margin-bottom: 22mm;
    }
    
    .cover-logo-text {
      font-size: 36px;
      font-weight: ${TYPOGRAPHY.weights.bold};
      color: ${BRAND_COLORS.cyan};
      margin-bottom: 22mm;
    }
    
    .cover-category {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 4px;
      color: ${BRAND_COLORS.cyan};
      margin-bottom: 5mm;
      font-weight: ${TYPOGRAPHY.weights.semibold};
    }
    
    .cover-title {
      font-size: 38px;
      font-weight: ${TYPOGRAPHY.weights.bold};
      line-height: ${TYPOGRAPHY.lineHeights.tight};
      margin-bottom: 6mm;
      max-width: 125mm;
      letter-spacing: ${TYPOGRAPHY.letterSpacing.tight};
    }
    
    .cover-subtitle {
      font-size: 14px;
      color: ${BRAND_COLORS.cyan};
      margin-bottom: 10mm;
      font-style: italic;
      font-weight: ${TYPOGRAPHY.weights.medium};
    }
    
    .cover-accent-line {
      width: 45mm;
      height: 3px;
      background: ${GRADIENTS.accentLine};
      margin-bottom: 12mm;
      border-radius: 2px;
    }
    
    .cover-description {
      font-size: 12px;
      line-height: ${TYPOGRAPHY.lineHeights.relaxed};
      opacity: 0.92;
      max-width: 125mm;
    }
    
    .cover-footer {
      position: absolute;
      bottom: 28mm;
      left: 35mm;
      right: 35mm;
    }
    
    .cover-tagline {
      font-size: 13px;
      margin-bottom: 5mm;
      font-weight: ${TYPOGRAPHY.weights.medium};
    }
    
    .cover-tagline .highlight {
      color: ${BRAND_COLORS.cyan};
      font-style: italic;
    }
    
    .cover-contact {
      font-size: 9px;
      opacity: 0.7;
      line-height: 2;
    }
    
    .cover-date {
      position: absolute;
      bottom: 28mm;
      right: 35mm;
      font-size: 9px;
      opacity: 0.6;
      text-align: right;
    }
    
    /* Content Wrapper */
    .content-wrapper {
      background: ${BRAND_COLORS.white};
    }
    
    /* Table of Contents */
    .toc {
      margin-bottom: 10mm;
    }
    
    .toc-heading {
      font-size: 18px;
      font-weight: ${TYPOGRAPHY.weights.bold};
      color: ${BRAND_COLORS.navy};
      margin-bottom: 6mm;
      padding-bottom: 3mm;
      border-bottom: 2px solid ${BRAND_COLORS.teal};
    }
    
    .toc-item {
      display: flex;
      align-items: baseline;
      padding: 2.5mm 0;
      border-bottom: 1px dotted ${BRAND_COLORS.mediumGray};
      font-size: 11px;
    }
    
    .toc-number {
      color: ${BRAND_COLORS.teal};
      font-weight: ${TYPOGRAPHY.weights.semibold};
      min-width: 6mm;
    }
    
    .toc-title {
      color: ${BRAND_COLORS.navy};
      font-weight: ${TYPOGRAPHY.weights.medium};
      flex: 1;
    }
    
    .toc-dots {
      flex: 1;
      border-bottom: 1px dotted ${BRAND_COLORS.slateGray};
      margin: 0 2mm;
      height: 1px;
    }
    
    /* Executive Summary */
    .executive-summary {
      background: ${GRADIENTS.cardHighlight};
      border: 1px solid rgba(8, 132, 170, 0.2);
      border-radius: ${BORDERS.radius.base};
      padding: 6mm 7mm;
      margin-bottom: 8mm;
    }
    
    .executive-summary-heading {
      font-size: 14px;
      font-weight: ${TYPOGRAPHY.weights.semibold};
      color: ${BRAND_COLORS.navy};
      margin-bottom: 3mm;
    }
    
    .executive-summary-content {
      font-size: 10.5pt;
      line-height: ${TYPOGRAPHY.lineHeights.relaxed};
      color: ${BRAND_COLORS.darkGray};
    }
    
    /* Document Sections */
    .document-section {
      margin-bottom: 10mm;
    }
    
    .section-heading {
      font-size: 15px;
      font-weight: ${TYPOGRAPHY.weights.semibold};
      color: ${BRAND_COLORS.navy};
      margin-bottom: 5mm;
      padding: 3mm 4mm 3mm 5mm;
      background: linear-gradient(135deg, rgba(8, 132, 170, 0.06) 0%, rgba(2, 32, 91, 0.04) 100%);
      border-left: 4px solid ${BRAND_COLORS.teal};
      display: flex;
      align-items: baseline;
      gap: 3mm;
    }
    
    .section-number {
      color: ${BRAND_COLORS.teal};
      font-weight: ${TYPOGRAPHY.weights.bold};
      font-size: 14px;
    }
    
    .section-text {
      font-size: 10.5pt;
      line-height: ${TYPOGRAPHY.lineHeights.relaxed};
      color: ${BRAND_COLORS.darkGray};
      text-align: justify;
    }
    
    .section-text p {
      margin-bottom: 3mm;
    }
    
    /* Content Lists */
    .content-list {
      list-style: none;
      padding: 0;
      margin: 3mm 0;
    }
    
    .content-list-item {
      display: flex;
      align-items: flex-start;
      gap: 3mm;
      margin-bottom: 2mm;
      padding: 2mm 0;
    }
    
    .list-bullet {
      width: 6px;
      height: 6px;
      background: ${BRAND_COLORS.teal};
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 4px;
    }
    
    .list-content {
      flex: 1;
    }
    
    .list-text {
      font-size: 10.5pt;
      line-height: ${TYPOGRAPHY.lineHeights.normal};
      color: ${BRAND_COLORS.darkGray};
    }
    
    .list-context {
      display: block;
      font-size: 9pt;
      color: ${BRAND_COLORS.slateGray};
      font-style: italic;
      margin-top: 1mm;
      padding-left: 3mm;
      border-left: 2px solid ${BRAND_COLORS.teal};
    }
    
    /* Checklists */
    .checklist {
      margin: 4mm 0;
    }
    
    .checklist-item {
      display: flex;
      align-items: flex-start;
      gap: 4mm;
      padding: 4mm 5mm;
      background: ${BRAND_COLORS.lightGray};
      border-radius: ${BORDERS.radius.sm};
      margin-bottom: 2.5mm;
      border: 1px solid ${BRAND_COLORS.mediumGray};
    }
    
    .checklist-item:nth-child(odd) {
      background: ${BRAND_COLORS.white};
    }
    
    .checkbox {
      color: ${BRAND_COLORS.teal};
      font-size: 16px;
      flex-shrink: 0;
      line-height: 1.1;
      width: 18px;
      height: 18px;
      border: 2px solid ${BRAND_COLORS.teal};
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${BRAND_COLORS.white};
      margin-top: 1px;
    }
    
    .checkbox-content {
      flex: 1;
    }
    
    .checkbox-text {
      font-size: 10.5pt;
      line-height: ${TYPOGRAPHY.lineHeights.normal};
      color: ${BRAND_COLORS.darkGray};
      font-weight: ${TYPOGRAPHY.weights.medium};
    }
    
    .checkbox-context {
      display: block;
      font-size: 9pt;
      color: ${BRAND_COLORS.slateGray};
      font-style: italic;
      margin-top: 2.5mm;
      padding-left: 4mm;
      border-left: 2px solid ${BRAND_COLORS.teal};
      line-height: ${TYPOGRAPHY.lineHeights.relaxed};
    }
    
    /* Tables */
    .content-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 5mm 0;
      font-size: 9.5pt;
      border: 1px solid ${BRAND_COLORS.mediumGray};
      border-radius: ${BORDERS.radius.sm};
      overflow: hidden;
    }
    
    .content-table th {
      background: linear-gradient(135deg, ${BRAND_COLORS.navy} 0%, #041a4a 100%);
      color: ${BRAND_COLORS.cream};
      padding: 4mm 5mm;
      text-align: left;
      font-weight: ${TYPOGRAPHY.weights.semibold};
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .content-table th:first-child {
      border-top-left-radius: ${BORDERS.radius.sm};
    }
    
    .content-table th:last-child {
      border-top-right-radius: ${BORDERS.radius.sm};
    }
    
    .content-table td {
      padding: 3.5mm 5mm;
      border-bottom: 1px solid ${BRAND_COLORS.mediumGray};
      vertical-align: top;
      line-height: ${TYPOGRAPHY.lineHeights.snug};
      color: ${BRAND_COLORS.darkGray};
    }
    
    .content-table tr:last-child td {
      border-bottom: none;
    }
    
    .content-table tr.alt-row {
      background: ${BRAND_COLORS.lightGray};
    }
    
    .content-table td:first-child {
      font-weight: ${TYPOGRAPHY.weights.medium};
      color: ${BRAND_COLORS.navy};
    }
    
    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4mm;
      margin: 5mm 0;
    }
    
    .metric-card {
      --accent-color: ${BRAND_COLORS.teal};
      background: ${BRAND_COLORS.lightGray};
      border-left: 4px solid var(--accent-color);
      padding: 5mm;
      border-radius: 0 ${BORDERS.radius.sm} ${BORDERS.radius.sm} 0;
      text-align: center;
    }
    
    .metric-value {
      font-size: 22px;
      font-weight: ${TYPOGRAPHY.weights.bold};
      color: ${BRAND_COLORS.navy};
      margin-bottom: 1mm;
    }
    
    .metric-title {
      font-size: 10px;
      font-weight: ${TYPOGRAPHY.weights.medium};
      color: ${BRAND_COLORS.darkGray};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .metric-subtitle {
      font-size: 8px;
      color: ${BRAND_COLORS.slateGray};
      margin-top: 1mm;
    }
    
    /* About Section */
    .about-section {
      background: ${GRADIENTS.primaryCover};
      color: ${BRAND_COLORS.cream};
      padding: 8mm 10mm;
      border-radius: ${BORDERS.radius.base};
      margin-top: 12mm;
    }
    
    .about-heading {
      font-size: 14px;
      font-weight: ${TYPOGRAPHY.weights.semibold};
      color: ${BRAND_COLORS.cyan};
      margin-bottom: 4mm;
    }
    
    .about-content {
      font-size: 10pt;
      line-height: ${TYPOGRAPHY.lineHeights.relaxed};
      opacity: 0.95;
    }
    
    /* Contact CTA */
    .contact-cta {
      background: ${BRAND_COLORS.cyan};
      color: ${BRAND_COLORS.navy};
      padding: 8mm 10mm 10mm 10mm;
      border-radius: ${BORDERS.radius.base};
      margin-top: 6mm;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 30mm;
      line-height: ${TYPOGRAPHY.lineHeights.relaxed};
    }
    
    .cta-heading {
      font-size: 14px;
      font-weight: ${TYPOGRAPHY.weights.semibold};
      margin-bottom: 3mm;
      line-height: ${TYPOGRAPHY.lineHeights.normal};
      width: 100%;
    }
    
    .cta-content {
      font-size: 10pt;
      opacity: 0.9;
      line-height: ${TYPOGRAPHY.lineHeights.relaxed};
      margin-bottom: 3mm;
      width: 100%;
    }
    
    .cta-link {
      display: inline-block;
      background: ${BRAND_COLORS.navy};
      color: ${BRAND_COLORS.cream};
      padding: 3mm 7mm;
      border-radius: 15px;
      font-size: 10pt;
      font-weight: ${TYPOGRAPHY.weights.semibold};
      text-decoration: none;
      margin-bottom: 3mm;
    }
    
    .cta-contact {
      font-size: 9pt;
      opacity: 0.85;
      line-height: ${TYPOGRAPHY.lineHeights.normal};
      width: 100%;
    }
    
    .cta-contact a {
      color: ${BRAND_COLORS.navy};
      text-decoration: none;
      font-weight: ${TYPOGRAPHY.weights.medium};
    }
    
    /* Disclaimer */
    .disclaimer-section {
      margin-top: 15mm;
    }
    
    .disclaimer-box {
      background: ${BRAND_COLORS.lightGray};
      border-left: 4px solid ${BRAND_COLORS.navy};
      padding: 6mm 8mm;
      border-radius: 0 ${BORDERS.radius.base} ${BORDERS.radius.base} 0;
    }
    
    .disclaimer-heading {
      font-size: 11px;
      font-weight: ${TYPOGRAPHY.weights.semibold};
      color: ${BRAND_COLORS.navy};
      margin-bottom: 3mm;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .disclaimer-text {
      font-size: 9pt;
      color: ${BRAND_COLORS.slateGray};
      line-height: ${TYPOGRAPHY.lineHeights.relaxed};
      margin-bottom: 2mm;
    }
    
    .disclaimer-text:last-child {
      margin-bottom: 0;
    }
  `;
}

export function generateFullDocument(options: DocumentOptions): string {
  const showToc = options.showTableOfContents !== false;
  const showSummary = options.showExecutiveSummary !== false;
  const showAbout = options.showAboutSection !== false;
  const showDisclaimer = options.showDisclaimer !== false;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(options.title)} - Constancia</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${TYPOGRAPHY.fontImport}" rel="stylesheet">
  <style>
    ${generateDocumentStyles()}
  </style>
</head>
<body>
  ${generateCoverPage({
    title: options.title,
    subtitle: options.subtitle,
    category: options.category,
    description: options.description,
    publishedAt: options.publishedAt,
    version: options.version,
  })}
  
  <div class="content-wrapper">
    ${showSummary ? generateExecutiveSummary(options.description) : ''}
    ${showToc ? generateTableOfContents(options.sections) : ''}
    
    ${options.sections.map((section, index) => generateSection(section, index)).join('')}
    
    ${showAbout ? generateAboutSection() : ''}
    ${showDisclaimer ? generateDisclaimer() : ''}
  </div>
</body>
</html>
  `;
}
