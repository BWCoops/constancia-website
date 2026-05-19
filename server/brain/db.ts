/**
 * Drizzle client for the Constancia Brain.
 *
 * Connects to the dedicated `constancia-brain` Neon project via the
 * `BRAIN_DATABASE_URL` env var — separate from the main website's
 * `DATABASE_URL` so the two blast radii do not overlap.
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as brainSchema from "@shared/brain-schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.BRAIN_DATABASE_URL) {
  throw new Error(
    "BRAIN_DATABASE_URL is required. See .env.example and docs/enterprise-brain-architecture.md.",
  );
}

const brainPool = new Pool({
  connectionString: process.env.BRAIN_DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export const brainDb = drizzle(brainPool, { schema: brainSchema });
export { brainSchema };
