/**
 * Seed the funnel_stages table from the taxonomy module on first boot.
 *
 * Run once on server start. If `funnel_stages` is empty, bootstrap it
 * from `FUNNEL_STAGES`. After that the DB is the source of truth — the
 * operator can edit the stages without a deploy.
 */

import { db } from "../../db";
import { funnelStages } from "@shared/schema";
import { FUNNEL_STAGES } from "@shared/analytics-taxonomy";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("analytics-seed");

export async function seedFunnelStages(): Promise<void> {
  const existing = await db.select().from(funnelStages).limit(1);
  if (existing.length > 0) return;

  const rows = FUNNEL_STAGES.map((stage, index) => ({
    stageKey: stage.key,
    stageOrder: index,
    label: stage.label,
    description: stage.description,
    eventTypes: stage.events as unknown as string[],
    targetConversionPct: stage.targetConversionPct,
    warningPct: stage.warningPct,
    isActive: true,
  }));

  await db.insert(funnelStages).values(rows);
  log.info({ count: rows.length }, "Seeded funnel_stages from taxonomy");
}
