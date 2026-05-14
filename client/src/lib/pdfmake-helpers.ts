/**
 * pdfmake Helper Utilities
 * 
 * Provides declarative document builders for structured PDF content.
 * pdfmake excels at:
 * - Tables with automatic column sizing
 * - Automatic page breaks
 * - Headers and footers
 * - Structured layouts without manual positioning
 * 
 * Use alongside jsPDF for complex custom designs.
 */

import * as pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";
import type { TDocumentDefinitions, Content, TableCell, Style, StyleDictionary } from "pdfmake/interfaces";

// Initialize pdfmake with fonts (using addVirtualFileSystem for Vite compatibility)
(pdfMake as any).addVirtualFileSystem(pdfFonts);

// Brand colors matching Constancia guidelines
const BRAND_COLORS = {
  navy: "#02205B",
  cyan: "#12EBFC",
  teal: "#0884AA",
  cream: "#FEFFF3",
  white: "#FFFFFF",
  darkGray: "#333333",
  lightGray: "#F5F5F5",
};

// Default styles for Constancia branded documents
const DEFAULT_STYLES: StyleDictionary = {
  header: {
    fontSize: 18,
    bold: true,
    color: BRAND_COLORS.navy,
    margin: [0, 0, 0, 10],
  },
  subheader: {
    fontSize: 14,
    bold: true,
    color: BRAND_COLORS.navy,
    margin: [0, 10, 0, 5],
  },
  sectionTitle: {
    fontSize: 12,
    bold: true,
    color: BRAND_COLORS.teal,
    margin: [0, 15, 0, 5],
  },
  tableHeader: {
    bold: true,
    fontSize: 10,
    color: BRAND_COLORS.cream,
    fillColor: BRAND_COLORS.navy,
  },
  tableCell: {
    fontSize: 9,
    color: BRAND_COLORS.darkGray,
  },
  caption: {
    fontSize: 8,
    color: "#666666",
    italics: true,
    margin: [0, 5, 0, 0],
  },
  footer: {
    fontSize: 8,
    color: BRAND_COLORS.teal,
  },
};

/**
 * Create a branded table with automatic page breaks
 */
export function createTable(options: {
  headers: string[];
  rows: (string | number)[][];
  widths?: ("auto" | "*" | number)[];
  headerStyle?: Partial<Style>;
  cellStyle?: Partial<Style>;
  alternateRowColor?: string;
  caption?: string;
}): Content {
  const {
    headers,
    rows,
    widths,
    headerStyle = {},
    cellStyle = {},
    alternateRowColor = "#F8FAFC",
    caption,
  } = options;

  const headerCells: TableCell[] = headers.map((h) => ({
    text: h,
    style: "tableHeader",
    ...headerStyle,
  }));

  const bodyCells: TableCell[][] = rows.map((row, rowIndex) =>
    row.map((cell) => ({
      text: String(cell),
      style: "tableCell",
      fillColor: rowIndex % 2 === 1 ? alternateRowColor : undefined,
      ...cellStyle,
    }))
  );

  const content: Content[] = [
    {
      table: {
        headerRows: 1,
        widths: widths || headers.map(() => "*"),
        body: [headerCells, ...bodyCells],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => "#E2E8F0",
        vLineColor: () => "#E2E8F0",
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => 4,
        paddingBottom: () => 4,
      },
    },
  ];

  if (caption) {
    content.push({ text: caption, style: "caption" });
  }

  return content;
}

/**
 * Create a comparison table with score highlighting
 */
export function createComparisonTable(options: {
  title?: string;
  headers: string[];
  rows: { name: string; values: (string | number)[]; highlight?: boolean }[];
  scoreColumn?: number;
  highlightThreshold?: number;
}): Content {
  const {
    title,
    headers,
    rows,
    scoreColumn,
    highlightThreshold = 80,
  } = options;

  const content: Content[] = [];

  if (title) {
    content.push({ text: title, style: "sectionTitle" });
  }

  const headerCells: TableCell[] = headers.map((h) => ({
    text: h,
    style: "tableHeader",
  }));

  const bodyCells: TableCell[][] = rows.map((row, rowIndex) => {
    const cells: TableCell[] = [
      {
        text: row.name,
        style: "tableCell",
        bold: row.highlight,
        fillColor: row.highlight ? "#E8F4FC" : rowIndex % 2 === 1 ? "#F8FAFC" : undefined,
      },
    ];

    row.values.forEach((val, colIndex) => {
      const isScoreCol = scoreColumn !== undefined && colIndex === scoreColumn - 1;
      const numVal = typeof val === "number" ? val : parseFloat(String(val));
      const isHighScore = isScoreCol && !isNaN(numVal) && numVal >= highlightThreshold;

      cells.push({
        text: String(val),
        style: "tableCell",
        bold: isHighScore,
        color: isHighScore ? BRAND_COLORS.teal : undefined,
        fillColor: row.highlight ? "#E8F4FC" : rowIndex % 2 === 1 ? "#F8FAFC" : undefined,
      });
    });

    return cells;
  });

  content.push({
    table: {
      headerRows: 1,
      widths: headers.map((_, i) => (i === 0 ? "*" : "auto")),
      body: [headerCells, ...bodyCells],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#E2E8F0",
      vLineColor: () => "#E2E8F0",
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
  });

  return content;
}

/**
 * Create a card/callout box
 */
export function createCard(options: {
  title: string;
  content: string | string[];
  variant?: "primary" | "secondary" | "highlight";
  icon?: string;
}): Content {
  const { title, content, variant = "secondary" } = options;

  const bgColors = {
    primary: BRAND_COLORS.navy,
    secondary: "#F1F5F9",
    highlight: "#E8F4FC",
  };

  const textColors = {
    primary: BRAND_COLORS.cream,
    secondary: BRAND_COLORS.darkGray,
    highlight: BRAND_COLORS.navy,
  };

  const titleColors = {
    primary: BRAND_COLORS.cyan,
    secondary: BRAND_COLORS.navy,
    highlight: BRAND_COLORS.teal,
  };

  const contentArray = Array.isArray(content) ? content : [content];

  return {
    table: {
      widths: ["*"],
      body: [
        [
          {
            stack: [
              { text: title, bold: true, fontSize: 11, color: titleColors[variant], margin: [0, 0, 0, 5] },
              ...contentArray.map((text) => ({
                text,
                fontSize: 9,
                color: textColors[variant],
                margin: [0, 2, 0, 2] as [number, number, number, number],
              })),
            ],
            fillColor: bgColors[variant],
            margin: [10, 8, 10, 8],
          },
        ],
      ],
    },
    layout: "noBorders",
    margin: [0, 5, 0, 10],
  };
}

/**
 * Create a bullet list
 */
export function createBulletList(items: string[], options: {
  style?: Partial<Style>;
  bulletColor?: string;
} = {}): Content {
  const { style = {}, bulletColor = BRAND_COLORS.teal } = options;

  return {
    ul: items.map((item) => ({
      text: item,
      fontSize: 9,
      color: BRAND_COLORS.darkGray,
      ...style,
    })),
    markerColor: bulletColor,
    margin: [0, 5, 0, 10],
  };
}

/**
 * Create a two-column layout
 */
export function createColumns(left: Content, right: Content, options: {
  leftWidth?: number | string;
  rightWidth?: number | string;
  gap?: number;
} = {}): Content {
  const { leftWidth = "*", rightWidth = "*", gap = 20 } = options;

  return {
    columns: [
      { width: leftWidth, stack: [left] },
      { width: gap, text: "" },
      { width: rightWidth, stack: [right] },
    ],
  };
}

/**
 * Create a header with logo placeholder
 */
export function createHeader(title: string, subtitle?: string): Content {
  const content: Content[] = [
    { text: "Constancia", style: "header", color: BRAND_COLORS.navy },
  ];

  if (subtitle) {
    content.push({ text: subtitle, style: "caption", alignment: "right", margin: [-100, -15, 0, 0] });
  }

  content.push({ text: title, style: "subheader", margin: [0, 10, 0, 5] });
  content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: BRAND_COLORS.teal }] });

  return { stack: content, margin: [0, 0, 0, 15] };
}

/**
 * Create a standard footer with page numbers
 */
export function createFooterFunction(): (currentPage: number, pageCount: number) => Content {
  return (currentPage: number, pageCount: number) => ({
    columns: [
      { text: `Constancia  |  info@constancia.io  |  https://constancia.io`, style: "footer", alignment: "left" },
      { text: `Page ${currentPage} of ${pageCount}`, style: "footer", alignment: "right" },
    ],
    margin: [40, 10, 40, 0],
  });
}

/**
 * Build a complete document definition
 */
export function buildDocument(options: {
  content: Content[];
  title?: string;
  subtitle?: string;
  includeHeader?: boolean;
  includeFooter?: boolean;
  pageMargins?: [number, number, number, number];
  styles?: StyleDictionary;
}): TDocumentDefinitions {
  const {
    content,
    title,
    subtitle,
    includeHeader = true,
    includeFooter = true,
    pageMargins = [40, 60, 40, 60],
    styles = {},
  } = options;

  const docContent: Content[] = [];

  if (includeHeader && title) {
    docContent.push(createHeader(title, subtitle));
  }

  docContent.push(...content);

  return {
    pageSize: "A4",
    pageMargins,
    content: docContent,
    styles: { ...DEFAULT_STYLES, ...styles },
    footer: includeFooter ? createFooterFunction() : undefined,
    defaultStyle: {
      font: "Roboto",
      fontSize: 10,
    },
  };
}

/**
 * Generate PDF blob from document definition
 */
export function generatePdfBlob(docDefinition: TDocumentDefinitions): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);
      pdfDocGenerator.getBlob((blob: Blob) => {
        resolve(blob);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Download PDF directly
 */
export function downloadPdf(docDefinition: TDocumentDefinitions, filename: string): void {
  const pdfDocGenerator = pdfMake.createPdf(docDefinition);
  pdfDocGenerator.download(filename);
}

/**
 * Open PDF in new window
 */
export function openPdf(docDefinition: TDocumentDefinitions): void {
  const pdfDocGenerator = pdfMake.createPdf(docDefinition);
  pdfDocGenerator.open();
}

// Export types for consumers
export type { TDocumentDefinitions, Content, TableCell, Style, StyleDictionary };
