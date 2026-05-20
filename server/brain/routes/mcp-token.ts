/**
 * Issue a Bearer token that Claude Code uses to talk to /mcp/brain.
 *
 * Auth: the caller must already be Clerk-authenticated through the
 * existing Express stack. We resolve / provision their kb_users row,
 * then sign and return a token they paste into their Claude Code MCP
 * config.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { brainDb } from "../db";
import { kbUsers, kbTeams } from "@shared/brain-schema";
import { eq } from "drizzle-orm";
import { issueMcpToken } from "../mcp/server";

const router = Router();

interface BrainRequest extends Request {
  auth?: () => { userId?: string | null; sessionClaims?: { email?: string } };
}

router.post("/mcp-token", async (req: BrainRequest, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth?.();
    const clerkUserId = auth?.userId;
    const email = auth?.sessionClaims?.email;
    if (!clerkUserId) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    const existing = await brainDb
      .select({
        id: kbUsers.id,
        teamId: kbUsers.teamId,
        email: kbUsers.email,
        role: kbUsers.role,
        isActive: kbUsers.isActive,
      })
      .from(kbUsers)
      .where(eq(kbUsers.clerkUserId, clerkUserId))
      .limit(1);

    let user = existing[0];

    if (!user) {
      if (!email) {
        res.status(400).json({ error: "Cannot provision user without email" });
        return;
      }
      const [team] = await brainDb
        .select({ id: kbTeams.id })
        .from(kbTeams)
        .where(eq(kbTeams.slug, "constancia"))
        .limit(1);
      if (!team) {
        res.status(500).json({
          error: "Default team not provisioned. Run brain:seed-dictionary.",
        });
        return;
      }
      const [created] = await brainDb
        .insert(kbUsers)
        .values({ teamId: team.id, clerkUserId, email, role: "contributor" })
        .returning({
          id: kbUsers.id,
          teamId: kbUsers.teamId,
          email: kbUsers.email,
          role: kbUsers.role,
          isActive: kbUsers.isActive,
        });
      user = created;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "User deactivated" });
      return;
    }

    const token = issueMcpToken({
      userId: user.id,
      teamId: user.teamId,
      email: user.email,
      role: user.role,
    });

    res.json({
      token,
      mcpUrl: `${req.protocol}://${req.get("host")}/mcp/brain`,
      hint: 'In Claude Code: claude mcp add --transport http constancia-brain <mcpUrl> --header "Authorization: Bearer <token>"',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
