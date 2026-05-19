import { motion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroResultsVisualProps {
  className?: string;
}

const sampleData = [
  { dimension: "FP&A", shortLabel: "FP&A", score: 76, fullLabel: "Financial Planning & Analysis" },
  { dimension: "Reporting", shortLabel: "Reporting", score: 62, fullLabel: "Management Reporting" },
  { dimension: "Technology", shortLabel: "Tech", score: 58, fullLabel: "Technology Systems" },
  { dimension: "Analytics", shortLabel: "Analytics", score: 71, fullLabel: "Data & Analytics" },
  { dimension: "Governance", shortLabel: "Governance", score: 83, fullLabel: "Governance & Controls" },
  { dimension: "Skills", shortLabel: "Skills", score: 54, fullLabel: "Team & Skills" },
  { dimension: "AI", shortLabel: "AI", score: 42, fullLabel: "AI Readiness" },
];

export function HeroResultsVisual({ className }: HeroResultsVisualProps) {
  const overallScore = Math.round(sampleData.reduce((sum, d) => sum + d.score, 0) / sampleData.length);

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
            <p className="text-xs text-white/60">Sample Assessment</p>
            <h3 className="text-lg font-semibold text-white">Finance Readiness</h3>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-[#7FB8A3]">{overallScore}</p>
            <p className="text-xs text-white/60">/ 100</p>
          </div>
        </div>

        <div className="h-[250px] sm:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={sampleData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid stroke="rgba(255,255,255,0.2)" />
              <PolarAngleAxis
                dataKey="shortLabel"
                tick={{ fill: "rgba(255,255,255,0.8)", fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 9 }}
                tickCount={5}
                axisLine={false}
              />
              <Radar
                name="Your Score"
                dataKey="score"
                stroke="#7FB8A3"
                fill="#7FB8A3"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10"
          >
            <TrendingUp className="h-4 w-4 text-green-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-white/60">Strongest</p>
              <p className="text-sm font-medium text-white truncate">Governance</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10"
          >
            <ArrowUpRight className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-white/60">Opportunity</p>
              <p className="text-sm font-medium text-white truncate">AI Readiness</p>
            </div>
          </motion.div>
        </div>

        <p className="text-center text-xs text-white/40 mt-4">
          Sample visualisation of assessment results
        </p>
      </motion.div>
    </div>
  );
}
