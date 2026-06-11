import { motion } from "framer-motion";
import { TrendingUp, ArrowUpRight, ArrowRight, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SampleResultsPreviewProps {
  onStartAssessment: () => void;
  className?: string;
}

const sampleDimensions = [
  { dimension: "Financial Planning & Analysis", score: 72, status: "strong" },
  { dimension: "Management Reporting", score: 58, status: "moderate" },
  { dimension: "Technology Systems", score: 65, status: "moderate" },
  { dimension: "Data & Analytics", score: 45, status: "needs-focus" },
  { dimension: "Governance & Controls", score: 78, status: "strong" },
  { dimension: "Team & Skills", score: 52, status: "moderate" },
  { dimension: "AI Readiness", score: 38, status: "needs-focus" },
];

export function SampleResultsPreview({ onStartAssessment, className }: SampleResultsPreviewProps) {
  const overallScore = Math.round(sampleDimensions.reduce((sum, d) => sum + d.score, 0) / sampleDimensions.length);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-400";
    if (score >= 50) return "text-amber-400";
    return "text-red-400";
  };

  const getBarColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const getStatusIcon = (status: string) => {
    if (status === "strong") return <CheckCircle2 className="h-3 w-3 text-green-400" />;
    if (status === "needs-focus") return <AlertCircle className="h-3 w-3 text-red-400" />;
    return <TrendingUp className="h-3 w-3 text-amber-400" />;
  };

  return (
    <div className={cn("relative", className)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-white/20 text-white border-white/30 text-[10px]">
                Sample Report
              </Badge>
            </div>
            <h3 className="text-lg font-semibold text-white">7-Dimension Analysis</h3>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold text-brand-mint">{overallScore}</p>
            <p className="text-xs text-white/60">/ 100</p>
          </div>
        </div>

        {/* 7 Dimensions List */}
        <div className="space-y-2.5">
          {sampleDimensions.map((dim, idx) => (
            <motion.div
              key={dim.dimension}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
            >
              <div className="flex-shrink-0">
                {getStatusIcon(dim.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/80 truncate pr-2">{dim.dimension}</span>
                  <span className={cn("text-xs font-semibold tabular-nums", getScoreColor(dim.score))}>
                    {dim.score}%
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", getBarColor(dim.score))}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${dim.score}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 + idx * 0.05 }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* AI Insight */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-brand-mint" />
            <p className="text-xs font-medium text-white">AI Recommendation</p>
          </div>
          <p className="text-xs text-white/70">
            Focus on AI Readiness and Data Analytics to unlock 30-40% efficiency gains through automation
          </p>
        </motion.div>

        <Button
          onClick={onStartAssessment}
          className="w-full mt-4 bg-brand-cream text-brand-ink hover:bg-brand-cream/90"
          data-testid="button-get-your-results"
        >
          Get Your Results
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>

        <p className="text-center text-xs text-white/40 mt-3">
          Sample output - your results will be personalised
        </p>
      </motion.div>
    </div>
  );
}
