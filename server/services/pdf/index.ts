/**
 * Unified PDF Service
 * 
 * Main entry point for pixel-perfect PDF generation using Adobe PDF Services.
 * Includes compression and linearization for optimized output.
 */

export * from './design-system';
export * from './template-builder';
export * from './adobe-pdf-service';

import { 
  generatePDFFromHTML, 
  isAdobePDFConfigured, 
  compressPDF, 
  linearizePDF,
  addWatermarkToPDF,
  type WatermarkOptions
} from './adobe-pdf-service';
import { generateFullDocument, type DocumentOptions, type SectionContent } from './template-builder';
import { createChildLogger } from '../../lib/logger';

const log = createChildLogger("pdf-service");

export interface PDFResult {
  buffer: Buffer;
  method: 'adobe';
}

export interface PDFEnhancementConfig {
  compress?: boolean | 'LOW' | 'MEDIUM' | 'HIGH';
  linearize?: boolean;
  watermark?: boolean | WatermarkOptions;
}

export async function generateDocumentPDF(
  options: DocumentOptions, 
  enhancements: PDFEnhancementConfig = { compress: 'MEDIUM', linearize: true }
): Promise<PDFResult> {
  if (!isAdobePDFConfigured()) {
    throw new Error('Adobe PDF Services not configured. Please set ADOBE_PDF_CLIENT_ID and ADOBE_PDF_CLIENT_SECRET environment variables.');
  }
  
  const html = generateFullDocument(options);
  
  log.info("Generating PDF using Adobe PDF Services");
  let buffer = await generatePDFFromHTML({ html });
  
  if (enhancements.watermark) {
    log.info("Adding logo watermark");
    const watermarkOpts = typeof enhancements.watermark === 'object' ? enhancements.watermark : {};
    buffer = await addWatermarkToPDF(buffer, watermarkOpts);
  }
  
  if (enhancements.compress) {
    const level = typeof enhancements.compress === 'string' ? enhancements.compress : 'MEDIUM';
    log.info({ level }, "Compressing PDF");
    buffer = await compressPDF(buffer, level);
  }
  
  if (enhancements.linearize) {
    log.info("Linearizing PDF for web optimization");
    buffer = await linearizePDF(buffer);
  }
  
  return { buffer, method: 'adobe' };
}

export async function generateResourcePDF(
  resource: {
    title: string;
    subtitle?: string;
    category: string;
    description: string;
    sections: SectionContent[];
    publishedAt: string;
    version?: string;
  },
  enhancements: PDFEnhancementConfig = { compress: 'MEDIUM', linearize: true }
): Promise<PDFResult> {
  return generateDocumentPDF({
    ...resource,
    showTableOfContents: true,
    showExecutiveSummary: true,
    showAboutSection: true,
    showDisclaimer: true,
  }, enhancements);
}

export async function generateReportPDF(
  report: {
    title: string;
    subtitle?: string;
    category: string;
    description: string;
    sections: SectionContent[];
    publishedAt: string;
  },
  enhancements: PDFEnhancementConfig = { compress: 'MEDIUM', linearize: true }
): Promise<PDFResult> {
  return generateDocumentPDF({
    ...report,
    showTableOfContents: true,
    showExecutiveSummary: true,
    showAboutSection: false,
    showDisclaimer: true,
  }, enhancements);
}

export async function generatePDFFromRawHTML(
  html: string,
  enhancements: PDFEnhancementConfig = { compress: 'MEDIUM', linearize: true }
): Promise<PDFResult> {
  if (!isAdobePDFConfigured()) {
    throw new Error('Adobe PDF Services not configured. Please set ADOBE_PDF_CLIENT_ID and ADOBE_PDF_CLIENT_SECRET environment variables.');
  }
  
  log.info("Generating PDF from custom HTML using Adobe PDF Services");
  let buffer = await generatePDFFromHTML({ html });
  
  if (enhancements.watermark) {
    log.info("Adding logo watermark");
    const watermarkOpts = typeof enhancements.watermark === 'object' ? enhancements.watermark : {};
    buffer = await addWatermarkToPDF(buffer, watermarkOpts);
  }
  
  if (enhancements.compress) {
    const level = typeof enhancements.compress === 'string' ? enhancements.compress : 'MEDIUM';
    log.info({ level }, "Compressing PDF");
    buffer = await compressPDF(buffer, level);
  }
  
  if (enhancements.linearize) {
    log.info("Linearizing PDF for web optimization");
    buffer = await linearizePDF(buffer);
  }
  
  return { buffer, method: 'adobe' };
}
