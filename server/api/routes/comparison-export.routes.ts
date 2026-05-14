import { Router, Request, Response } from "express";
import { z } from "zod";
import { generatePDFFromRawHTML } from "../../services/pdf";
import { generateComparisonHTML } from "../../services/pdf/comparison-template";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("comparison-export");

const router = Router();

const PlatformSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string().optional(),
  marketPosition: z.string().optional(),
  roiPotential: z.string().optional(),
  implementationTime: z.string().optional(),
  priceRange: z.string().optional(),
  bestFor: z.string().optional(),
  description: z.string().optional(),
  scores: z.record(z.number()),
  strengths: z.array(z.string()).optional(),
  limitations: z.array(z.string()).optional(),
}).passthrough();

const CalculatedPlatformSchema = PlatformSchema.extend({
  calculatedScore: z.number(),
  fitAdjustedScore: z.number().optional(),
  fitModifier: z.number().optional(),
  fitLevel: z.string().optional(),
  aiModifiers: z.array(z.object({
    label: z.string(),
    value: z.number(),
    detail: z.string().optional(),
  })).optional(),
}).passthrough();

const ExportDataSchema = z.object({
  categoryType: z.enum(["epm", "erp", "ai"]),
  platforms: z.array(PlatformSchema),
  categories: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
  calculatedScores: z.array(CalculatedPlatformSchema),
  categoryWeights: z.record(z.number()),
  recommendedPlatform: CalculatedPlatformSchema.optional(),
  usesFitScoring: z.boolean().optional(),
  companyProfile: z.object({
    revenue: z.string().nullable().optional(),
    companySize: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    priorities: z.array(z.string()).nullable().optional(),
    epmChallenges: z.array(z.string()).nullable().optional(),
    erpChallenges: z.array(z.string()).nullable().optional(),
  }).passthrough().optional(),
  fitReasons: z.record(z.object({
    fitLevel: z.string(),
    reasons: z.array(z.string()),
    warnings: z.array(z.string()).optional(),
  })).optional(),
  fitResults: z.array(z.any()).nullable().optional(),
  selectedPreset: z.string().nullable().optional(),
  industryLabel: z.string().nullable().optional(),
  presetLabel: z.string().nullable().optional(),
  sortedByFit: z.array(CalculatedPlatformSchema).optional(),
  chartImages: z.any().optional(),
}).passthrough();

router.post("/comparison/export-pdf", async (req: Request, res: Response) => {
  try {
    // Extend timeout to prevent 502 errors during PDF generation
    // Adobe PDF Services can take 20-30 seconds
    req.setTimeout(120000); // 2 minutes
    res.setTimeout(120000);
    
    // Set headers early to prevent proxy timeout
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering if present
    res.setHeader("Connection", "keep-alive");
    
    const parseResult = ExportDataSchema.safeParse(req.body);
    if (!parseResult.success) {
      log.error({ err: parseResult.error }, "Validation failed");
      return res.status(400).json({ 
        error: "Invalid export data", 
        details: parseResult.error.issues 
      });
    }

    const data = parseResult.data;
    log.info({ categoryType: data.categoryType.toUpperCase(), platformCount: data.calculatedScores.length }, "Generating comparison PDF");
    
    const sortedForLog = [...data.calculatedScores].sort((a, b) => {
      const scoreA = a.fitAdjustedScore ?? a.calculatedScore;
      const scoreB = b.fitAdjustedScore ?? b.calculatedScore;
      return scoreB - scoreA;
    });
    log.info({ topPlatforms: sortedForLog.slice(0, 4).map((p, i) => ({ rank: i + 1, name: p.name, fitAdjustedScore: p.fitAdjustedScore?.toFixed(2), calculatedScore: p.calculatedScore?.toFixed(2) })) }, "Top 4 platforms by score");

    const html = generateComparisonHTML({
      categoryType: data.categoryType,
      platforms: data.platforms,
      categories: data.categories,
      calculatedScores: data.calculatedScores,
      categoryWeights: data.categoryWeights,
      companyProfile: data.companyProfile,
      industryLabel: data.industryLabel,
      presetLabel: data.presetLabel,
      chartImages: data.chartImages,
    });

    const pdfResult = await generatePDFFromRawHTML(html, {
      compress: "MEDIUM",
      linearize: true,
      watermark: { position: "corner", opacity: 0.15 },
    });

    const fileName = `1QG-${data.categoryType.toUpperCase()}-Comparison-${new Date().toISOString().split("T")[0]}.pdf`;
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", pdfResult.buffer.length);
    res.setHeader("X-PDF-Method", pdfResult.method);
    
    log.info({ bytes: pdfResult.buffer.length, method: pdfResult.method }, "PDF generated successfully");
    return res.send(pdfResult.buffer);

  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "PDF generation failed");
    return res.status(500).json({ 
      error: "PDF generation failed", 
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

export default router;
