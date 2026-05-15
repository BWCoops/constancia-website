/**
 * dev-log — DEV-only console logger, tree-shaken out of production builds.
 *
 * Use for export-pipeline traces, OTP-flow debugging, and other "useful while
 * iterating, noisy in prod" logs. Do NOT use for errors users should see —
 * those belong in toast notifications or an error monitor.
 *
 *   import { dlog } from "@/lib/dev-log";
 *   dlog("[ExportFunction] starting", { type, count });
 */

export function dlog(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}
