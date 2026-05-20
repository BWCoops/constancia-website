import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getLogoTurquoise, getIconWhite } from "./pdf-logo-constants";

export const BRAND_COLORS = {
  navy: { r: 2, g: 32, b: 91 },
  cyan: { r: 18, g: 235, b: 252 },
  teal: { r: 8, g: 132, b: 170 },
  cream: { r: 254, g: 255, b: 243 },
  white: { r: 255, g: 255, b: 255 },
  gray: { r: 100, g: 100, b: 100 },
};

export const CONTACT_INFO = {
  company: "Constancia Holdings Limited",
  companyNumber: "17227112",
  address: "Blount House, Hall Court, Hall Park Way, Telford, Shropshire, TF3 4NQ, United Kingdom",
  email: "info@constancia.io",
  website: "https://constancia.io",
  linkedin: "linkedin.com/company/constancia-group",
};

interface PDFTemplateOptions {
  title: string;
  subtitle?: string;
  sections: Array<{
    heading: string;
    content: string;
  }>;
  contactInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    company: string;
  };
  includeDisclaimer?: boolean;
}

export function createBrandedPDF(options: PDFTemplateOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // === COVER PAGE ===
  doc.setFillColor(BRAND_COLORS.navy.r, BRAND_COLORS.navy.g, BRAND_COLORS.navy.b);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Logo/Title area
  const logoBase64 = getLogoTurquoise();
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin, 20, 45, 15);
    } catch (e) {
      doc.setFontSize(28);
      doc.setTextColor(BRAND_COLORS.cyan.r, BRAND_COLORS.cyan.g, BRAND_COLORS.cyan.b);
      doc.text("Constancia", margin, 35);
    }
  } else {
    doc.setFontSize(28);
    doc.setTextColor(BRAND_COLORS.cyan.r, BRAND_COLORS.cyan.g, BRAND_COLORS.cyan.b);
    doc.text("Constancia", margin, 35);
  }

  // Main title
  doc.setFontSize(24);
  doc.setTextColor(BRAND_COLORS.cream.r, BRAND_COLORS.cream.g, BRAND_COLORS.cream.b);
  doc.text(options.title, margin, 80, { maxWidth: pageWidth - margin * 2 });

  // Subtitle
  if (options.subtitle) {
    doc.setFontSize(14);
    doc.setTextColor(BRAND_COLORS.cyan.r, BRAND_COLORS.cyan.g, BRAND_COLORS.cyan.b);
    doc.text(options.subtitle, margin, 110);
  }

  // Decorative line
  doc.setDrawColor(BRAND_COLORS.cyan.r, BRAND_COLORS.cyan.g, BRAND_COLORS.cyan.b);
  doc.setLineWidth(2);
  doc.line(margin, 130, margin + 60, 130);

  // Cover footer with tagline and contact details
  doc.setFontSize(11);
  doc.setTextColor(BRAND_COLORS.cream.r, BRAND_COLORS.cream.g, BRAND_COLORS.cream.b);
  doc.setFont("helvetica", "bold");
  doc.text("FinanceTransformed, DesignedforChange, ", margin, pageHeight - 70, { baseline: "top" });
  const taglineWidth = doc.getTextWidth("FinanceTransformed, DesignedforChange, ");
  doc.setTextColor(BRAND_COLORS.cyan.r, BRAND_COLORS.cyan.g, BRAND_COLORS.cyan.b);
  doc.setFont("helvetica", "italic");
  doc.text("Driven by Technology.", margin + taglineWidth, pageHeight - 70, { baseline: "top" });

  doc.setFontSize(9);
  doc.setTextColor(BRAND_COLORS.cream.r, BRAND_COLORS.cream.g, BRAND_COLORS.cream.b);
  doc.setFont("helvetica", "normal");
  doc.text(CONTACT_INFO.address, margin, pageHeight - 55);
  doc.text(`${CONTACT_INFO.email}  |  ${CONTACT_INFO.website}`, margin, pageHeight - 43);
  doc.text(CONTACT_INFO.linkedin, margin, pageHeight - 31);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, margin, pageHeight - 18);

  // === CONTENT PAGES ===
  doc.addPage();
  let yPos = margin;

  // Add sections
  options.sections.forEach((section, idx) => {
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = margin;
    }

    // Section heading
    doc.setFontSize(14);
    doc.setTextColor(BRAND_COLORS.navy.r, BRAND_COLORS.navy.g, BRAND_COLORS.navy.b);
    doc.setFont("helvetica", "bold");
    doc.text(section.heading, margin, yPos);
    yPos += 10;

    // Section content
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");
    const wrappedText = doc.splitTextToSize(section.content, pageWidth - margin * 2);
    doc.text(wrappedText, margin, yPos);
    yPos += wrappedText.length * 6 + 8;
  });

  // Add disclaimer if requested
  if (options.includeDisclaimer) {
    yPos += 10;
    if (yPos > pageHeight - 70) {
      doc.addPage();
      yPos = 30;
    }

    // Disclaimer box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 55, 3, 3, "F");

    // Left accent bar
    doc.setFillColor(BRAND_COLORS.teal.r, BRAND_COLORS.teal.g, BRAND_COLORS.teal.b);
    doc.rect(margin, yPos, 3, 55, "F");

    // Disclaimer title
    doc.setFontSize(10);
    doc.setTextColor(BRAND_COLORS.navy.r, BRAND_COLORS.navy.g, BRAND_COLORS.navy.b);
    doc.setFont("helvetica", "bold");
    doc.text("Disclaimer", margin + 10, yPos + 12);

    // Disclaimer text
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    const disclaimerText1 = "This document has been prepared using publicly available information and is intended for general informational purposes only. It does not constitute professional advice, a formal recommendation, or an offer of services.";
    const disclaimerText2 = `To discuss how Constancia can support your specific requirements, please contact us at ${CONTACT_INFO.email} or visit ${CONTACT_INFO.website}.`;

    doc.text(disclaimerText1, margin + 10, yPos + 22, { maxWidth: pageWidth - margin * 2 - 20 });
    doc.text(disclaimerText2, margin + 10, yPos + 42, { maxWidth: pageWidth - margin * 2 - 20 });
  }

  // Add footers to all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);

    // Header with logo and title
    const headerLogo = getLogoTurquoise();
    if (headerLogo) {
      try {
        doc.addImage(headerLogo, "PNG", margin, 6, 25, 8);
      } catch (e) {
        doc.setFontSize(12);
        doc.setTextColor(BRAND_COLORS.navy.r, BRAND_COLORS.navy.g, BRAND_COLORS.navy.b);
        doc.setFont("helvetica", "bold");
        doc.text("Constancia", margin, 12);
      }
    } else {
      doc.setFontSize(12);
      doc.setTextColor(BRAND_COLORS.navy.r, BRAND_COLORS.navy.g, BRAND_COLORS.navy.b);
      doc.setFont("helvetica", "bold");
      doc.text("Constancia", margin, 12);
    }

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(options.title, pageWidth - margin, 15, { align: "right" });

    // Footer line
    doc.setDrawColor(BRAND_COLORS.teal.r, BRAND_COLORS.teal.g, BRAND_COLORS.teal.b);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

    // Footer text
    doc.setFontSize(7);
    doc.setTextColor(BRAND_COLORS.teal.r, BRAND_COLORS.teal.g, BRAND_COLORS.teal.b);
    doc.text(`Constancia  |  ${CONTACT_INFO.email}  |  ${CONTACT_INFO.website}  |  Telford, UK`, margin, pageHeight - 10);
    doc.text(`Page ${i - 1} of ${pageCount - 1}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  }

  return doc;
}
