/**
 * Top-of-dashboard insights panel. Drops into any admin analytics page
 * to surface the ranked, actionable signals from the rollup-backed
 * insight generator (server/services/analytics/insights.ts).
 *
 * Each card has a severity stripe, a headline, the underlying metrics
 * (so the operator can verify), and a "what to do" recommendation.
 * Operators can acknowledge (mark seen, keeps the audit trail) or
 * dismiss (hide permanently — used when the insight is no longer
 * relevant).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, RefreshCw, AlertCircle, AlertTriangle, Info, CheckCircle2, ArrowRight } from "lucide-react";
import {
  INSIGHT_SEVERITY,
  type Insight,
  type InsightSeverity,
} from "@shared/analytics-insights";

const SEVERITY_CONFIG: Record<InsightSeverity, {
  borderClass: string;
  badgeClass: string;
  icon: typeof AlertCircle;
  label: string;
}> = {
  [INSIGHT_SEVERITY.CRITICAL]: {
    borderClass: "border-l-4 border-l-[#8E4F67]",
    badgeClass: "bg-[#8E4F67] text-white",
    icon: AlertCircle,
    label: "Critical",
  },
  [INSIGHT_SEVERITY.WARNING]: {
    borderClass: "border-l-4 border-l-[#C77A93]",
    badgeClass: "bg-[#C77A93] text-white",
    icon: AlertTriangle,
    label: "Warning",
  },
  [INSIGHT_SEVERITY.POSITIVE]: {
    borderClass: "border-l-4 border-l-[#5E8D7A]",
    badgeClass: "bg-[#5E8D7A] text-white",
    icon: CheckCircle2,
    label: "Working well",
  },
  [INSIGHT_SEVERITY.INFO]: {
    borderClass: "border-l-4 border-l-[#252826]/40",
    badgeClass: "bg-[#252826]/60 text-white",
    icon: Info,
    label: "Info",
  },
};

interface InsightCardProps {
  insight: Insight & { acknowledged?: boolean };
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
}

function InsightCard({ insight, onAcknowledge, onDismiss }: InsightCardProps) {
  const config = SEVERITY_CONFIG[insight.severity];
  const Icon = config.icon;

  return (
    <Card className={`${config.borderClass} ${insight.acknowledged ? "opacity-60" : ""}`} data-testid={`insight-${insight.kind}`}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <Badge className={config.badgeClass} variant="default">
                {config.label}
              </Badge>
              <h3 className="text-base font-medium text-[#252826] mt-1.5">{insight.headline}</h3>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {!insight.acknowledged && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onAcknowledge(insight.id)}
                title="Acknowledge"
                data-testid={`insight-ack-${insight.id}`}
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDismiss(insight.id)}
              title="Dismiss"
              data-testid={`insight-dismiss-${insight.id}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-sm text-[#252826] leading-relaxed">{insight.detail}</p>

        <div className="bg-[#F6F3EE] rounded p-3 text-sm">
          <div className="font-medium text-[#252826] mb-1">Recommended action</div>
          <div className="text-[#252826] leading-relaxed">{insight.recommendedAction}</div>
        </div>

        {Object.keys(insight.metrics).length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-[#252826]/70 hover:text-[#252826]">Underlying metrics</summary>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(insight.metrics).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-[#252826]/60 truncate">{k}</dt>
                  <dd className="text-[#252826] font-mono">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}

        {insight.link && (
          <a
            href={insight.link.href}
            className="inline-flex items-center gap-1 text-sm text-[#8E4F67] hover:underline"
          >
            {insight.link.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}

interface InsightsPanelProps {
  /** Filter to insights linked to a specific page, or omit to show all. */
  filterByHref?: string;
  /** Max insights to show. Defaults to 6 — the rest collapse behind "view all". */
  limit?: number;
}

export function InsightsPanel({ filterByHref, limit = 6 }: InsightsPanelProps) {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery<{ success: boolean; insights: (Insight & { acknowledged?: boolean })[] }>({
    queryKey: ["/api/analytics/insights"],
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const ackMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/analytics/insights/${id}/acknowledge`, { method: "POST", credentials: "include" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/analytics/insights"] }),
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/analytics/insights/${id}/dismiss`, { method: "POST", credentials: "include" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/analytics/insights"] }),
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/analytics/insights?refresh=1", { credentials: "include" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/analytics/insights"] }),
  });

  const all = data?.insights ?? [];
  const filtered = filterByHref
    ? all.filter(i => !i.link || i.link.href.startsWith(filterByHref))
    : all;
  const visible = filtered.slice(0, limit);
  const overflow = filtered.length - visible.length;

  return (
    <Card data-testid="insights-panel">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">What needs your attention</CardTitle>
          <p className="text-xs text-[#252826]/60 mt-0.5">
            Ranked by severity. Refreshed nightly at 02:30 UTC and on demand.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending || isFetching}
          data-testid="insights-refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshMutation.isPending || isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-[#252826]/60">Loading insights…</p>}
        {!isLoading && visible.length === 0 && (
          <p className="text-sm text-[#252826]/60">
            No active insights. Either everything's healthy or we're still gathering enough
            data to generate signals. Insights refresh nightly.
          </p>
        )}
        {visible.map(insight => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onAcknowledge={id => ackMutation.mutate(id)}
            onDismiss={id => dismissMutation.mutate(id)}
          />
        ))}
        {overflow > 0 && (
          <p className="text-xs text-[#252826]/60 text-center pt-1">
            +{overflow} more insight{overflow === 1 ? "" : "s"} below the fold (refresh page to load more).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
