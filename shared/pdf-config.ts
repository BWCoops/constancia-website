/**
 * Shared PDF Configuration Module
 * Centralizes layout configuration (page size, margins, fonts, colors, spacing)
 * for consistent PDF generation across jsPDF, PDFKit, and Puppeteer paths.
 */

// Brand Colors - shared across all PDF generators
export const PDF_BRAND_COLORS = {
  navy: { hex: "#02205B", rgb: { r: 2, g: 32, b: 91 } },
  cyan: { hex: "#12EBFC", rgb: { r: 18, g: 235, b: 252 } },
  teal: { hex: "#0884AA", rgb: { r: 8, g: 132, b: 170 } },
  cream: { hex: "#FEFFF3", rgb: { r: 254, g: 255, b: 243 } },
  white: { hex: "#FFFFFF", rgb: { r: 255, g: 255, b: 255 } },
  lightGray: { hex: "#F6F3EE", rgb: { r: 246, g: 243, b: 238 } },
  darkGray: { hex: "#334155", rgb: { r: 51, g: 65, b: 85 } },
  gray: { hex: "#646464", rgb: { r: 100, g: 100, b: 100 } },
};

// Contact Information
export const PDF_CONTACT_INFO = {
  legalName: "Constancia Holdings Limited",
  companyNumber: "17227112",
  address: "Blount House, Hall Court, Hall Park Way, Telford, Shropshire, TF3 4NQ, United Kingdom",
  email: "info@constancia.io",
  website: "https://constancia.io",
  linkedin: "linkedin.com/company/constancia-group",
};

// A4 Page Dimensions in mm
export const PDF_PAGE_SIZE = {
  width: 210,
  height: 297,
  format: "a4" as const,
};

// Standard Margins in mm - consistent across all PDF types
export const PDF_MARGINS = {
  top: 25,
  right: 20,
  bottom: 25,
  left: 20,
  // Content margins (inside page margins)
  content: 20,
};

// Footer spacing reserved at bottom of page
export const PDF_FOOTER_HEIGHT = 15;

// Calculate usable content area
export const PDF_CONTENT_AREA = {
  width: PDF_PAGE_SIZE.width - PDF_MARGINS.left - PDF_MARGINS.right,
  height: PDF_PAGE_SIZE.height - PDF_MARGINS.top - PDF_MARGINS.bottom - PDF_FOOTER_HEIGHT,
  startY: PDF_MARGINS.top,
  endY: PDF_PAGE_SIZE.height - PDF_MARGINS.bottom - PDF_FOOTER_HEIGHT,
};

// Typography Settings
export const PDF_TYPOGRAPHY = {
  fonts: {
    primary: "helvetica",
    heading: "helvetica",
  },
  sizes: {
    h1: 24,
    h2: 16,
    h3: 14,
    h4: 12,
    body: 10,
    small: 9,
    caption: 8,
    footer: 7,
  },
  lineHeight: {
    heading: 1.2,
    body: 1.6,
    tight: 1.3,
  },
};

// Spacing constants in mm
export const PDF_SPACING = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  section: 15,
  paragraph: 6,
};

/**
 * Calculate aspect-ratio-safe dimensions for images
 * @param origWidth - Original image width
 * @param origHeight - Original image height
 * @param maxWidth - Maximum allowed width
 * @param maxHeight - Maximum allowed height
 * @returns Scaled dimensions preserving aspect ratio
 */
export function scaleToFit(
  origWidth: number,
  origHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const ratio = Math.min(maxWidth / origWidth, maxHeight / origHeight);
  return {
    width: origWidth * ratio,
    height: origHeight * ratio,
  };
}

/**
 * Check if content will fit on current page
 * @param currentY - Current Y position
 * @param neededHeight - Height needed for content
 * @param pageHeight - Total page height
 * @param bottomMargin - Bottom margin including footer
 * @returns true if content fits, false if new page needed
 */
export function willFitOnPage(
  currentY: number,
  neededHeight: number,
  pageHeight: number = PDF_PAGE_SIZE.height,
  bottomMargin: number = PDF_MARGINS.bottom + PDF_FOOTER_HEIGHT
): boolean {
  return currentY + neededHeight <= pageHeight - bottomMargin;
}

/**
 * Get the Y position where content should stop on a page
 */
export function getPageBottomY(): number {
  return PDF_PAGE_SIZE.height - PDF_MARGINS.bottom - PDF_FOOTER_HEIGHT;
}

/**
 * Format date in UK format
 */
export function formatDateUK(date: Date = new Date()): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// CSS for Puppeteer print styles
export const PDF_PRINT_CSS = `
@page {
  size: A4;
  margin: ${PDF_MARGINS.top}mm ${PDF_MARGINS.right}mm ${PDF_MARGINS.bottom}mm ${PDF_MARGINS.left}mm;
}

@media print {
  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  /* Prevent page breaks inside important elements */
  .no-break-inside {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  
  /* Force page break before element */
  .break-before {
    break-before: page !important;
    page-break-before: always !important;
  }
  
  /* Force page break after element */
  .break-after {
    break-after: page !important;
    page-break-after: always !important;
  }
  
  /* Keep with next element */
  .keep-with-next {
    break-after: avoid !important;
    page-break-after: avoid !important;
  }
  
  /* Table styling */
  table {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  
  thead {
    display: table-header-group;
  }
  
  tr {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  
  /* Charts and images */
  .chart-container,
  .image-container,
  figure {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
}
`;
