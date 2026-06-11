import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  BarChart3,
  RefreshCw,
  Shield,
  Server,
  Users,
  Database,
  CheckCircle2,
  Circle,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface DimensionInfo {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  questionCount: number;
  answeredCount: number;
  isActive: boolean;
  isCompleted: boolean;
}

interface DimensionProgressProps {
  dimensions: DimensionInfo[];
  currentDimension?: string;
  onDimensionClick?: (dimensionId: string) => void;
  showCelebration?: boolean;
  completedDimension?: string | null;
}

const iconMap: Record<string, typeof TrendingUp> = {
  TrendingUp,
  BarChart3,
  RefreshCw,
  Shield,
  Server,
  Users,
  Database,
};

const colorMap: Record<string, string> = {
  "#8E4F67": "text-[#5E8D7A] bg-[#8E4F67]/10",
  "#7FB8A3": "text-[#7FB8A3] bg-[#7FB8A3]/10",
  "#252826": "text-[#F6F3EE] bg-[#252826]/10",
  "#6366F1": "text-indigo-500 bg-indigo-500/10",
  "#10B981": "text-emerald-500 bg-emerald-500/10",
  "#C77A93": "text-amber-500 bg-amber-500/10",
  "#EC4899": "text-pink-500 bg-pink-500/10",
};

export function DimensionProgress({
  dimensions,
  currentDimension,
  onDimensionClick,
  showCelebration,
  completedDimension,
}: DimensionProgressProps) {
  const totalQuestions = dimensions.reduce((sum, d) => sum + d.questionCount, 0);
  const totalAnswered = dimensions.reduce((sum, d) => sum + d.answeredCount, 0);
  const overallProgress = totalQuestions > 0 ? (totalAnswered / totalQuestions) * 100 : 0;

  return (
    <div className="bg-card rounded-xl border p-4 space-y-4 sticky top-24">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Your Progress</h3>
          <Badge variant="outline" className="text-[#5E8D7A]">
            {Math.round(overallProgress)}%
          </Badge>
        </div>
        <Progress value={overallProgress} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {totalAnswered} of {totalQuestions} questions answered
        </p>
      </div>

      <div className="border-t pt-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Assessment Dimensions
        </h4>
        <div className="space-y-2">
          {dimensions.map((dimension, idx) => {
            const Icon = iconMap[dimension.icon] || Circle;
            const colorClass = colorMap[dimension.color] || "text-muted-foreground bg-muted";
            const progress = dimension.questionCount > 0 
              ? (dimension.answeredCount / dimension.questionCount) * 100 
              : 0;
            const isCurrent = dimension.id === currentDimension;
            const justCompleted = dimension.id === completedDimension && showCelebration;

            return (
              <motion.button
                key={dimension.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                onClick={() => onDimensionClick?.(dimension.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                  isCurrent && "bg-[#8E4F67]/10 border border-[#8E4F67]/30",
                  !isCurrent && "hover-elevate",
                  dimension.isCompleted && "opacity-80"
                )}
                data-testid={`dimension-${dimension.id}`}
              >
                <div className={cn(
                  "p-2 rounded-lg relative",
                  dimension.isCompleted ? "bg-emerald-500/10 text-emerald-500" : colorClass
                )}>
                  {dimension.isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  
                  <AnimatePresence>
                    {justCompleted && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute -top-1 -right-1"
                      >
                        <Sparkles className="h-4 w-4 text-amber-500" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      "text-sm font-medium truncate",
                      isCurrent ? "text-[#5E8D7A]" : "text-foreground"
                    )}>
                      {dimension.shortName}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {dimension.answeredCount}/{dimension.questionCount}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className={cn(
                        "h-full rounded-full",
                        dimension.isCompleted ? "bg-emerald-500" : "bg-[#8E4F67]"
                      )}
                    />
                  </div>
                </div>

                {isCurrent && (
                  <ChevronRight className="h-4 w-4 text-[#5E8D7A] flex-shrink-0" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showCelebration && completedDimension && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="border-t pt-4"
          >
            <div className="bg-gradient-to-r from-emerald-500/10 to-[#8E4F67]/10 rounded-lg p-4 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Sparkles className="h-8 w-8 mx-auto text-amber-500 mb-2" />
              </motion.div>
              <p className="text-sm font-medium text-foreground">
                Dimension Complete!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Great progress on your assessment
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DimensionProgressMobile({
  dimensions,
  currentDimension,
}: Pick<DimensionProgressProps, "dimensions" | "currentDimension">) {
  const totalQuestions = dimensions.reduce((sum, d) => sum + d.questionCount, 0);
  const totalAnswered = dimensions.reduce((sum, d) => sum + d.answeredCount, 0);
  const overallProgress = totalQuestions > 0 ? (totalAnswered / totalQuestions) * 100 : 0;

  return (
    <div className="bg-card border-b px-4 py-3">
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="text-sm font-medium text-foreground">
          Progress: {totalAnswered}/{totalQuestions}
        </span>
        <Badge variant="outline" className="text-[#5E8D7A]">
          {Math.round(overallProgress)}%
        </Badge>
      </div>
      <Progress value={overallProgress} className="h-1.5" />
      
      <div className="flex gap-1 mt-3 overflow-x-auto pb-1">
        {dimensions.map((dimension) => {
          const Icon = iconMap[dimension.icon] || Circle;
          const isCurrent = dimension.id === currentDimension;
          
          return (
            <div
              key={dimension.id}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs whitespace-nowrap",
                isCurrent && "bg-[#5E8D7A]/10 text-[#5E8D7A] font-medium",
                dimension.isCompleted && "bg-emerald-500/10 text-emerald-500",
                !isCurrent && !dimension.isCompleted && "text-muted-foreground"
              )}
            >
              {dimension.isCompleted ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              <span>{dimension.shortName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DimensionProgress;
