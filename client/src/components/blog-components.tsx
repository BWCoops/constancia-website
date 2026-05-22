import { useState, useEffect, useRef } from "react";
import { Lightbulb, TrendingUp, HelpCircle, BarChart3, CheckCircle2, PieChart, Target, Clock, ArrowRight, Milestone, ImageIcon, ZoomIn, Settings, Users, FileSearch, Rocket, Shield, Database, Cog, Play, Flag, Wrench, Layers, Building2, Compass, Zap, ClipboardCheck } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ChartData, FAQItem } from "@/lib/blog-utils";

interface KeyTakeawayBoxProps {
  children: React.ReactNode;
}

export function KeyTakeawayBox({ children }: KeyTakeawayBoxProps) {
  return (
    <div 
      className="my-8 relative overflow-visible"
      data-testid="component-key-takeaway"
    >
      <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-[#7FB8A3] via-[#8E4F67] to-[#252826] rounded-full" />
      <div className="p-6 bg-gradient-to-br from-[#252826]/5 via-[#8E4F67]/8 to-[#7FB8A3]/10 dark:from-[#252826]/20 dark:via-[#8E4F67]/15 dark:to-[#7FB8A3]/10 border border-[#7FB8A3]/20 rounded-xl ml-2">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-[#7FB8A3] to-[#8E4F67] flex items-center justify-center shadow-lg shadow-[#7FB8A3]/20">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#8E4F67] dark:text-[#7FB8A3] mb-2">
              Key Takeaway
            </div>
            <div className="text-foreground font-medium leading-relaxed">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface KeyTakeawayGridProps {
  takeaways: string[];
}

export function KeyTakeawayGrid({ takeaways }: KeyTakeawayGridProps) {
  if (!takeaways || takeaways.length === 0) return null;

  return (
    <div 
      className="my-10"
      data-testid="component-key-takeaway-grid"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#7FB8A3] to-[#8E4F67] flex items-center justify-center shadow-lg">
          <Lightbulb className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Key Takeaways</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {takeaways.map((takeaway, index) => (
          <div
            key={index}
            className="relative group"
            data-testid={`key-takeaway-card-${index}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#7FB8A3]/20 to-[#8E4F67]/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative p-5 bg-gradient-to-br from-[#252826]/5 via-[#8E4F67]/8 to-[#7FB8A3]/10 dark:from-[#252826]/20 dark:via-[#8E4F67]/15 dark:to-[#7FB8A3]/10 border border-[#7FB8A3]/20 rounded-xl h-full">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#7FB8A3] to-[#8E4F67] flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {index + 1}
                </div>
                <p className="text-foreground text-sm leading-relaxed flex-1">{takeaway}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PillarData {
  title: string;
  description: string;
  icon?: string;
}

interface RadialPillarsChartProps {
  title: string;
  pillars: PillarData[];
}

export function RadialPillarsChart({ title, pillars }: RadialPillarsChartProps) {
  if (!pillars || pillars.length === 0) return null;

  const iconMap: Record<string, typeof Target> = {
    automation: Target,
    analytics: BarChart3,
    close: Clock,
    risk: CheckCircle2,
    decision: Lightbulb,
  };

  return (
    <div 
      className="my-12"
      data-testid="component-radial-pillars"
    >
      <div className="relative bg-gradient-to-br from-[#252826] via-[#041a4a] to-[#8E4F67] rounded-2xl p-8 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgxOCwyMzUsMjUyLDAuMDUpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
        
        <div className="relative z-10">
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">{title}</h3>
            <div className="w-20 h-1 bg-gradient-to-r from-[#7FB8A3] to-[#8E4F67] mx-auto rounded-full" />
          </div>

          <div className="relative flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#7FB8A3] to-[#8E4F67] flex items-center justify-center shadow-2xl shadow-[#7FB8A3]/30 mb-8 z-20">
              <Target className="w-10 h-10 text-white" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
              {pillars.map((pillar, index) => {
                const IconComponent = iconMap[pillar.icon || 'automation'] || Target;
                return (
                  <div
                    key={index}
                    className="relative group"
                    data-testid={`pillar-${index}`}
                  >
                    <div className="bg-white dark:bg-card border border-[#7FB8A3]/30 rounded-xl p-4 h-full hover:shadow-xl hover:border-[#7FB8A3]/60 transition-all duration-300 shadow-lg">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#7FB8A3] to-[#8E4F67] flex items-center justify-center mb-3 shadow-md">
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-[#8E4F67] dark:text-[#7FB8A3] text-xs font-bold mb-1">Pillar {index + 1}</div>
                        <h4 className="text-[#252826] dark:text-foreground font-semibold text-sm leading-tight">{pillar.title}</h4>
                        {pillar.description && (
                          <p className="text-muted-foreground text-xs mt-2 leading-relaxed">{pillar.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SuccessFactorData {
  title: string;
  description: string;
  icon?: string;
}

interface SuccessFactorsDiagramProps {
  title: string;
  factors: SuccessFactorData[];
}

export function SuccessFactorsDiagram({ title, factors }: SuccessFactorsDiagramProps) {
  if (!factors || factors.length === 0) return null;

  const iconMap: Record<string, typeof Target> = {
    sponsorship: Target,
    data: BarChart3,
    change: CheckCircle2,
    expectations: Lightbulb,
  };

  return (
    <div 
      className="my-10"
      data-testid="component-success-factors"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#252826] to-[#8E4F67] flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-[#7FB8A3]" />
        </div>
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {factors.map((factor, index) => {
          const IconComponent = iconMap[factor.icon || 'sponsorship'] || Target;
          return (
            <div
              key={index}
              className="relative overflow-hidden"
              data-testid={`success-factor-${index}`}
            >
              <div className="bg-card border border-border rounded-xl p-5 h-full hover:border-[#7FB8A3]/30 hover:shadow-lg hover:shadow-[#7FB8A3]/5 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#252826] to-[#8E4F67] flex items-center justify-center shadow-lg">
                    <IconComponent className="w-6 h-6 text-[#7FB8A3]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-2">{factor.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{factor.description}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ImplementationPhase {
  phase: number;
  title: string;
  timeframe: string;
  description: string;
}

interface ImplementationTimelineProps {
  phases: ImplementationPhase[];
}

export function ImplementationTimeline({ phases }: ImplementationTimelineProps) {
  if (!phases || phases.length === 0) return null;

  const phaseIcons = [
    { icon: Compass, label: "Discovery" },
    { icon: FileSearch, label: "Assessment" },
    { icon: Layers, label: "Design" },
    { icon: Settings, label: "Build" },
    { icon: Play, label: "Deploy" },
    { icon: Rocket, label: "Launch" },
    { icon: ClipboardCheck, label: "Review" },
    { icon: Zap, label: "Optimise" },
  ];

  return (
    <div 
      className="my-10"
      data-testid="component-implementation-timeline"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#7FB8A3] to-[#8E4F67] flex items-center justify-center">
          <Milestone className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Implementation Framework</h3>
      </div>

      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#7FB8A3] via-[#8E4F67] to-[#252826]" />
        
        <div className="space-y-6">
          {phases.map((phase, index) => {
            const phaseIcon = phaseIcons[index % phaseIcons.length];
            const IconComponent = phaseIcon.icon;
            
            return (
              <div
                key={index}
                className="relative pl-16"
                data-testid={`implementation-phase-${index}`}
              >
                <div className="absolute left-0 w-12 h-12 rounded-full bg-gradient-to-br from-[#7FB8A3] to-[#8E4F67] flex items-center justify-center text-white shadow-lg shadow-[#7FB8A3]/20 z-10">
                  <IconComponent className="w-6 h-6" />
                </div>
                
                <div className="bg-card border border-border rounded-xl p-5 hover:border-[#7FB8A3]/30 hover:shadow-lg transition-all duration-300">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h4 className="font-semibold text-foreground">{phase.title}</h4>
                    <span className="text-xs px-2 py-1 rounded-full bg-[#7FB8A3]/10 text-[#8E4F67] dark:text-[#7FB8A3] font-medium">
                      {phase.timeframe}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{phase.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  if (!items || items.length === 0) return null;

  return (
    <div 
      className="my-10"
      data-testid="component-faq-accordion"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#252826] to-[#8E4F67] flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-[#7FB8A3]" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
      </div>
      
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <Accordion type="single" collapsible className="w-full">
          {items.map((item, index) => (
            <AccordionItem 
              key={index} 
              value={`faq-${index}`}
              className="border-b border-border last:border-b-0"
            >
              <AccordionTrigger 
                className="px-6 py-4 text-left font-semibold text-foreground hover:no-underline hover:bg-muted/50 transition-colors [&[data-state=open]]:bg-[#7FB8A3]/5 dark:[&[data-state=open]]:bg-[#7FB8A3]/10"
                data-testid={`faq-trigger-${index}`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#7FB8A3]/10 flex items-center justify-center text-xs font-bold text-[#8E4F67] dark:text-[#7FB8A3]">
                    {index + 1}
                  </span>
                  <span>{item.question}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 pt-2 text-muted-foreground leading-relaxed">
                <div className="pl-9">{item.answer}</div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}

interface StatHighlightProps {
  stat: string;
  label: string;
  source?: string;
  trend?: string;
}

export function StatHighlight({ stat, label, source, trend }: StatHighlightProps) {
  return (
    <div 
      className="my-6"
      data-testid="component-stat-highlight"
    >
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#252826] via-[#5E8D7A] to-[#8E4F67] p-6 text-center shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-[#7FB8A3]/70" />
          </div>
          <div className="text-4xl md:text-5xl font-bold text-[#7FB8A3] mb-2 tracking-tight">
            {stat}
          </div>
          <div className="text-sm md:text-base text-white/90 font-medium mb-2">
            {label}
          </div>
          {trend && (
            <div className="flex items-center justify-center gap-1 text-xs text-[#7FB8A3]">
              <TrendingUp className="w-3 h-3" />
              <span>{trend}</span>
            </div>
          )}
          {source && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <span className="text-xs text-white/60 italic">Source: {source}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ComparisonTableProps {
  children: React.ReactNode;
}

export function ComparisonTable({ children }: ComparisonTableProps) {
  return (
    <div 
      className="my-8 overflow-hidden rounded-xl border border-border shadow-sm"
      data-testid="component-comparison-table"
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[600px]">
          {children}
        </table>
      </div>
    </div>
  );
}

export function ComparisonTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-gradient-to-r from-[#252826] to-[#8E4F67] text-white sticky top-0 z-10">
      {children}
    </thead>
  );
}

export function ComparisonTableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th className="p-4 text-left font-semibold text-sm uppercase tracking-wider border-r border-white/10 last:border-r-0">
      {children}
    </th>
  );
}

export function ComparisonTableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function ComparisonTableRow({ children, index }: { children: React.ReactNode; index?: number }) {
  const isEven = index !== undefined && index % 2 === 0;
  return (
    <tr className={`transition-colors hover:bg-muted/50 ${isEven ? 'bg-muted/30' : 'bg-card'}`}>
      {children}
    </tr>
  );
}

export function ComparisonTableCell({ children }: { children: React.ReactNode }) {
  return (
    <td className="p-4 text-sm text-muted-foreground border-r border-border/50 last:border-r-0">
      {children}
    </td>
  );
}

interface ImpactBoxProps {
  children: React.ReactNode;
}

export function ImpactBox({ children }: ImpactBoxProps) {
  return (
    <div 
      className="my-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-l-4 border-green-500 rounded-r-lg"
      data-testid="component-impact-box"
    >
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
        <span className="font-medium text-green-700 dark:text-green-400">{children}</span>
      </div>
    </div>
  );
}

export interface TimelinePhase {
  id: string;
  title: string;
  timeframe: string;
  objective?: string;
  subPhases?: {
    id: string;
    title: string;
    timeframe: string;
    description?: string;
  }[];
  color?: 'primary' | 'secondary' | 'tertiary';
}

interface TransformationTimelineProps {
  title?: string;
  subtitle?: string;
  phases: TimelinePhase[];
}

const phaseColors = {
  primary: {
    bg: 'from-[#7FB8A3] to-[#8E4F67]',
    border: 'border-[#7FB8A3]',
    text: 'text-[#7FB8A3]',
    light: 'bg-[#7FB8A3]/10',
    ring: 'ring-[#7FB8A3]/30',
  },
  secondary: {
    bg: 'from-[#8E4F67] to-[#252826]',
    border: 'border-[#8E4F67]',
    text: 'text-[#8E4F67] dark:text-[#7FB8A3]/80',
    light: 'bg-[#8E4F67]/10',
    ring: 'ring-[#8E4F67]/30',
  },
  tertiary: {
    bg: 'from-[#252826] to-[#5E8D7A]',
    border: 'border-[#252826]',
    text: 'text-[#252826] dark:text-[#7FB8A3]/60',
    light: 'bg-[#252826]/10',
    ring: 'ring-[#252826]/30',
  },
};

export function TransformationTimeline({ title, subtitle, phases }: TransformationTimelineProps) {
  return (
    <div
      className="my-10"
      data-testid="component-transformation-timeline"
    >
      {(title || subtitle) && (
        <div className="mb-8 text-center">
          {title && (
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#7FB8A3] to-[#8E4F67] flex items-center justify-center shadow-lg">
                <Milestone className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">{title}</h3>
            </div>
          )}
          {subtitle && (
            <p className="text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
          )}
        </div>
      )}

      <div className="relative">
        <div className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#7FB8A3] via-[#8E4F67] to-[#252826]" />

        <div className="space-y-6">
          {phases.map((phase, index) => {
            const colorScheme = phaseColors[phase.color || 'primary'];
            const isLast = index === phases.length - 1;

            return (
              <div
                key={phase.id}
                className="relative pl-16 md:pl-20"
              >
                <div className={`absolute left-3 md:left-5 w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-br ${colorScheme.bg} flex items-center justify-center shadow-lg ring-4 ${colorScheme.ring} ring-offset-2 ring-offset-background z-10`}>
                  <span className="text-white text-xs font-bold">{index + 1}</span>
                </div>

                <div className={`p-5 rounded-xl border ${colorScheme.border}/30 ${colorScheme.light} hover:${colorScheme.light.replace('/10', '/20')} transition-colors`}>
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <h4 className={`text-lg font-bold ${colorScheme.text}`}>
                      {phase.title}
                    </h4>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 border border-border">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">{phase.timeframe}</span>
                    </div>
                  </div>

                  {phase.objective && (
                    <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-background/60 border border-border/50">
                      <Target className="w-4 h-4 text-[#8E4F67] dark:text-[#7FB8A3] flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#8E4F67] dark:text-[#7FB8A3]">Objective</span>
                        <p className="text-sm text-muted-foreground mt-1">{phase.objective}</p>
                      </div>
                    </div>
                  )}

                  {phase.subPhases && phase.subPhases.length > 0 && (
                    <div className="space-y-3 mt-4">
                      {phase.subPhases.map((subPhase, subIndex) => (
                        <div
                          key={subPhase.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-background/40 border border-border/30 hover:bg-background/60 transition-colors"
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gradient-to-br from-[#7FB8A3]/20 to-[#8E4F67]/20 flex items-center justify-center border border-[#7FB8A3]/30">
                            <span className="text-xs font-bold text-[#8E4F67] dark:text-[#7FB8A3]">
                              {String.fromCharCode(65 + subIndex)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-foreground text-sm">{subPhase.title}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-[#7FB8A3]/10 text-[#8E4F67] dark:text-[#7FB8A3] font-medium">
                                {subPhase.timeframe}
                              </span>
                            </div>
                            {subPhase.description && (
                              <p className="text-sm text-muted-foreground mt-1">{subPhase.description}</p>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {!isLast && (
                  <div className="absolute left-[1.4rem] md:left-[1.85rem] top-full h-6 w-0.5 bg-gradient-to-b from-[#8E4F67]/50 to-transparent" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface HorizonTimelineProps {
  horizons: {
    id: string;
    number: number;
    title: string;
    timeframe: string;
    objective: string;
    phases?: {
      id: string;
      title: string;
      timeframe: string;
    }[];
  }[];
}

export function HorizonTimeline({ horizons }: HorizonTimelineProps) {
  const horizonColors = [
    { bg: 'from-[#7FB8A3] to-[#8E4F67]', card: 'from-[#7FB8A3]/5 to-[#8E4F67]/10', border: 'border-[#7FB8A3]/40' },
    { bg: 'from-[#8E4F67] to-[#252826]', card: 'from-[#8E4F67]/5 to-[#252826]/10', border: 'border-[#8E4F67]/40' },
    { bg: 'from-[#252826] to-[#5E8D7A]', card: 'from-[#252826]/5 to-[#5E8D7A]/10', border: 'border-[#252826]/40' },
  ];

  return (
    <div
      className="my-10"
      data-testid="component-horizon-timeline"
    >
      <div className="grid md:grid-cols-3 gap-4">
        {horizons.map((horizon, index) => {
          const colors = horizonColors[index % horizonColors.length];
          
          return (
            <div
              key={horizon.id}
              className={`relative overflow-hidden rounded-xl border ${colors.border} bg-gradient-to-br ${colors.card} p-5`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.bg}`} />
              
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center shadow-lg`}>
                  <span className="text-white text-xl font-bold">H{horizon.number}</span>
                </div>
                <div>
                  <h4 className="font-bold text-foreground">{horizon.title}</h4>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{horizon.timeframe}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-background/60 border border-border/50 mb-4">
                <div className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-[#8E4F67] dark:text-[#7FB8A3] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">{horizon.objective}</p>
                </div>
              </div>

              {horizon.phases && horizon.phases.length > 0 && (
                <div className="space-y-2">
                  {horizon.phases.map((phase, phaseIndex) => (
                    <div
                      key={phase.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-background/40 border border-border/30"
                    >
                      <div className="w-6 h-6 rounded-md bg-[#7FB8A3]/10 flex items-center justify-center border border-[#7FB8A3]/20">
                        <span className="text-xs font-bold text-[#8E4F67] dark:text-[#7FB8A3]">
                          {phaseIndex + 1}{String.fromCharCode(65 + phaseIndex)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground">{phase.title}</span>
                        <span className="text-xs text-muted-foreground ml-2">({phase.timeframe})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SectionHeadingProps {
  level: 2 | 3;
  children: React.ReactNode;
}

export function SectionHeading({ level, children }: SectionHeadingProps) {
  const baseClasses = "flex items-center gap-3 font-bold";
  
  if (level === 2) {
    return (
      <h2 
        className={`${baseClasses} text-2xl mt-10 mb-4 text-[#252826] dark:text-[#7FB8A3]`}
      >
        <span className="w-1 h-8 bg-gradient-to-b from-[#7FB8A3] to-[#8E4F67] rounded-full" />
        {children}
      </h2>
    );
  }
  
  return (
    <h3 
      className={`${baseClasses} text-xl mt-6 mb-3 text-[#8E4F67] dark:text-[#7FB8A3]/80`}
    >
      {children}
    </h3>
  );
}

export function ListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="w-4 h-4 text-[#7FB8A3] flex-shrink-0 mt-1" />
      <span>{children}</span>
    </li>
  );
}

const CHART_COLOURS = [
  '#7FB8A3',
  '#8E4F67',
  '#252826',
  '#5E8D7A',
  '#08CCF9',
  '#4FFFFF',
  '#252826',
  '#252826',
];

interface BlogChartProps {
  chart: ChartData;
}

export function BlogChart({ chart }: BlogChartProps) {
  const { type, title, data } = chart;
  const [dimensions, setDimensions] = useState({ width: 300, height: 250 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        if (width > 0) {
          setDimensions({
            width: width,
            height: type === 'pie' ? 280 : 250
          });
        }
      }
    };
    
    updateDimensions();
    
    const timeoutId = setTimeout(updateDimensions, 100);
    const timeoutId2 = setTimeout(updateDimensions, 500);
    
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
    };
  }, [type]);
  
  if (!data || data.length === 0) return null;

  return (
    <div
      className="my-8"
      data-testid={`chart-${chart.id}`}
    >
      <div className="p-4 sm:p-6 bg-card border border-border rounded-xl shadow-sm">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-[#252826] to-[#8E4F67] flex items-center justify-center flex-shrink-0">
            {type === 'pie' ? (
              <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-[#7FB8A3]" />
            ) : (
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-[#7FB8A3]" />
            )}
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground leading-tight">{title}</h3>
        </div>
        
        <div 
          ref={containerRef}
          className="w-full"
          style={{ minHeight: `${dimensions.height}px` }}
        >
          {dimensions.width > 0 && (
            type === 'bar' ? (
              <BlogBarChart data={data} width={dimensions.width} height={dimensions.height} />
            ) : type === 'line' ? (
              <BlogLineChart data={data} width={dimensions.width} height={dimensions.height} />
            ) : (
              <BlogPieChart data={data} width={dimensions.width} height={dimensions.height} />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function BlogBarChart({ data, width, height }: { data: Record<string, unknown>[]; width: number; height: number }) {
  // Normalize data: convert {label, value} format to {name, value} format for Recharts
  const normalizedData = data.map((item) => {
    if (typeof item !== 'object' || item === null) {
      return { name: String(item), value: 0 };
    }
    // Use 'label' or 'name' as the category name
    const name = (item.label || item.name || item.category || 'Unknown') as string;
    const value = (item.value || item.amount || 0) as number;
    return { name, value };
  });
  
  return (
    <BarChart data={normalizedData} width={width} height={height} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis 
        dataKey="name" 
        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
        axisLine={{ stroke: 'hsl(var(--border))' }}
        interval={0}
        angle={-20}
        textAnchor="end"
        height={50}
      />
      <YAxis 
        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
        axisLine={{ stroke: 'hsl(var(--border))' }}
        width={35}
      />
      <Tooltip 
        contentStyle={{
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px',
          color: 'hsl(var(--foreground))',
          fontSize: '12px',
        }}
        formatter={(value: number) => [`${value.toLocaleString()}`, 'Value']}
      />
      <Bar 
        dataKey="value" 
        fill={CHART_COLOURS[0]}
        radius={[4, 4, 0, 0]}
        name="Value"
      />
    </BarChart>
  );
}

function BlogLineChart({ data, width, height }: { data: Record<string, unknown>[]; width: number; height: number }) {
  // Normalize data: convert {label, value} format to {name, value} format for Recharts
  const normalizedData = data.map((item) => {
    if (typeof item !== 'object' || item === null) {
      return { name: String(item), value: 0 };
    }
    const name = (item.label || item.name || item.category || 'Unknown') as string;
    const value = (item.value || item.amount || 0) as number;
    return { name, value };
  });
  
  return (
    <LineChart data={normalizedData} width={width} height={height} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis 
        dataKey="name"
        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
        axisLine={{ stroke: 'hsl(var(--border))' }}
        interval={0}
        angle={-20}
        textAnchor="end"
        height={50}
      />
      <YAxis 
        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
        axisLine={{ stroke: 'hsl(var(--border))' }}
        width={35}
      />
      <Tooltip 
        contentStyle={{
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px',
          color: 'hsl(var(--foreground))',
          fontSize: '12px',
        }}
        formatter={(value: number) => [`${value.toLocaleString()}`, 'Value']}
      />
      <Line 
        type="monotone" 
        dataKey="value" 
        stroke={CHART_COLOURS[0]}
        strokeWidth={2}
        dot={{ fill: CHART_COLOURS[0], strokeWidth: 2, r: 3 }}
        activeDot={{ r: 5 }}
        name="Value"
      />
    </LineChart>
  );
}

function BlogPieChart({ data, width, height }: { data: Record<string, unknown>[]; width: number; height: number }) {
  const outerRadius = Math.min(width, height) / 3.5;
  const innerRadius = outerRadius * 0.4;
  
  // Normalize data: convert {label, value} format to {name, value} format for Recharts
  const normalizedData = data.map((item) => {
    if (typeof item !== 'object' || item === null) {
      return { name: String(item), value: 0 };
    }
    const name = (item.label || item.name || item.category || 'Unknown') as string;
    const value = (item.value || item.amount || 0) as number;
    return { name, value };
  });
  
  return (
    <RechartsPieChart width={width} height={height}>
      <Pie
        data={normalizedData}
        cx="50%"
        cy="45%"
        labelLine={false}
        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
        outerRadius={outerRadius}
        innerRadius={innerRadius}
        fill="#8884d8"
        dataKey="value"
        nameKey="name"
      >
        {normalizedData.map((_, index) => (
          <Cell key={`cell-${index}`} fill={CHART_COLOURS[index % CHART_COLOURS.length]} />
        ))}
      </Pie>
      <Tooltip 
        contentStyle={{
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px',
          color: 'hsl(var(--foreground))',
        }}
        formatter={(value: number, name: string) => [`${value.toLocaleString()}`, name]}
      />
      <Legend 
        layout="horizontal"
        align="center"
        verticalAlign="bottom"
        wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
      />
    </RechartsPieChart>
  );
}

export function ResourceDownload({ slug, label, description }: { slug: string; label: string; description?: string }) {
  return (
    <div className="my-8 relative overflow-visible" data-testid={`resource-download-${slug}`}>
      <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-[#7FB8A3] via-[#8E4F67] to-[#252826] rounded-full" />
      <div className="p-6 bg-gradient-to-br from-[#252826]/8 via-[#8E4F67]/10 to-[#7FB8A3]/12 dark:from-[#252826]/25 dark:via-[#8E4F67]/20 dark:to-[#7FB8A3]/15 border border-[#7FB8A3]/30 rounded-xl ml-2 shadow-lg shadow-[#7FB8A3]/5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#7FB8A3] to-[#8E4F67] flex items-center justify-center shadow-lg shadow-[#7FB8A3]/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white" aria-hidden="true">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
              <path d="M12 18v-6"/>
              <path d="m9 15 3 3 3-3"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#8E4F67] dark:text-[#7FB8A3] mb-1">
              Downloadable Template
            </div>
            <h4 className="font-bold text-[#252826] dark:text-white text-lg leading-tight">{label || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</h4>
            {description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <a 
              href={`/resources?download=${slug}`}
              className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#252826] to-[#8E4F67] hover:from-[#8E4F67] hover:to-[#7FB8A3] font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-[#252826]/20 hover:shadow-[#7FB8A3]/30 hover:scale-105 whitespace-nowrap"
              style={{ color: '#FFFFFF' }}
              data-testid={`download-resource-${slug}`}
              aria-label={`Download ${label || slug} template`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="group-hover:animate-bounce">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span style={{ color: '#FFFFFF' }}>Download Now</span>
            </a>
            <a 
              href="/resources"
              className="inline-flex items-center gap-2 px-4 py-3 text-[#8E4F67] dark:text-[#7FB8A3] hover:text-[#252826] dark:hover:text-white font-medium rounded-lg transition-colors whitespace-nowrap hover:bg-[#7FB8A3]/10"
              data-testid={`explore-resources-${slug}`}
              aria-label="Explore the Resources Library"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
              </svg>
              <span>Explore Resources</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

interface InlineBlogImageProps {
  src: string;
  alt: string;
  caption?: string;
  type?: "stock" | "generated" | "brand";
  alignment?: "center" | "left" | "right" | "full";
}

export function InlineBlogImage({ src, alt, caption, type = "stock", alignment = "center" }: InlineBlogImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const alignmentClasses = {
    center: "mx-auto max-w-3xl",
    left: "mr-auto max-w-2xl",
    right: "ml-auto max-w-2xl",
    full: "w-full",
  };

  const typeStyles = {
    stock: "ring-1 ring-gray-200 dark:ring-gray-700",
    generated: "ring-2 ring-[#7FB8A3]/30",
    brand: "ring-2 ring-gradient-to-r from-[#252826] to-[#7FB8A3]",
  };

  if (hasError) {
    return (
      <div className={`my-8 ${alignmentClasses[alignment]}`} data-testid="inline-blog-image-error">
        <div className="aspect-video bg-muted rounded-xl flex flex-col items-center justify-center gap-3 border border-border">
          <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Image could not be loaded</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <figure
        className={`my-10 ${alignmentClasses[alignment]}`}
        data-testid={`inline-blog-image-${type}`}
      >
        <div 
          className={`relative overflow-hidden rounded-xl shadow-lg ${typeStyles[type]} cursor-pointer group`}
          onClick={() => setIsZoomed(true)}
        >
          {!isLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 animate-pulse" />
          )}
          <img
            src={src}
            alt={alt}
            className={`w-full h-auto object-cover transition-all duration-500 ${
              isLoaded ? "opacity-100" : "opacity-0"
            } group-hover:scale-[1.02]`}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="bg-white/90 dark:bg-gray-900/90 rounded-full p-3 shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300">
              <ZoomIn className="w-5 h-5 text-[#252826] dark:text-[#7FB8A3]" />
            </div>
          </div>
          {type === "generated" && (
            <div className="absolute top-3 right-3 bg-gradient-to-r from-[#252826] to-[#8E4F67] text-white text-xs font-medium px-2 py-1 rounded-full shadow-lg">
              AI Generated
            </div>
          )}
        </div>
        {caption && (
          <figcaption className="mt-3 text-center text-sm text-muted-foreground italic">
            {caption}
          </figcaption>
        )}
      </figure>

      {isZoomed && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsZoomed(false)}
          data-testid="image-zoom-overlay"
        >
          <div
            className="relative max-w-7xl max-h-[90vh]"
          >
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full p-2 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomed(false);
              }}
              aria-label="Close zoom"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            {caption && (
              <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm bg-black/50 backdrop-blur-sm py-2 px-4 rounded-lg mx-auto max-w-2xl">
                {caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

interface ReferenceItem {
  text: string;
  url?: string;
}

interface ReferencesSectionProps {
  references: ReferenceItem[];
}

export function ReferencesSection({ references }: ReferencesSectionProps) {
  if (!references || references.length === 0) return null;

  const cleanText = (text: string) => {
    return text
      .replace(/\s*\(\d{4}(?:[-–]\d{4})?\)\s*/g, '')  // Remove (2024) or (2024-2025)
      .replace(/,?\s*\d{4}(?:[-–]\d{4})?\s*$/g, '')   // Remove , 2024 or 2024 at end
      .replace(/,?\s*(?:First|Second|Third|Fourth|Fifth|Sixth)\s+Edition,?\s*/gi, '')  // Remove "Fifth Edition,"
      .replace(/,"\s*$/g, '"')  // Clean trailing ," to just "
      .replace(/,\s*$/g, '')  // Remove trailing comma
      .trim();
  };

  return (
    <div 
      className="my-10"
      data-testid="component-references-section"
    >
      <div className="relative bg-gradient-to-br from-[#252826] via-[#041a4a] to-[#8E4F67] rounded-2xl p-8 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgxOCwyMzUsMjUyLDAuMDUpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
        
        <div className="relative z-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#7FB8A3] to-[#8E4F67] flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Sources and References</h3>
          </div>
          
          <ul className="space-y-3">
            {references.map((ref, index) => {
              const displayText = cleanText(ref.text);
              return (
                <li
                  key={index}
                  className="flex items-start gap-3 group"
                  data-testid={`reference-item-${index}`}
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-[#7FB8A3] to-[#8E4F67] flex items-center justify-center mt-0.5 shadow-md">
                    <span className="text-xs font-bold text-white">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-white/90">{displayText}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
