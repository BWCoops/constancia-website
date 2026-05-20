/**
 * Finance Compass → pageAnalytics bridge.
 *
 * FC has its own status state machine on `fc_assessments.status`
 * (in_progress → completed → analysed → report_generated). Before this
 * bridge, those transitions never appeared in the main funnel — the
 * funnel under-counted assessment completions and was structurally
 * unable to attribute FC outcomes to UTM/source channels.
 *
 * This module emits one canonical analytics event per status transition
 * so the funnel sees the FC flow as a first-class participant.
 */

import { db } from "../../db";
import { pageAnalytics } from "@shared/schema";
import {
  ANALYTICS_EVENTS,
  canonicalEvent,
  categoryForEvent,
  type AnalyticsEvent,
} from "@shared/analytics-taxonomy";
import type { FcAssessment } from "@shared/finance-compass-schema";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("fc-analytics-bridge");

/**
 * Maps FC status names to the funnel event they correspond to.
 * `in_progress` is mapped to ASSESSMENT_STARTED — covers the first
 * transition from `not_started` (or new). `completed` and beyond map
 * to ASSESSMENT_COMPLETED.
 */
const STATUS_TO_EVENT: Record<string, AnalyticsEvent> = {
  in_progress: ANALYTICS_EVENTS.ASSESSMENT_STARTED,
  initial_complete: ANALYTICS_EVENTS.ASSESSMENT_PROGRESS_50,
  followups_pending: ANALYTICS_EVENTS.ASSESSMENT_PROGRESS_75,
  completed: ANALYTICS_EVENTS.ASSESSMENT_COMPLETED,
  analysed: ANALYTICS_EVENTS.ASSESSMENT_COMPLETED,
  report_generated: ANALYTICS_EVENTS.REPORT_DOWNLOADED,
};

export async function emitFcStatusEvent(
  assessment: FcAssessment,
  priorStatus: string | undefined,
): Promise<void> {
  const status = assessment.status;
  if (!status) return;
  const event = STATUS_TO_EVENT[status];
  if (!event) return;

  // Re-fire the prior status's event too if we somehow skipped it — but
  // only the new status's event is essential for the bridge.
  void priorStatus;

  const canonical = canonicalEvent(event);
  const category = categoryForEvent(canonical) ?? null;

  // Synthesize a sessionId based on the assessment id so multiple
  // events for the same assessment land in the same funnel session.
  const sessionId = `fc_${assessment.id}`;
  const visitorId = assessment.contactId ? `fc_contact_${assessment.contactId}` : sessionId;

  try {
    await db.insert(pageAnalytics).values({
      eventType: canonical,
      eventCategory: category,
      page: "fc_assess",
      sessionId,
      visitorId,
      assessmentId: assessment.id,
      utmSource: assessment.utmSource ?? null,
      utmMedium: assessment.utmMedium ?? null,
      utmCampaign: assessment.utmCampaign ?? null,
      utmContent: assessment.utmContent ?? null,
      deviceType: assessment.deviceType ?? null,
      browser: assessment.browser ?? null,
      referrer: assessment.referrer ?? null,
      currentScore: assessment.overallMaturityScore ? Math.round(assessment.overallMaturityScore) : null,
      metadata: {
        source: "fc_bridge",
        priorStatus: priorStatus ?? null,
        newStatus: status,
      },
    });
  } catch (err) {
    log.error({ err, assessmentId: assessment.id, status }, "Failed to emit FC bridge event");
  }
}
