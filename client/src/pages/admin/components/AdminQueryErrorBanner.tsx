/**
 * AdminQueryErrorBanner
 * ─────────────────────────────────────────────────────────────────
 * Single error panel for admin pages that fan out to many useQuery
 * calls. Detects auth failures vs. server errors and tells the admin
 * exactly what to do.
 *
 *   <AdminQueryErrorBanner errors={[
 *     { label: "System health", error: healthError },
 *     ...
 *   ]} />
 *
 * Returns null when no errors. Designed to live just below the page
 * header, above tabs / content.
 */

import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface AdminQueryError {
  label: string;
  error: unknown;
}

interface Props {
  errors: AdminQueryError[];
  /** Total number of queries on the page — used in the count copy. */
  totalQueries?: number;
}

export function AdminQueryErrorBanner({ errors, totalQueries }: Props) {
  const failed = errors.filter((e) => e.error != null);
  if (failed.length === 0) return null;

  const firstErrMsg = failed[0].error instanceof Error ? failed[0].error.message : "";
  const looksLikeAuth = firstErrMsg.startsWith("401") || firstErrMsg.startsWith("403");

  const countLine = totalQueries
    ? `${failed.length} of ${totalQueries} endpoints failed to load`
    : `${failed.length} endpoint${failed.length === 1 ? "" : "s"} failed to load`;

  return (
    <Card className="border-destructive/40 bg-destructive/5" data-testid="banner-admin-query-errors">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-destructive mb-1">
              {looksLikeAuth ? "Admin access required" : countLine}
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              {looksLikeAuth
                ? "You're signed in but Clerk doesn't see you as an admin. Set publicMetadata.role='admin' on your user in the Clerk dashboard, then sign out and back in."
                : "Server reachable but some queries returned errors. Try refreshing — if errors persist, check server logs."}
            </p>
            <details className="text-xs text-muted-foreground/80">
              <summary className="cursor-pointer hover:text-muted-foreground">
                Failed endpoints ({failed.length})
              </summary>
              <ul className="mt-2 space-y-1 pl-4">
                {failed.map((e) => (
                  <li key={e.label}>
                    <span className="font-medium">{e.label}:</span>{" "}
                    {e.error instanceof Error ? e.error.message : String(e.error)}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
