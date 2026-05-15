/**
 * POST /api/leads/sync — bridge Clerk user to the leads table.
 *
 * Auth: requireAuth (Clerk-first, falls back to legacy if Clerk not set up).
 * Idempotent: keyed by clerkUserId — second call updates the existing row.
 *
 * Replaces the old OTP-based gate by trusting Clerk for email verification.
 * The lead capture (company + jobTitle + consent) still happens because
 * we need it for HubSpot sync + sales enablement.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { contactSubmissions } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuthOrFallback, getUserId } from "../middleware/clerk-auth";
import { isAuthenticated } from "../replitAuth";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("leads-sync");
const router = Router();

const syncSchema = z.object({
  email:            z.string().email(),
  firstName:        z.string().min(1).max(100),
  lastName:         z.string().min(1).max(100),
  company:          z.string().min(1).max(200),
  jobTitle:         z.string().min(1).max(150),
  consentMarketing: z.boolean().default(false),
  clerkUserId:      z.string().min(1),
});

router.post("/sync", requireAuthOrFallback(isAuthenticated), async (req: Request, res: Response) => {
  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid lead payload", details: parsed.error.flatten() });
    return;
  }

  const userId = getUserId(req);
  if (userId && userId !== parsed.data.clerkUserId) {
    res.status(403).json({ error: "Clerk userId mismatch" });
    return;
  }

  const { email, firstName, lastName, company, jobTitle, consentMarketing, clerkUserId } = parsed.data;

  try {
    // Look up by Clerk user id stored in pageUrl as a tag (cheap dedupe key
    // without a schema change). For a future migration, add `clerk_user_id`
    // column to contact_submissions and swap to that.
    const lookupKey = `clerk:${clerkUserId}`;
    const existing = await db
      .select()
      .from(contactSubmissions)
      .where(sql`${contactSubmissions.referrer} = ${lookupKey}`)
      .limit(1);

    if (existing[0]) {
      await db.update(contactSubmissions)
        .set({
          firstName,
          lastName,
          email,
          company,
          jobTitle,
          consentMarketing,
          verified: true,           // Clerk verified the email
          verifiedAt: new Date(),
        })
        .where(eq(contactSubmissions.id, existing[0].id));

      log.info({ leadId: existing[0].id, clerkUserId }, "Lead updated via Clerk sync");
      res.json({ ok: true, leadId: existing[0].id, action: "updated" });
      return;
    }

    const [created] = await db.insert(contactSubmissions).values({
      firstName,
      lastName,
      email,
      company,
      jobTitle,
      message: "(via Clerk sign-up)",
      consentMarketing,
      verified:   true,
      verifiedAt: new Date(),
      // Stash the clerk id here so we can dedupe on next sync
      referrer:   lookupKey,
      ipAddress:  (req.headers["x-forwarded-for"] as string)?.split(",")[0] ?? req.socket.remoteAddress ?? null,
      userAgent:  req.headers["user-agent"] ?? null,
    }).returning();

    log.info({ leadId: created.id, clerkUserId }, "Lead created via Clerk sync");
    res.json({ ok: true, leadId: created.id, action: "created" });
  } catch (err) {
    log.error({ err, clerkUserId }, "Failed to sync Clerk lead");
    res.status(500).json({ error: "Failed to sync lead" });
  }
});

export default router;
