/**
 * Adobe PDF Services Integration
 * 
 * Provides pixel-perfect PDF generation using Adobe's PDF Services API.
 * Converts HTML templates to professional-quality PDFs with support for:
 * - Custom fonts and typography
 * - Dynamic data injection
 * - Headers and footers
 * - Page layouts and margins
 */

import {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  HTMLToPDFJob,
  HTMLToPDFResult,
  SDKError,
  ServiceUsageError,
  ServiceApiError,
  PageLayout,
  HTMLToPDFParams,
  CompressPDFJob,
  CompressPDFParams,
  CompressPDFResult,
  CompressionLevel,
  LinearizePDFJob,
  LinearizePDFResult,
  PDFWatermarkJob,
  PDFWatermarkParams,
  PDFWatermarkResult,
  WatermarkAppearance,
} from '@adobe/pdfservices-node-sdk';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { Readable } from 'stream';
import { LOGO_TURQUOISE_BASE64 } from '../../pdf-logo-base64';

export interface AdobePDFConfig {
  clientId: string;
  clientSecret: string;
}

export interface PDFGenerationOptions {
  pageLayout?: {
    pageWidth?: number;
    pageHeight?: number;
  };
  includeHeaderFooter?: boolean;
  json?: Record<string, unknown>;
}

export interface HTMLContent {
  html: string;
  css?: string;
  assets?: Array<{ name: string; data: Buffer; mimeType: string }>;
}

export interface WatermarkOptions {
  opacity?: number;
  position?: 'diagonal' | 'footer' | 'header' | 'corner';
  foreground?: boolean;
}

export interface PDFEnhancementOptions {
  watermark?: WatermarkOptions;
  compress?: boolean | 'LOW' | 'MEDIUM' | 'HIGH';
  linearize?: boolean;
}

let pdfServicesInstance: PDFServices | null = null;

function getPDFServices(): PDFServices {
  if (pdfServicesInstance) {
    return pdfServicesInstance;
  }

  const clientId = process.env.ADOBE_PDF_CLIENT_ID;
  const clientSecret = process.env.ADOBE_PDF_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Adobe PDF Services credentials not configured. Please set ADOBE_PDF_CLIENT_ID and ADOBE_PDF_CLIENT_SECRET environment variables.'
    );
  }

  const credentials = new ServicePrincipalCredentials({
    clientId,
    clientSecret,
  });

  pdfServicesInstance = new PDFServices({ credentials });
  return pdfServicesInstance;
}

async function createZipFromHTML(content: HTMLContent): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    
    let fullHtml = content.html;
    if (content.css) {
      fullHtml = content.html.replace(
        '</head>',
        `<style>${content.css}</style></head>`
      );
    }
    
    archive.append(fullHtml, { name: 'index.html' });
    
    if (content.assets) {
      for (const asset of content.assets) {
        archive.append(asset.data, { name: asset.name });
      }
    }
    
    archive.finalize();
  });
}

export async function generatePDFFromHTML(
  content: HTMLContent,
  options: PDFGenerationOptions = {}
): Promise<Buffer> {
  const pdfServices = getPDFServices();
  
  const zipBuffer = await createZipFromHTML(content);
  
  const readStream = Readable.from(zipBuffer);
  
  const inputAsset = await pdfServices.upload({
    readStream,
    mimeType: MimeType.ZIP,
  });
  
  const pageWidth = options.pageLayout?.pageWidth || 8.27;
  const pageHeight = options.pageLayout?.pageHeight || 11.69;
  
  const pageLayout = new PageLayout({
    pageWidth,
    pageHeight,
  });
  
  const params = new HTMLToPDFParams({
    pageLayout,
    includeHeaderFooter: options.includeHeaderFooter ?? false,
    dataToMerge: options.json,
  });
  
  const job = new HTMLToPDFJob({ inputAsset, params });
  
  const pollingURL = await pdfServices.submit({ job });
  const pdfServicesResponse = await pdfServices.getJobResult({
    pollingURL,
    resultType: HTMLToPDFResult,
  });
  
  const resultAsset = pdfServicesResponse.result?.asset;
  if (!resultAsset) {
    throw new Error('PDF generation failed: No result asset returned');
  }
  
  const streamAsset = await pdfServices.getContent({ asset: resultAsset });
  
  const chunks: Buffer[] = [];
  for await (const chunk of streamAsset.readStream) {
    chunks.push(Buffer.from(chunk));
  }
  
  return Buffer.concat(chunks);
}

export async function generatePDFFromURL(
  url: string,
  options: PDFGenerationOptions = {}
): Promise<Buffer> {
  const pdfServices = getPDFServices();
  
  const pageWidth = options.pageLayout?.pageWidth || 8.27;
  const pageHeight = options.pageLayout?.pageHeight || 11.69;
  
  const pageLayout = new PageLayout({
    pageWidth,
    pageHeight,
  });
  
  const params = new HTMLToPDFParams({
    pageLayout,
    includeHeaderFooter: options.includeHeaderFooter ?? false,
  });
  
  const job = new HTMLToPDFJob({ inputURL: url, params });
  
  const pollingURL = await pdfServices.submit({ job });
  const pdfServicesResponse = await pdfServices.getJobResult({
    pollingURL,
    resultType: HTMLToPDFResult,
  });
  
  const resultAsset = pdfServicesResponse.result?.asset;
  if (!resultAsset) {
    throw new Error('PDF generation failed: No result asset returned');
  }
  
  const streamAsset = await pdfServices.getContent({ asset: resultAsset });
  
  const chunks: Buffer[] = [];
  for await (const chunk of streamAsset.readStream) {
    chunks.push(Buffer.from(chunk));
  }
  
  return Buffer.concat(chunks);
}

export function isAdobePDFConfigured(): boolean {
  return !!(process.env.ADOBE_PDF_CLIENT_ID && process.env.ADOBE_PDF_CLIENT_SECRET);
}

export function resetPDFServicesInstance(): void {
  pdfServicesInstance = null;
}

function createLogoWatermarkHTML(options: WatermarkOptions): string {
  const opacity = options.opacity ?? 15;
  const position = options.position ?? 'corner';
  
  let positionStyles = '';
  let logoSize = '';
  
  switch (position) {
    case 'diagonal':
      positionStyles = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-15deg);
      `;
      logoSize = 'width: 120mm; height: auto;';
      break;
    case 'header':
      positionStyles = `
        position: absolute;
        top: 15mm;
        right: 15mm;
      `;
      logoSize = 'width: 35mm; height: auto;';
      break;
    case 'footer':
      positionStyles = `
        position: absolute;
        bottom: 15mm;
        right: 15mm;
      `;
      logoSize = 'width: 35mm; height: auto;';
      break;
    case 'corner':
    default:
      positionStyles = `
        position: absolute;
        bottom: 12mm;
        right: 12mm;
      `;
      logoSize = 'width: 28mm; height: auto;';
      break;
  }
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 210mm;
      height: 297mm;
      position: relative;
      background: transparent;
    }
    .watermark {
      ${positionStyles}
      opacity: ${opacity / 100};
      pointer-events: none;
      user-select: none;
    }
    .watermark img {
      ${logoSize}
      display: block;
    }
  </style>
</head>
<body>
  <div class="watermark">
    <img src="${LOGO_TURQUOISE_BASE64}" alt="1QG" />
  </div>
</body>
</html>
  `.trim();
}

export async function addWatermarkToPDF(
  pdfBuffer: Buffer,
  watermarkOptions: WatermarkOptions = {}
): Promise<Buffer> {
  const pdfServices = getPDFServices();
  
  const watermarkHtml = createLogoWatermarkHTML(watermarkOptions);
  const watermarkPdfBuffer = await generatePDFFromHTML({ html: watermarkHtml });
  
  const sourceReadStream = Readable.from(pdfBuffer);
  const sourceAsset = await pdfServices.upload({
    readStream: sourceReadStream,
    mimeType: MimeType.PDF,
  });
  
  const watermarkReadStream = Readable.from(watermarkPdfBuffer);
  const watermarkAsset = await pdfServices.upload({
    readStream: watermarkReadStream,
    mimeType: MimeType.PDF,
  });
  
  const appearOnForeground = watermarkOptions.foreground ?? true;
  
  const watermarkAppearance = new WatermarkAppearance({
    appearOnForeground,
  });
  
  const params = new PDFWatermarkParams({
    watermarkAppearance,
  });
  
  const job = new PDFWatermarkJob({
    inputAsset: sourceAsset,
    watermarkAsset,
    params,
  });
  
  const pollingURL = await pdfServices.submit({ job });
  const pdfServicesResponse = await pdfServices.getJobResult({
    pollingURL,
    resultType: PDFWatermarkResult,
  });
  
  const resultAsset = pdfServicesResponse.result?.asset;
  if (!resultAsset) {
    throw new Error('Watermark operation failed: No result asset returned');
  }
  
  const streamAsset = await pdfServices.getContent({ asset: resultAsset });
  
  const chunks: Buffer[] = [];
  for await (const chunk of streamAsset.readStream) {
    chunks.push(Buffer.from(chunk));
  }
  
  return Buffer.concat(chunks);
}

export async function compressPDF(
  pdfBuffer: Buffer,
  level: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'
): Promise<Buffer> {
  const pdfServices = getPDFServices();
  
  const readStream = Readable.from(pdfBuffer);
  const inputAsset = await pdfServices.upload({
    readStream,
    mimeType: MimeType.PDF,
  });
  
  let compressionLevel: CompressionLevel;
  switch (level) {
    case 'LOW':
      compressionLevel = CompressionLevel.LOW;
      break;
    case 'HIGH':
      compressionLevel = CompressionLevel.HIGH;
      break;
    case 'MEDIUM':
    default:
      compressionLevel = CompressionLevel.MEDIUM;
      break;
  }
  
  const params = new CompressPDFParams({
    compressionLevel,
  });
  
  const job = new CompressPDFJob({ inputAsset, params });
  
  const pollingURL = await pdfServices.submit({ job });
  const pdfServicesResponse = await pdfServices.getJobResult({
    pollingURL,
    resultType: CompressPDFResult,
  });
  
  const resultAsset = pdfServicesResponse.result?.asset;
  if (!resultAsset) {
    throw new Error('PDF compression failed: No result asset returned');
  }
  
  const streamAsset = await pdfServices.getContent({ asset: resultAsset });
  
  const chunks: Buffer[] = [];
  for await (const chunk of streamAsset.readStream) {
    chunks.push(Buffer.from(chunk));
  }
  
  return Buffer.concat(chunks);
}

export async function linearizePDF(pdfBuffer: Buffer): Promise<Buffer> {
  const pdfServices = getPDFServices();
  
  const readStream = Readable.from(pdfBuffer);
  const inputAsset = await pdfServices.upload({
    readStream,
    mimeType: MimeType.PDF,
  });
  
  const job = new LinearizePDFJob({ inputAsset });
  
  const pollingURL = await pdfServices.submit({ job });
  const pdfServicesResponse = await pdfServices.getJobResult({
    pollingURL,
    resultType: LinearizePDFResult,
  });
  
  const resultAsset = pdfServicesResponse.result?.asset;
  if (!resultAsset) {
    throw new Error('PDF linearization failed: No result asset returned');
  }
  
  const streamAsset = await pdfServices.getContent({ asset: resultAsset });
  
  const chunks: Buffer[] = [];
  for await (const chunk of streamAsset.readStream) {
    chunks.push(Buffer.from(chunk));
  }
  
  return Buffer.concat(chunks);
}

export async function enhancePDF(
  pdfBuffer: Buffer,
  options: PDFEnhancementOptions
): Promise<Buffer> {
  let result = pdfBuffer;
  
  if (options.watermark) {
    result = await addWatermarkToPDF(result, options.watermark);
  }
  
  if (options.compress) {
    const level = typeof options.compress === 'string' ? options.compress : 'MEDIUM';
    result = await compressPDF(result, level);
  }
  
  if (options.linearize) {
    result = await linearizePDF(result);
  }
  
  return result;
}
