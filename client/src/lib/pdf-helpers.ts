/**
 * jsPDF Helper Utilities
 * Provides pagination, image scaling, and layout helpers for professional PDF generation.
 * 
 * Key principles:
 * - Aspect-ratio-safe image handling
 * - Predictable page breaks
 * - Consistent headers/footers
 */

import { jsPDF } from "jspdf";

import {
  PDF_BRAND_COLORS,
  PDF_CONTACT_INFO,
  PDF_PAGE_SIZE,
  PDF_MARGINS,
  PDF_FOOTER_HEIGHT,
  PDF_CONTENT_AREA,
  PDF_TYPOGRAPHY,
  PDF_SPACING,
  scaleToFit,
  willFitOnPage,
  getPageBottomY,
  formatDateUK,
} from "@shared/pdf-config";

// Re-export shared config for convenience
export {
  PDF_BRAND_COLORS,
  PDF_CONTACT_INFO,
  PDF_PAGE_SIZE,
  PDF_MARGINS,
  PDF_FOOTER_HEIGHT,
  PDF_CONTENT_AREA,
  PDF_TYPOGRAPHY,
  PDF_SPACING,
  scaleToFit,
  willFitOnPage,
  getPageBottomY,
  formatDateUK,
};

/**
 * Create a new jsPDF document with standard A4 configuration
 */
export function createPDFDocument(): jsPDF {
  return new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
}

/**
 * Get page dimensions from a jsPDF document
 */
export function getPageDimensions(doc: jsPDF): { width: number; height: number } {
  return {
    width: doc.internal.pageSize.getWidth(),
    height: doc.internal.pageSize.getHeight(),
  };
}

/**
 * Get effective content area considering margins
 */
export function getContentArea(doc: jsPDF): {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
} {
  const { width, height } = getPageDimensions(doc);
  return {
    left: PDF_MARGINS.left,
    right: width - PDF_MARGINS.right,
    top: PDF_MARGINS.top,
    bottom: height - PDF_MARGINS.bottom - PDF_FOOTER_HEIGHT,
    width: width - PDF_MARGINS.left - PDF_MARGINS.right,
    height: height - PDF_MARGINS.top - PDF_MARGINS.bottom - PDF_FOOTER_HEIGHT,
  };
}

/**
 * Ensure there is enough space on the current page for content.
 * If not, adds a new page and optionally redraws the header.
 * 
 * @param doc - jsPDF document instance
 * @param currentY - Current Y position
 * @param neededHeight - Height needed for the content
 * @param onNewPage - Optional callback to draw header on new page
 * @returns New Y position (either current or reset to top of new page)
 */
export function ensurePageSpace(
  doc: jsPDF,
  currentY: number,
  neededHeight: number,
  onNewPage?: (doc: jsPDF) => number
): number {
  const { height } = getPageDimensions(doc);
  const bottomY = height - PDF_MARGINS.bottom - PDF_FOOTER_HEIGHT;

  if (currentY + neededHeight > bottomY) {
    doc.addPage();
    if (onNewPage) {
      return onNewPage(doc);
    }
    return PDF_MARGINS.top;
  }
  return currentY;
}

/**
 * Scale image to fit within max dimensions while preserving aspect ratio.
 * Uses getImageProperties to get original dimensions.
 * 
 * @param doc - jsPDF document instance
 * @param imageData - Base64 or URL of image
 * @param maxWidth - Maximum allowed width
 * @param maxHeight - Maximum allowed height
 * @returns Scaled dimensions
 */
export async function scaleImageToFit(
  doc: jsPDF,
  imageData: string,
  maxWidth: number,
  maxHeight: number
): Promise<{ width: number; height: number }> {
  try {
    const props = doc.getImageProperties(imageData);
    return scaleToFit(props.width, props.height, maxWidth, maxHeight);
  } catch {
    // Fallback to max dimensions if properties can't be read
    return { width: maxWidth, height: maxHeight };
  }
}

/**
 * Add an image with aspect-ratio preservation
 * 
 * @param doc - jsPDF document instance
 * @param imageData - Base64 or URL of image
 * @param x - X position
 * @param y - Y position
 * @param maxWidth - Maximum allowed width
 * @param maxHeight - Maximum allowed height
 * @param format - Image format (PNG, JPEG, etc.)
 * @returns Actual dimensions used
 */
export async function addImagePreserveRatio(
  doc: jsPDF,
  imageData: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  format: string = "JPEG"
): Promise<{ width: number; height: number }> {
  const { width, height } = await scaleImageToFit(doc, imageData, maxWidth, maxHeight);
  doc.addImage(imageData, format, x, y, width, height);
  return { width, height };
}

/**
 * Draw standard page header with logo and title
 * 
 * @param doc - jsPDF document instance
 * @param title - Document title to display
 * @param logoImage - Optional logo image (base64 or loaded Image)
 * @returns Y position after header
 */
export function drawStandardHeader(
  doc: jsPDF,
  title: string,
  logoImage?: HTMLImageElement | string
): number {
  const { width } = getPageDimensions(doc);
  const headerY = 12;

  // Logo
  if (logoImage) {
    try {
      doc.addImage(logoImage, "PNG", PDF_MARGINS.left, headerY - 2, 35, 10);
    } catch {
      doc.setFontSize(16);
      doc.setTextColor(PDF_BRAND_COLORS.navy.hex);
      doc.text("Constancia", PDF_MARGINS.left, headerY + 4);
    }
  } else {
    doc.setFontSize(16);
    doc.setTextColor(PDF_BRAND_COLORS.navy.hex);
    doc.text("Constancia", PDF_MARGINS.left, headerY + 4);
  }

  // Title (right-aligned)
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.caption);
  doc.setTextColor(148, 163, 184);
  doc.text(title, width - PDF_MARGINS.right, headerY + 4, { align: "right" });

  // Header line
  doc.setDrawColor(PDF_BRAND_COLORS.teal.hex);
  doc.setLineWidth(0.3);
  doc.line(PDF_MARGINS.left, headerY + 10, width - PDF_MARGINS.right, headerY + 10);

  return headerY + 15; // Return Y position after header
}

/**
 * Draw standard page footer with contact info and page number
 * 
 * @param doc - jsPDF document instance
 * @param pageNum - Current page number
 * @param totalPages - Total number of pages
 */
export function drawStandardFooter(
  doc: jsPDF,
  pageNum: number,
  totalPages: number
): void {
  const { width, height } = getPageDimensions(doc);
  const footerY = height - PDF_MARGINS.bottom + 5;

  // Footer line
  doc.setDrawColor(PDF_BRAND_COLORS.teal.hex);
  doc.setLineWidth(0.5);
  doc.line(PDF_MARGINS.left, footerY - 5, width - PDF_MARGINS.right, footerY - 5);

  // Contact info
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.footer);
  doc.setTextColor(PDF_BRAND_COLORS.teal.hex);
  doc.text(
    `Constancia  |  ${PDF_CONTACT_INFO.email}  |  ${PDF_CONTACT_INFO.website}  |  London, UK`,
    PDF_MARGINS.left,
    footerY
  );

  // Page number
  doc.text(
    `Page ${pageNum} of ${totalPages}`,
    width - PDF_MARGINS.right,
    footerY,
    { align: "right" }
  );
}

/**
 * Apply headers and footers to all content pages (excluding cover page)
 * 
 * @param doc - jsPDF document instance
 * @param title - Document title for header
 * @param startPage - First page to apply headers/footers (default 2, skipping cover)
 */
export function applyHeadersAndFooters(
  doc: jsPDF,
  title: string,
  startPage: number = 2
): void {
  const totalPages = doc.getNumberOfPages();
  const contentPages = totalPages - (startPage - 1);

  for (let i = startPage; i <= totalPages; i++) {
    doc.setPage(i);
    drawStandardHeader(doc, title);
    drawStandardFooter(doc, i - startPage + 1, contentPages);
  }
}

/**
 * Draw a paragraph of text with automatic wrapping and page break handling
 * 
 * @param doc - jsPDF document instance
 * @param text - Text to render
 * @param x - X position
 * @param y - Starting Y position
 * @param options - Optional configuration
 * @returns Object with final Y position and height used
 */
export function drawParagraph(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options: {
    maxWidth?: number;
    fontSize?: number;
    lineHeight?: number;
    color?: string | [number, number, number];
    fontStyle?: "normal" | "bold" | "italic";
    onNewPage?: (doc: jsPDF) => number;
  } = {}
): { finalY: number; heightUsed: number } {
  const {
    maxWidth = PDF_CONTENT_AREA.width,
    fontSize = PDF_TYPOGRAPHY.sizes.body,
    lineHeight = 5,
    color = PDF_BRAND_COLORS.darkGray.hex,
    fontStyle = "normal",
    onNewPage,
  } = options;

  doc.setFontSize(fontSize);
  doc.setFont("helvetica", fontStyle);
  if (typeof color === "string") {
    doc.setTextColor(color);
  } else {
    doc.setTextColor(color[0], color[1], color[2]);
  }

  const lines = doc.splitTextToSize(text, maxWidth);
  let currentY = y;

  for (const line of lines) {
    currentY = ensurePageSpace(doc, currentY, lineHeight, onNewPage);
    doc.text(line, x, currentY);
    currentY += lineHeight;
  }

  return {
    finalY: currentY,
    heightUsed: currentY - y,
  };
}

/**
 * Calculate approximate height for text before rendering
 * 
 * @param doc - jsPDF document instance
 * @param text - Text to measure
 * @param maxWidth - Maximum width for wrapping
 * @param lineHeight - Line height in mm
 * @returns Approximate height in mm
 */
export function measureTextHeight(
  doc: jsPDF,
  text: string,
  maxWidth: number = PDF_CONTENT_AREA.width,
  lineHeight: number = 5
): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  return lines.length * lineHeight;
}

/**
 * Estimate table row height based on content
 * 
 * @param fontSize - Font size used
 * @param padding - Cell padding
 * @returns Approximate row height in mm
 */
export function estimateRowHeight(
  fontSize: number = PDF_TYPOGRAPHY.sizes.body,
  padding: number = 4
): number {
  return (fontSize * 0.35) + (padding * 2);
}

/**
 * Add an image with aspect-ratio preservation (synchronous version)
 * Uses getImageProperties for dimension detection with fallback
 * 
 * @param doc - jsPDF document instance
 * @param imageData - Base64 or URL of image
 * @param x - X position
 * @param y - Y position
 * @param maxWidth - Maximum allowed width
 * @param maxHeight - Maximum allowed height
 * @param format - Image format (PNG, JPEG, etc.)
 * @param center - Whether to center horizontally within maxWidth
 * @returns Actual dimensions and position used
 */
export function addImagePreserveRatioSync(
  doc: jsPDF,
  imageData: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  format: string = "JPEG",
  center: boolean = false
): { width: number; height: number; x: number; y: number } {
  let finalWidth = maxWidth;
  let finalHeight = maxHeight;

  try {
    const props = doc.getImageProperties(imageData);
    if (props.width && props.height) {
      const scaled = scaleToFit(props.width, props.height, maxWidth, maxHeight);
      finalWidth = scaled.width;
      finalHeight = scaled.height;
    }
  } catch {
    // Fallback: use square aspect ratio with smaller dimension to prevent stretching
    const minDim = Math.min(maxWidth, maxHeight);
    finalWidth = minDim;
    finalHeight = minDim;
  }

  // Center horizontally if requested
  const finalX = center ? x + (maxWidth - finalWidth) / 2 : x;

  doc.addImage(imageData, format, finalX, y, finalWidth, finalHeight);
  return { width: finalWidth, height: finalHeight, x: finalX, y };
}

// ============================================================================
// INTELLIGENT CONTENT-AWARE PAGINATION HELPERS
// These wrappers dynamically calculate space requirements based on content
// ============================================================================

/**
 * Measure and ensure space for a table before rendering
 * Dynamically calculates required height based on rows and configuration
 */
export function ensureSpaceForTable(
  doc: jsPDF,
  currentY: number,
  options: {
    rowCount: number;
    hasHeader?: boolean;
    fontSize?: number;
    cellPadding?: number;
    headerHeight?: number;
    minRowHeight?: number;
    extraSpace?: number;
  },
  onNewPage?: (doc: jsPDF) => number
): number {
  const {
    rowCount,
    hasHeader = true,
    fontSize = 9,
    cellPadding = 4,
    headerHeight = 12,
    minRowHeight = 8,
    extraSpace = 10,
  } = options;

  // Calculate row height based on font size and padding
  const rowHeight = Math.max((fontSize * 0.4) + (cellPadding * 2), minRowHeight);
  
  // Calculate total table height
  const headerSpace = hasHeader ? headerHeight : 0;
  const bodyHeight = rowCount * rowHeight;
  const totalHeight = headerSpace + bodyHeight + extraSpace;

  return ensurePageSpace(doc, currentY, totalHeight, onNewPage);
}

/**
 * Measure and ensure space for text/paragraph content
 * Dynamically calculates height by measuring actual text wrapping
 */
export function ensureSpaceForText(
  doc: jsPDF,
  currentY: number,
  text: string,
  options: {
    maxWidth?: number;
    fontSize?: number;
    lineHeight?: number;
    extraSpace?: number;
  } = {},
  onNewPage?: (doc: jsPDF) => number
): number {
  const {
    maxWidth = PDF_CONTENT_AREA.width,
    fontSize = PDF_TYPOGRAPHY.sizes.body,
    lineHeight = 5,
    extraSpace = 5,
  } = options;

  // Temporarily set font size to get accurate text measurement
  const prevFontSize = doc.getFontSize();
  doc.setFontSize(fontSize);
  
  const lines = doc.splitTextToSize(text, maxWidth);
  const textHeight = lines.length * lineHeight + extraSpace;
  
  // Restore previous font size
  doc.setFontSize(prevFontSize);

  return ensurePageSpace(doc, currentY, textHeight, onNewPage);
}

/**
 * Measure and ensure space for an image
 * Dynamically calculates height based on actual image dimensions
 * 
 * @param titleHeight - Set to 0 if no title will be rendered above the image
 */
export function ensureSpaceForImage(
  doc: jsPDF,
  currentY: number,
  imageData: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    titleHeight?: number; // Set to 0 if no title
    extraSpace?: number;
  } = {},
  onNewPage?: (doc: jsPDF) => number
): { y: number; estimatedHeight: number } {
  const {
    maxWidth = PDF_CONTENT_AREA.width,
    maxHeight = 100,
    titleHeight = 0, // Default to 0 - caller specifies if title exists
    extraSpace = 15,
  } = options;

  let estimatedHeight = maxHeight;

  try {
    const props = doc.getImageProperties(imageData);
    if (props.width && props.height) {
      const scaled = scaleToFit(props.width, props.height, maxWidth, maxHeight);
      estimatedHeight = scaled.height;
    }
  } catch {
    // Use max height if can't read properties
  }

  const totalSpace = titleHeight + estimatedHeight + extraSpace;
  const newY = ensurePageSpace(doc, currentY, totalSpace, onNewPage);

  return { y: newY, estimatedHeight };
}

/**
 * Ensure space for a section header with title
 * Use when you're about to render a section title and want to avoid orphaned headers
 * 
 * @param followingContentHeight - Measured or known height of content that follows the title
 */
export function ensureSpaceForSection(
  doc: jsPDF,
  currentY: number,
  options: {
    titleFontSize?: number;
    followingContentHeight: number; // Required: caller must specify known/measured content height
    spacing?: number;
  },
  onNewPage?: (doc: jsPDF) => number
): number {
  const {
    titleFontSize = 14,
    followingContentHeight,
    spacing = 8,
  } = options;

  // Title height + spacing + actual following content height
  const titleHeight = titleFontSize * 0.4;
  const totalSpace = titleHeight + spacing + followingContentHeight;

  return ensurePageSpace(doc, currentY, totalSpace, onNewPage);
}

/**
 * Ensure space for a card/box element by measuring actual content
 * Pass the actual text content to get accurate measurement
 */
export function ensureSpaceForCard(
  doc: jsPDF,
  currentY: number,
  options: {
    content?: string; // Actual text content to measure
    contentLines?: number; // Fallback: estimated line count if content not provided
    maxWidth?: number;
    fontSize?: number;
    lineHeight?: number;
    padding?: number;
    extraSpace?: number;
  } = {},
  onNewPage?: (doc: jsPDF) => number
): number {
  const {
    content,
    contentLines = 3,
    maxWidth = PDF_CONTENT_AREA.width - 20, // Account for card padding
    fontSize = 9,
    lineHeight = 5,
    padding = 10,
    extraSpace = 10,
  } = options;

  let measuredLines = contentLines;
  
  // If actual content provided, measure it
  if (content) {
    const prevFontSize = doc.getFontSize();
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(content, maxWidth);
    measuredLines = lines.length;
    doc.setFontSize(prevFontSize);
  }

  const contentHeight = measuredLines * lineHeight;
  const totalHeight = contentHeight + (padding * 2) + extraSpace;

  return ensurePageSpace(doc, currentY, totalHeight, onNewPage);
}

/**
 * Smart pagination wrapper that auto-detects content type
 * Pass content description and it calculates space dynamically
 */
export function ensureSpaceFor(
  doc: jsPDF,
  currentY: number,
  content: 
    | { type: 'table'; rows: number; hasHeader?: boolean }
    | { type: 'text'; text: string; maxWidth?: number }
    | { type: 'image'; imageData: string; maxWidth?: number; maxHeight?: number }
    | { type: 'section'; followingHeight: number }
    | { type: 'card'; lines?: number }
    | { type: 'custom'; height: number },
  onNewPage?: (doc: jsPDF) => number
): number {
  switch (content.type) {
    case 'table':
      return ensureSpaceForTable(doc, currentY, {
        rowCount: content.rows,
        hasHeader: content.hasHeader ?? true,
      }, onNewPage);

    case 'text':
      return ensureSpaceForText(doc, currentY, content.text, {
        maxWidth: content.maxWidth,
      }, onNewPage);

    case 'image':
      return ensureSpaceForImage(doc, currentY, content.imageData, {
        maxWidth: content.maxWidth,
        maxHeight: content.maxHeight,
      }, onNewPage).y;

    case 'section':
      return ensureSpaceForSection(doc, currentY, {
        followingContentHeight: content.followingHeight,
      }, onNewPage);

    case 'card':
      return ensureSpaceForCard(doc, currentY, {
        contentLines: content.lines ?? 3,
      }, onNewPage);

    case 'custom':
      return ensurePageSpace(doc, currentY, content.height, onNewPage);

    default:
      return currentY;
  }
}

// ============================================================================
// PDF SECTION CONTEXT CLASS
// ============================================================================

/**
 * PDFSectionContext - Helper class for managing PDF sections with consistent pagination
 * 
 * Provides a convenient API for building PDF content with automatic page break handling,
 * header/footer redraws, and consistent styling.
 */
export class PDFSectionContext {
  private doc: jsPDF;
  private currentY: number;
  private sectionTitle: string;
  private logoImage?: string | HTMLImageElement;
  private onNewPage?: (doc: jsPDF) => number;

  constructor(
    doc: jsPDF,
    initialY: number,
    sectionTitle: string,
    logoImage?: string | HTMLImageElement
  ) {
    this.doc = doc;
    this.currentY = initialY;
    this.sectionTitle = sectionTitle;
    this.logoImage = logoImage;
    
    // Default new page handler redraws header
    this.onNewPage = (d: jsPDF) => {
      return drawStandardHeader(d, this.sectionTitle, this.logoImage);
    };
  }

  /** Get current Y position */
  get y(): number {
    return this.currentY;
  }

  /** Set Y position */
  setY(y: number): this {
    this.currentY = y;
    return this;
  }

  /** Add spacing to Y position */
  addSpacing(space: number): this {
    this.currentY += space;
    return this;
  }

  /** Ensure space for content, triggering page break if needed */
  ensureSpace(neededHeight: number): this {
    this.currentY = ensurePageSpace(this.doc, this.currentY, neededHeight, this.onNewPage);
    return this;
  }

  /** Add a new page and return Y position after header */
  addPage(): this {
    this.doc.addPage();
    if (this.onNewPage) {
      this.currentY = this.onNewPage(this.doc);
    } else {
      this.currentY = PDF_MARGINS.top;
    }
    return this;
  }

  /** Add text at current position */
  text(text: string, options: {
    fontSize?: number;
    color?: string;
    fontStyle?: "normal" | "bold" | "italic";
    align?: "left" | "center" | "right";
    x?: number;
  } = {}): this {
    const {
      fontSize = PDF_TYPOGRAPHY.sizes.body,
      color = PDF_BRAND_COLORS.darkGray.hex,
      fontStyle = "normal",
      align = "left",
      x = PDF_MARGINS.left,
    } = options;

    this.doc.setFontSize(fontSize);
    this.doc.setFont("helvetica", fontStyle);
    this.doc.setTextColor(color);
    
    if (align === "right") {
      const { width } = getPageDimensions(this.doc);
      this.doc.text(text, width - PDF_MARGINS.right, this.currentY, { align: "right" });
    } else if (align === "center") {
      const { width } = getPageDimensions(this.doc);
      this.doc.text(text, width / 2, this.currentY, { align: "center" });
    } else {
      this.doc.text(text, x, this.currentY);
    }
    
    return this;
  }

  /** Add image with aspect-ratio preservation */
  addImage(
    imageData: string,
    maxWidth: number,
    maxHeight: number,
    options: {
      format?: string;
      center?: boolean;
      x?: number;
    } = {}
  ): { width: number; height: number } {
    const {
      format = "JPEG",
      center = false,
      x = PDF_MARGINS.left,
    } = options;

    const result = addImagePreserveRatioSync(
      this.doc,
      imageData,
      x,
      this.currentY,
      maxWidth,
      maxHeight,
      format,
      center
    );
    
    return { width: result.width, height: result.height };
  }

  /** Get the jsPDF document for direct operations */
  getDoc(): jsPDF {
    return this.doc;
  }

  /** Get content area dimensions */
  getContentArea() {
    return getContentArea(this.doc);
  }

  /** Set custom new page handler */
  setNewPageHandler(handler: (doc: jsPDF) => number): this {
    this.onNewPage = handler;
    return this;
  }
}

// ============================================================================
// ADVANCED CONTENT MEASUREMENT UTILITIES
// ============================================================================

/**
 * Measure exact table height based on content and configuration
 * Uses text wrapping calculation for each cell
 */
export function measureTableHeight(
  doc: jsPDF,
  headers: string[],
  rows: (string | number)[][],
  options: {
    columnWidths?: number[];
    fontSize?: number;
    headerFontSize?: number;
    cellPadding?: number;
    headerPadding?: number;
    lineHeight?: number;
  } = {}
): number {
  const {
    fontSize = 9,
    headerFontSize = 10,
    cellPadding = 4,
    headerPadding = 5,
    lineHeight = 4,
  } = options;

  // Save current font state
  const prevFontSize = doc.getFontSize();

  const contentWidth = PDF_CONTENT_AREA.width;
  const colCount = headers.length;
  const defaultColWidth = contentWidth / colCount;
  const columnWidths = options.columnWidths || headers.map(() => defaultColWidth);

  // Measure header row
  doc.setFontSize(headerFontSize);
  let maxHeaderLines = 1;
  headers.forEach((header, i) => {
    const lines = doc.splitTextToSize(header, columnWidths[i] - cellPadding * 2);
    maxHeaderLines = Math.max(maxHeaderLines, lines.length);
  });
  const headerHeight = maxHeaderLines * lineHeight + headerPadding * 2;

  // Measure body rows
  doc.setFontSize(fontSize);
  let totalBodyHeight = 0;
  rows.forEach(row => {
    let maxRowLines = 1;
    row.forEach((cell, i) => {
      const cellText = String(cell);
      const lines = doc.splitTextToSize(cellText, columnWidths[i] - cellPadding * 2);
      maxRowLines = Math.max(maxRowLines, lines.length);
    });
    totalBodyHeight += maxRowLines * lineHeight + cellPadding * 2;
  });

  // Restore font state
  doc.setFontSize(prevFontSize);

  return headerHeight + totalBodyHeight;
}

/**
 * Measure a list of bullet points
 */
export function measureBulletListHeight(
  doc: jsPDF,
  items: string[],
  options: {
    maxWidth?: number;
    fontSize?: number;
    lineHeight?: number;
    bulletIndent?: number;
    itemSpacing?: number;
  } = {}
): number {
  const {
    maxWidth = PDF_CONTENT_AREA.width - 20,
    fontSize = 9,
    lineHeight = 4.5,
    bulletIndent = 10,
    itemSpacing = 2,
  } = options;

  const prevFontSize = doc.getFontSize();
  doc.setFontSize(fontSize);

  let totalHeight = 0;
  const effectiveWidth = maxWidth - bulletIndent;

  items.forEach((item, index) => {
    const lines = doc.splitTextToSize(item, effectiveWidth);
    totalHeight += lines.length * lineHeight;
    if (index < items.length - 1) {
      totalHeight += itemSpacing;
    }
  });

  doc.setFontSize(prevFontSize);
  return totalHeight;
}

/**
 * Calculate card height based on actual content measurement
 */
export function measureCardHeight(
  doc: jsPDF,
  title: string,
  content: string | string[],
  options: {
    maxWidth?: number;
    titleFontSize?: number;
    contentFontSize?: number;
    lineHeight?: number;
    padding?: number;
    titleSpacing?: number;
  } = {}
): number {
  const {
    maxWidth = PDF_CONTENT_AREA.width - 20,
    titleFontSize = 12,
    contentFontSize = 9,
    lineHeight = 4.5,
    padding = 10,
    titleSpacing = 6,
  } = options;

  const prevFontSize = doc.getFontSize();
  const effectiveWidth = maxWidth - padding * 2;

  // Measure title
  doc.setFontSize(titleFontSize);
  const titleLines = doc.splitTextToSize(title, effectiveWidth);
  const titleHeight = titleLines.length * (titleFontSize * 0.4);

  // Measure content
  doc.setFontSize(contentFontSize);
  const contentArray = Array.isArray(content) ? content : [content];
  let contentHeight = 0;
  
  contentArray.forEach((text, index) => {
    const lines = doc.splitTextToSize(text, effectiveWidth);
    contentHeight += lines.length * lineHeight;
    if (index < contentArray.length - 1) {
      contentHeight += lineHeight * 0.5; // Gap between paragraphs
    }
  });

  doc.setFontSize(prevFontSize);
  
  return titleHeight + titleSpacing + contentHeight + padding * 2;
}

/**
 * Measure section with title and mixed content
 * Returns total height needed for the section
 */
export function measureSectionHeight(
  doc: jsPDF,
  title: string,
  contentMeasurements: number[], // Array of content heights already measured
  options: {
    titleFontSize?: number;
    titleSpacing?: number;
    contentGap?: number;
  } = {}
): number {
  const {
    titleFontSize = 14,
    titleSpacing = 8,
    contentGap = 5,
  } = options;

  const titleHeight = titleFontSize * 0.4;
  const totalContentHeight = contentMeasurements.reduce((sum, h, i) => {
    return sum + h + (i < contentMeasurements.length - 1 ? contentGap : 0);
  }, 0);

  return titleHeight + titleSpacing + totalContentHeight;
}

/**
 * Smart wrapper that measures any content type and ensures space
 * Returns both the new Y position and the measured height
 */
export function measureAndEnsureSpace(
  doc: jsPDF,
  currentY: number,
  content:
    | { type: 'table'; headers: string[]; rows: (string | number)[][] }
    | { type: 'bullets'; items: string[] }
    | { type: 'card'; title: string; content: string | string[] }
    | { type: 'text'; text: string; maxWidth?: number }
    | { type: 'section'; title: string; contentHeights: number[] },
  onNewPage?: (doc: jsPDF) => number
): { y: number; height: number } {
  let measuredHeight: number;

  switch (content.type) {
    case 'table':
      measuredHeight = measureTableHeight(doc, content.headers, content.rows);
      break;
    case 'bullets':
      measuredHeight = measureBulletListHeight(doc, content.items);
      break;
    case 'card':
      measuredHeight = measureCardHeight(doc, content.title, content.content);
      break;
    case 'text':
      measuredHeight = measureTextHeight(doc, content.text, content.maxWidth);
      break;
    case 'section':
      measuredHeight = measureSectionHeight(doc, content.title, content.contentHeights);
      break;
    default:
      measuredHeight = 0;
  }

  const newY = ensurePageSpace(doc, currentY, measuredHeight, onNewPage);
  return { y: newY, height: measuredHeight };
}

// ============================================================================
// CONTENT BLOCK BUILDERS WITH AUTO-PAGINATION
// ============================================================================

/**
 * Render a complete section with title and content, handling pagination automatically
 */
export function renderSection(
  doc: jsPDF,
  currentY: number,
  title: string,
  renderContent: (doc: jsPDF, startY: number) => number, // Returns final Y position
  options: {
    titleFontSize?: number;
    titleColor?: string;
    titleSpacing?: number;
    estimatedContentHeight?: number;
  } = {},
  onNewPage?: (doc: jsPDF) => number
): number {
  const {
    titleFontSize = 14,
    titleColor = PDF_BRAND_COLORS.navy.hex,
    titleSpacing = 8,
    estimatedContentHeight = 60, // Fallback estimate if not provided
  } = options;

  // Save complete font state to restore after rendering
  const prevFontSize = doc.getFontSize();
  const prevFont = doc.getFont();
  const prevTextColor = doc.getTextColor();

  // Ensure space for title + minimum content
  const titleHeight = titleFontSize * 0.4;
  const minHeight = titleHeight + titleSpacing + Math.min(estimatedContentHeight, 40);
  
  let y = ensurePageSpace(doc, currentY, minHeight, onNewPage);

  // Render title
  doc.setFontSize(titleFontSize);
  doc.setTextColor(titleColor);
  doc.setFont("helvetica", "bold");
  doc.text(title, PDF_MARGINS.left, y);
  y += titleSpacing;

  // Reset font for content
  doc.setFont("helvetica", "normal");
  doc.setTextColor(PDF_BRAND_COLORS.darkGray.hex);

  // Render content
  const finalY = renderContent(doc, y);

  // Restore complete font state
  doc.setFontSize(prevFontSize);
  doc.setFont(prevFont.fontName, prevFont.fontStyle);
  doc.setTextColor(prevTextColor);

  return finalY;
}

/**
 * Render a bullet list with proper pagination
 */
export function renderBulletList(
  doc: jsPDF,
  currentY: number,
  items: string[],
  options: {
    fontSize?: number;
    lineHeight?: number;
    bulletIndent?: number;
    itemSpacing?: number;
    bulletChar?: string;
    bulletColor?: string;
    textColor?: string;
    maxWidth?: number;
  } = {},
  onNewPage?: (doc: jsPDF) => number
): number {
  const {
    fontSize = 9,
    lineHeight = 4.5,
    bulletIndent = 10,
    itemSpacing = 2,
    bulletChar = "•",
    bulletColor = PDF_BRAND_COLORS.teal.hex,
    textColor = PDF_BRAND_COLORS.darkGray.hex,
    maxWidth = PDF_CONTENT_AREA.width - 20,
  } = options;

  // Save complete font state to restore after rendering
  const prevFontSize = doc.getFontSize();
  const prevFont = doc.getFont();
  const prevTextColor = doc.getTextColor();

  let y = currentY;
  const effectiveWidth = maxWidth - bulletIndent;
  const xBullet = PDF_MARGINS.left;
  const xText = PDF_MARGINS.left + bulletIndent;

  doc.setFontSize(fontSize);

  for (const item of items) {
    const lines = doc.splitTextToSize(item, effectiveWidth);
    const itemHeight = lines.length * lineHeight + itemSpacing;

    // Check space for this item
    y = ensurePageSpace(doc, y, itemHeight, onNewPage);

    // Draw bullet
    doc.setTextColor(bulletColor);
    doc.text(bulletChar, xBullet, y);

    // Draw text lines
    doc.setTextColor(textColor);
    lines.forEach((line: string, idx: number) => {
      doc.text(line, xText, y + idx * lineHeight);
    });

    y += itemHeight;
  }

  // Restore complete font state
  doc.setFontSize(prevFontSize);
  doc.setFont(prevFont.fontName, prevFont.fontStyle);
  doc.setTextColor(prevTextColor);

  return y;
}

/**
 * Render a styled card/callout box with auto-pagination
 */
export function renderCard(
  doc: jsPDF,
  currentY: number,
  title: string,
  content: string | string[],
  options: {
    variant?: 'primary' | 'secondary' | 'highlight' | 'warning';
    maxWidth?: number;
    padding?: number;
    titleFontSize?: number;
    contentFontSize?: number;
  } = {},
  onNewPage?: (doc: jsPDF) => number
): number {
  const {
    variant = 'secondary',
    maxWidth = PDF_CONTENT_AREA.width,
    padding = 10,
    titleFontSize = 11,
    contentFontSize = 9,
  } = options;

  // Save complete font state to restore after rendering
  const prevFontSize = doc.getFontSize();
  const prevFont = doc.getFont();
  const prevTextColor = doc.getTextColor();

  const colors = {
    primary: { bg: [2, 32, 91], title: [18, 235, 252], text: [254, 255, 243] },
    secondary: { bg: [241, 245, 249], title: [2, 32, 91], text: [51, 51, 51] },
    highlight: { bg: [232, 244, 252], title: [8, 132, 170], text: [2, 32, 91] },
    warning: { bg: [255, 243, 224], title: [230, 126, 34], text: [51, 51, 51] },
  };

  const c = colors[variant];
  const contentArray = Array.isArray(content) ? content : [content];
  
  // Measure card height
  const cardHeight = measureCardHeight(doc, title, content, { maxWidth, padding, titleFontSize, contentFontSize });
  
  // Ensure space
  let y = ensurePageSpace(doc, currentY, cardHeight + 10, onNewPage);

  // Draw background
  doc.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
  doc.roundedRect(PDF_MARGINS.left, y, maxWidth, cardHeight, 3, 3, "F");

  const innerX = PDF_MARGINS.left + padding;
  const innerWidth = maxWidth - padding * 2;
  y += padding;

  // Draw title
  doc.setFontSize(titleFontSize);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(c.title[0], c.title[1], c.title[2]);
  doc.text(title, innerX, y + titleFontSize * 0.35);
  y += titleFontSize * 0.4 + 6;

  // Draw content
  doc.setFontSize(contentFontSize);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(c.text[0], c.text[1], c.text[2]);

  for (const para of contentArray) {
    const lines = doc.splitTextToSize(para, innerWidth);
    lines.forEach((line: string) => {
      doc.text(line, innerX, y);
      y += 4.5;
    });
    y += 2;
  }

  // Restore complete font state
  doc.setFontSize(prevFontSize);
  doc.setFont(prevFont.fontName, prevFont.fontStyle);
  doc.setTextColor(prevTextColor);

  return y - padding + cardHeight + 5; // Return position after card
}
