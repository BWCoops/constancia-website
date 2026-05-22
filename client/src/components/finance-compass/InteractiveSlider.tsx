import { useState, useCallback } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  FileText,
  TrendingUp,
  Shield,
  BarChart3,
  Settings,
  Users,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SliderConfig {
  min: number;
  max: number;
  step?: number;
  labels: Record<number, string>;
}

interface InteractiveSliderProps {
  value: number;
  onChange: (value: number) => void;
  sliderConfig: SliderConfig;
  dimension?: string;
  disabled?: boolean;
  className?: string;
}

const dimensionIcons: Record<string, typeof Clock> = {
  consolidation_close: Clock,
  management_reporting: FileText,
  financial_planning_analysis: TrendingUp,
  financial_controls_compliance: Shield,
  data_analytics: BarChart3,
  technology_systems: Settings,
  organisation_people: Users,
  qualification: CheckCircle,
};

export function InteractiveSlider({
  value,
  onChange,
  sliderConfig,
  dimension,
  disabled = false,
  className,
}: InteractiveSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const { min, max, step = 1, labels } = sliderConfig;
  const DimensionIcon = dimension ? dimensionIcons[dimension] : null;

  const labelEntries = Object.entries(labels).map(([key, label]) => ({
    value: Number(key),
    label,
  })).sort((a, b) => a.value - b.value);

  const getPercentage = useCallback((val: number) => {
    return ((val - min) / (max - min)) * 100;
  }, [min, max]);

  const handleValueChange = useCallback((values: number[]) => {
    onChange(values[0]);
  }, [onChange]);

  const currentLabel = labels[value] || "";

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-start gap-4">
        {DimensionIcon && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-3 rounded-xl bg-gradient-to-br from-[#252826] to-[#8E4F67] text-white shadow-lg flex-shrink-0"
          >
            <DimensionIcon className="h-6 w-6" />
          </motion.div>
        )}

        <div className="flex-1 space-y-4">
          <div className="relative pt-2 pb-8">
            <SliderPrimitive.Root
              value={[value]}
              onValueChange={handleValueChange}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
              onPointerDown={() => {
                setIsDragging(true);
                setShowTooltip(true);
              }}
              onPointerUp={() => {
                setIsDragging(false);
                setTimeout(() => setShowTooltip(false), 1000);
              }}
              className={cn(
                "relative flex w-full touch-none select-none items-center",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              data-testid="interactive-slider"
            >
              <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden rounded-full bg-muted">
                <SliderPrimitive.Range 
                  className="absolute h-full rounded-full transition-all duration-150"
                  style={{
                    background: `linear-gradient(90deg, #8E4F67 0%, #7FB8A3 ${Math.min(100, getPercentage(value) + 20)}%)`,
                  }}
                />
              </SliderPrimitive.Track>

              <SliderPrimitive.Thumb asChild>
                <motion.div
                  animate={{
                    scale: isDragging ? 1.2 : 1,
                    boxShadow: isDragging 
                      ? "0 0 0 8px rgba(18, 235, 252, 0.2), 0 0 20px rgba(8, 132, 170, 0.4)" 
                      : "0 0 0 0px rgba(18, 235, 252, 0)",
                  }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "block h-6 w-6 rounded-full border-[3px] border-[#8E4F67] bg-white cursor-grab",
                    "ring-offset-background transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FB8A3] focus-visible:ring-offset-2",
                    "disabled:pointer-events-none disabled:opacity-50",
                    isDragging && "cursor-grabbing"
                  )}
                  data-testid="slider-thumb"
                >
                  <motion.div
                    animate={{
                      scale: isDragging ? [1, 1.5, 1] : 1,
                      opacity: isDragging ? [0.5, 0, 0.5] : 0,
                    }}
                    transition={{
                      duration: 1,
                      repeat: isDragging ? Infinity : 0,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 rounded-full bg-[#7FB8A3]"
                  />
                </motion.div>
              </SliderPrimitive.Thumb>
            </SliderPrimitive.Root>

            <AnimatePresence>
              {(showTooltip || isDragging) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute -top-12 pointer-events-none"
                  style={{
                    left: `calc(${getPercentage(value)}% - 1.5rem)`,
                  }}
                >
                  <div className="bg-[#252826] text-white px-3 py-1.5 rounded-lg shadow-lg text-sm font-semibold whitespace-nowrap">
                    {value}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-[#252826]" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute top-8 left-0 right-0 flex justify-between">
              {labelEntries.map(({ value: labelValue, label }) => {
                const isActive = value === labelValue;
                const percentage = getPercentage(labelValue);
                
                return (
                  <motion.div
                    key={labelValue}
                    className="absolute flex flex-col items-center"
                    style={{ 
                      left: `${percentage}%`,
                      transform: "translateX(-50%)",
                    }}
                    animate={{
                      scale: isActive ? 1.05 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all duration-200",
                        isActive ? "bg-[#7FB8A3] scale-150" : "bg-muted-foreground/40"
                      )}
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{labels[min] || `${min}`}</span>
            <span>{labels[max] || `${max}`}</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {currentLabel && (
          <motion.div
            key={value}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="p-4 rounded-xl bg-gradient-to-r from-[#252826]/5 to-[#8E4F67]/5 border border-[#8E4F67]/20"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-[#8E4F67] to-[#7FB8A3] text-white font-bold text-lg">
                {value}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{currentLabel}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {labelEntries.map(({ value: labelValue, label }, idx) => {
          const isActive = value === labelValue;
          
          return (
            <motion.button
              key={labelValue}
              onClick={() => onChange(labelValue)}
              disabled={disabled}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
              className={cn(
                "p-3 rounded-xl border-2 transition-all text-left",
                isActive
                  ? "border-[#8E4F67] bg-[#8E4F67]/10 shadow-md"
                  : "border-transparent bg-muted/30 hover:border-[#8E4F67]/30 hover:bg-muted/50",
                disabled && "cursor-not-allowed opacity-50"
              )}
              data-testid={`slider-label-${labelValue}`}
            >
              <div className={cn(
                "text-lg font-bold mb-1 transition-colors",
                isActive ? "text-[#0A6688]" : "text-foreground"
              )}>
                {labelValue}
              </div>
              <div className={cn(
                "text-xs leading-tight transition-colors",
                isActive ? "text-[#0A6688]/80" : "text-muted-foreground"
              )}>
                {label}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default InteractiveSlider;
