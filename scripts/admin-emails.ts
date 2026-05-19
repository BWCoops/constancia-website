#!/usr/bin/env tsx
/**
 * Admin email whitelist helpers — run from the project root in Replit Shell.
 *
 * Why this exists: clerkAuth.ts treats the database whitelist
 * (admin_authorized_emails table) as the source of truth when it has any
 * entries. If you sign in via Clerk with an email that isn't in the table,
 * you'll be sent to /admin/access-denied even though Clerk itself is happy.
 * After the 1qg.com -> constancia.io rebrand, the existing rows are likely
 * still pointing at @1qg.com — this script lets you fix that without
 * touching the DB by hand.
 *
 * Usage:
 *
 *   List:     tsx scripts/admin-emails.ts list
 *   Add:      tsx scripts/admin-emails.ts add <email> [description]
 *   Remove:   tsx scripts/admin-emails.ts remove <email>
 *   Migrate:  tsx scripts/admin-emails.ts migrate <oldDomain> <newDomain>
 *             (e.g. migrate 1qg.com constancia.io)
 */

import { db } from "../server/db";
import { adminAuthorizedEmails } from "@shared/schema";
import { eq, like, and } from "drizzle-orm";

const [, , cmd, arg1, arg2] = process.argv;

async function list() {
  const rows = await db.select().from(adminAuthorizedEmails);
  if (rows.length === 0) {
    console.log("(empty — env var AUTHORIZED_ADMIN_EMAILS is the active source of truth)");
    return;
  }
  console.log(`${rows.length} admin whitelist entries:`);
  for (const r of rows) {
    console.log(`  ${r.isActive ? "✓" : "·"}  ${r.email}${r.description ? "  — " + r.description : ""}`);
  }
}

async function add(email: string, description?: string) {
  if (!email || !email.includes("@")) throw new Error("Invalid email");
  const normalised = email.trim().toLowerCase();
  const existing = await db
    .select()
    .from(adminAuthorizedEmails)
    .where(eq(adminAuthorizedEmails.email, normalised))
    .limit(1);
  if (existing.length > 0) {
    console.log(`Already present: ${normalised} (active=${existing[0].isActive})`);
    return;
  }
  await db.insert(adminAuthorizedEmails).values({
    email: normalised,
    description: description ?? "Added via scripts/admin-emails.ts",
    addedBy: "cli",
    isActive: true,
  });
  console.log(`Added: ${normalised}`);
}

async function remove(email: string) {
  const normalised = email.trim().toLowerCase();
  const result = await db
    .delete(adminAuthorizedEmails)
    .where(eq(adminAuthorizedEmails.email, normalised))
    .returning();
  console.log(result.length > 0 ? `Removed: ${normalised}` : `Not found: ${normalised}`);
}

async function migrate(oldDomain: string, newDomain: string) {
  if (!oldDomain || !newDomain) throw new Error("Usage: migrate <oldDomain> <newDomain>");
  const rows = await db
    .select()
    .from(adminAuthorizedEmails)
    .where(like(adminAuthorizedEmails.email, `%@${oldDomain}`));
  if (rows.length === 0) {
    console.log(`No rows match @${oldDomain}`);
    return;
  }
  console.log(`Found ${rows.length} entries to migrate:`);
  for (const r of rows) {
    const newEmail = r.email.replace(new RegExp(`@${oldDomain}$`), `@${newDomain}`);
    const dup = await db
      .select()
      .from(adminAuthorizedEmails)
      .where(eq(adminAuthorizedEmails.email, newEmail))
      .limit(1);
    if (dup.length > 0) {
      console.log(`  ${r.email}  ->  ${newEmail}  (skipped — already exists)`);
      continue;
    }
    await db
      .update(adminAuthorizedEmails)
      .set({ email: newEmail })
      .where(eq(adminAuthorizedEmails.id, r.id));
    console.log(`  ${r.email}  ->  ${newEmail}  ✓`);
  }
}

(async () => {
  try {
    switch (cmd) {
      case "list":
        await list();
        break;
      case "add":
        await add(arg1, arg2);
        break;
      case "remove":
        await remove(arg1);
        break;
      case "migrate":
        await migrate(arg1, arg2);
        break;
      default:
        console.error(
          "Unknown command. Use one of: list | add <email> [desc] | remove <email> | migrate <oldDomain> <newDomain>"
        );
        process.exit(2);
    }
    process.exit(0);
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  }
})();
