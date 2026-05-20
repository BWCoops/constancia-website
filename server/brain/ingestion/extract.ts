/**
 * Text extraction for the brain ingestion pipeline.
 *
 * Returns { text, pages?, meta } given a buffer and a hint about its type.
 * Supports: PDF, DOCX, XLSX, plain text and source code, Markdown.
 *
 * Unsupported types fall back to a UTF-8 string interpretation; the
 * orchestrator decides whether to flag the document as failed.
 */

import mammoth from "mammoth";
import ExcelJS from "exceljs";

export interface ExtractedText {
  text: string;
  pages?: Array<{ pageNumber: number; text: string }>;
  meta?: {
    pageCount?: number;
    title?: string;
    author?: string;
    sheetNames?: string[];
  };
}

export const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/sql",
  "text/x-sql",
  "text/x-python",
  "text/x-vb",
  "text/x-csharp",
]);

const PLAIN_TEXT_PREFIXES = ["text/", "application/json", "application/sql"];
const PLAIN_TEXT_EXTENSIONS = new Set([
  ".sql", ".txt", ".md", ".csv", ".json", ".yaml", ".yml",
  ".py", ".vb", ".cs", ".ts", ".tsx", ".js", ".jsx",
  ".dax", ".mdx",
]);

function isPlainText(mimeType?: string, filename?: string): boolean {
  if (mimeType) {
    if (PLAIN_TEXT_PREFIXES.some((p) => mimeType.startsWith(p))) return true;
  }
  if (filename) {
    const dot = filename.lastIndexOf(".");
    if (dot >= 0) {
      const ext = filename.slice(dot).toLowerCase();
      if (PLAIN_TEXT_EXTENSIONS.has(ext)) return true;
    }
  }
  return false;
}

async function extractPdf(buf: Buffer): Promise<ExtractedText> {
  // pdf-parse v2 exports a PDFParse class. Lazy-import keeps the heavy
  // pdfjs-dist load off the cold path for non-PDF documents.
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  try {
    const [textResult, info] = await Promise.all([
      parser.getText(),
      parser.getInfo().catch(() => null),
    ]);
    const meta = (info?.info ?? {}) as { Title?: string; Author?: string };
    return {
      text: textResult.text,
      pages: textResult.pages.map((p) => ({ pageNumber: p.num, text: p.text })),
      meta: {
        pageCount: textResult.total,
        title: meta.Title,
        author: meta.Author,
      },
    };
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function extractDocx(buf: Buffer): Promise<ExtractedText> {
  const result = await mammoth.extractRawText({ buffer: buf });
  return { text: result.value };
}

async function extractXlsx(buf: Buffer): Promise<ExtractedText> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const sheetNames: string[] = [];
  const parts: string[] = [];

  wb.eachSheet((sheet) => {
    sheetNames.push(sheet.name);
    parts.push(`# Sheet: ${sheet.name}`);

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const values: string[] = [];
      row.eachCell({ includeEmpty: false }, (cell) => {
        const v = cell.value;
        if (v === null || v === undefined) return;
        if (typeof v === "object" && v !== null) {
          // formula / link / richtext — best-effort stringify
          const richText = (v as { richText?: Array<{ text: string }> }).richText;
          if (richText) {
            values.push(richText.map((r) => r.text).join(""));
            return;
          }
          const result = (v as { result?: unknown }).result;
          if (result !== undefined) {
            values.push(String(result));
            return;
          }
          values.push(JSON.stringify(v));
          return;
        }
        values.push(String(v));
      });
      if (values.length > 0) parts.push(`Row ${rowNumber}: ${values.join(" | ")}`);
    });
    parts.push("");
  });

  return {
    text: parts.join("\n"),
    meta: { sheetNames },
  };
}

export async function extractText(
  buf: Buffer,
  opts: { mimeType?: string; filename?: string },
): Promise<ExtractedText> {
  const { mimeType, filename } = opts;

  // PDF
  if (mimeType === "application/pdf" || filename?.toLowerCase().endsWith(".pdf")) {
    return extractPdf(buf);
  }

  // DOCX
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filename?.toLowerCase().endsWith(".docx")
  ) {
    return extractDocx(buf);
  }

  // XLSX
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    filename?.toLowerCase().endsWith(".xlsx")
  ) {
    return extractXlsx(buf);
  }

  // Plain text / source code
  if (isPlainText(mimeType, filename)) {
    return { text: buf.toString("utf8") };
  }

  // Last-resort: try UTF-8. The orchestrator may flag this as failed.
  return { text: buf.toString("utf8") };
}
