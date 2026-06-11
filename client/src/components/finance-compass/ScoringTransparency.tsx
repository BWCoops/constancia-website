/**
 * Scoring transparency panel for the Finance Compass results page.
 *
 * Surfaces what was previously hidden:
 *   1. The industry-specific dimension weights the assessment was
 *      scored against (the same values from shared/scoring-constants
 *      that previously lived only on the server).
 *   2. Each dimension's score with its weight contribution, so the
 *      user can see why one dimension moved the overall score more
 *      than another.
 *
 * Drops into the existing results layout with no other UI changes
 * needed. Designed to be skim-able — not the headline, but visible
 * for anyone who clicks "How was this calculated?".
 */

import {
  INDUSTRY_DIMENSION_WEIGHTS,
  DIMENSION_LABELS,
  getIndustryDimensionWeights,
} from "@shared/scoring-constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

interface ScoringTransparencyProps {
  industry?: string | null;
  dimensionScores?: Record<string, number> | null;
}

const KNOWN_INDUSTRIES = Object.keys(INDUSTRY_DIMENSION_WEIGHTS);

export function ScoringTransparency({ industry, dimensionScores }: ScoringTransparencyProps) {
  const resolvedIndustry =
    industry && KNOWN_INDUSTRIES.includes(industry) ? industry : "Other";
  const weights = getIndustryDimensionWeights(resolvedIndustry);

  // Order dimensions by weight (most-weighted at the top) so the
  // operator can see at a glance what's heaviest for this industry.
  const orderedDimensions = Object.entries(weights)
    .map(([key, weight]) => {
      const score = dimensionScores?.[key];
      const contribution = score !== undefined ? (score * weight) / 100 : null;
      return {
        key,
        label: DIMENSION_LABELS[key] ?? key,
        weight,
        score: score ?? null,
        contribution,
      };
    })
    .sort((a, b) => b.weight - a.weight);

  const usingFallback = !industry || !KNOWN_INDUSTRIES.includes(industry);

  return (
    <Card data-testid="scoring-transparency">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg">How your assessment was scored</CardTitle>
            <CardDescription>
              Dimension weights are tuned to your industry — what matters most for {resolvedIndustry}{" "}
              isn't the same as what matters for a different sector.
            </CardDescription>
          </div>
          {usingFallback && (
            <Badge variant="outline" className="text-xs">
              Generic weights (industry "{industry ?? "unset"}" not in matrix)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-[#F6F3EE] text-left">
              <tr>
                <th className="px-3 py-2 font-medium text-[#F6F3EE]">Dimension</th>
                <th className="px-3 py-2 font-medium text-[#F6F3EE]">Industry weight</th>
                <th className="px-3 py-2 font-medium text-[#F6F3EE]">Your score</th>
                <th className="px-3 py-2 font-medium text-[#F6F3EE]">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {orderedDimensions.map(row => (
                <tr key={row.key} className="border-t border-[#252826]/10" data-testid={`transparency-row-${row.key}`}>
                  <td className="px-3 py-2 text-[#F6F3EE]">{row.label}</td>
                  <td className="px-3 py-2 text-[#F6F3EE]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{row.weight.toFixed(1)}%</span>
                      <div className="h-1.5 flex-1 max-w-[80px] rounded-full bg-[#252826]/10 overflow-hidden">
                        <div
                          className="h-full bg-[#8E4F67]"
                          style={{ width: `${Math.min(100, row.weight * 5)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-[#F6F3EE]">
                    {row.score !== null ? `${Math.round(row.score)}` : "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[#F6F3EE]">
                    {row.contribution !== null ? `+${row.contribution.toFixed(1)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-[#F6F3EE]/70">
          <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>
            Contribution = your score × industry weight ÷ 100. Sum of contributions across all
            dimensions equals your overall maturity score. Weights sum to 100% per industry.
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
