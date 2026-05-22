import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GaugeChartProps {
  value: number;
  maxValue?: number;
  title: string;
  description?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  colorScheme?: 'default' | 'epm' | 'ai' | 'infrastructure';
}

const colorSchemes = {
  default: {
    low: '#ef4444',
    mid: '#eab308',
    high: '#22c55e',
    track: 'hsl(var(--muted))',
  },
  epm: {
    low: '#ef4444',
    mid: '#8E4F67',
    high: '#252826',
    track: 'hsl(var(--muted))',
  },
  ai: {
    low: '#f97316',
    mid: '#8b5cf6',
    high: '#6366f1',
    track: 'hsl(var(--muted))',
  },
  infrastructure: {
    low: '#ef4444',
    mid: '#14b8a6',
    high: '#7FB8A3',
    track: 'hsl(var(--muted))',
  },
};

const sizeConfig = {
  sm: { width: 120, height: 80, strokeWidth: 8, fontSize: 18 },
  md: { width: 160, height: 100, strokeWidth: 12, fontSize: 24 },
  lg: { width: 200, height: 120, strokeWidth: 16, fontSize: 32 },
};

function getColorForValue(value: number, maxValue: number, scheme: typeof colorSchemes['default']) {
  const percentage = (value / maxValue) * 100;
  if (percentage < 40) return scheme.low;
  if (percentage < 70) return scheme.mid;
  return scheme.high;
}

function getLabel(value: number, maxValue: number): string {
  const percentage = (value / maxValue) * 100;
  if (percentage >= 70) return 'Strong';
  if (percentage >= 40) return 'Moderate';
  return 'Foundational';
}

export function GaugeChart({
  value,
  maxValue = 100,
  title,
  description,
  showLabel = true,
  size = 'md',
  colorScheme = 'default',
}: GaugeChartProps) {
  const config = sizeConfig[size];
  const colors = colorSchemes[colorScheme];
  const color = getColorForValue(value, maxValue, colors);
  const label = getLabel(value, maxValue);
  
  const percentage = Math.min(Math.max(value / maxValue, 0), 1);
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage);
  
  const centerX = config.width / 2;
  const centerY = config.height;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center"
      data-testid={`gauge-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <svg 
        width={config.width} 
        height={config.height}
        className="overflow-visible"
      >
        <path
          d={`M ${config.strokeWidth / 2} ${centerY} A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${centerY}`}
          fill="none"
          stroke={colors.track}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
        />
        <motion.path
          d={`M ${config.strokeWidth / 2} ${centerY} A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${centerY}`}
          fill="none"
          stroke={color}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <text
          x={centerX}
          y={centerY - config.fontSize / 2}
          textAnchor="middle"
          className="fill-foreground font-bold"
          style={{ fontSize: config.fontSize }}
        >
          {Math.round(value)}
        </text>
        {showLabel && (
          <text
            x={centerX}
            y={centerY - config.fontSize / 2 + 16}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 10 }}
          >
            {label}
          </text>
        )}
      </svg>
      <div className="text-center mt-2">
        <div className="text-sm font-medium">{title}</div>
        {description && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
      </div>
    </motion.div>
  );
}

interface GaugeGridProps {
  scores: {
    overall: number;
    epm?: number;
    ai?: number;
    infrastructure?: number;
  };
}

export function GaugeGrid({ scores }: GaugeGridProps) {
  return (
    <Card className="shadow-lg" data-testid="card-gauge-grid">
      <CardHeader>
        <CardTitle>Score Overview</CardTitle>
        <CardDescription>Key performance metrics at a glance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <GaugeChart
            value={scores.overall}
            title="Overall Score"
            colorScheme="default"
            size="md"
          />
          {scores.epm !== undefined && (
            <GaugeChart
              value={scores.epm}
              title="Maturity Score"
              colorScheme="epm"
              size="md"
            />
          )}
          {scores.ai !== undefined && (
            <GaugeChart
              value={scores.ai}
              title="AI Maturity"
              colorScheme="ai"
              size="md"
            />
          )}
          {scores.infrastructure !== undefined && (
            <GaugeChart
              value={scores.infrastructure}
              title="Infrastructure"
              colorScheme="infrastructure"
              size="md"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
