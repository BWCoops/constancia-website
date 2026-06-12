---
name: Missing DB tables on startup
description: Several tables in shared/schema.ts were not present in the database, causing startup WARNs and 500 errors at runtime.
---

## The rule
When `db:push` fails (requires interactive TTY), create missing tables using `executeSql` in the code_execution sandbox directly from the schema definitions.

**Why:** drizzle-kit push prompts interactively when it detects ambiguous renames; CI/non-TTY shells abort. Direct SQL is the fastest fix.

**How to apply:** Read the pgTable definition in shared/schema.ts, translate column types (serial→serial, text→text, varchar→varchar, boolean→boolean, integer→integer, jsonb→jsonb, timestamp→timestamp), then run CREATE TABLE IF NOT EXISTS. Include all indexes from the schema's second argument array.

## Tables created manually (June 2026)
These were absent and created via executeSql:
- funnel_stages (+ idx_funnel_stages_order)
- notification_signups
- analytics_daily_rollup (+ 4 indexes)
- analytics_monthly_rollup (+ 3 indexes)
- link_scans (+ 2 indexes)
- link_findings (+ 4 indexes)
- link_change_logs (+ 3 indexes)
- link_health_config
- site_config
