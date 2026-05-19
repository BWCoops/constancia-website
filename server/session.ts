/**
 * Session middleware factory — kept independent of any auth strategy so it
 * survives the Replit-OAuth -> Clerk migration. Used by clerkAuth.setupAuth()
 * and by request handlers that read req.session.* directly (FinanceCompass
 * OTP, public-form flow, etc.).
 */
import session from "express-session";
import connectPg from "connect-pg-simple";
import pg, { type Pool as PoolType } from "pg";
import { createChildLogger } from "./lib/logger";

const log = createChildLogger("session");
const { Pool } = pg;

let sessionPool: PoolType | null = null;

function getSessionPool(): PoolType {
  if (!sessionPool) {
    sessionPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      min: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: false,
    });
    sessionPool.on("error", (err: Error) => log.error({ err }, "Session pool error"));
  }
  return sessionPool;
}

export function getSession() {
  const ttl = 7 * 24 * 60 * 60 * 1000; // 7 days
  const pool = getSessionPool();

  const PgStore = connectPg(session);
  const store = new PgStore({
    pool,
    createTableIfMissing: false,
    ttl,
    tableName: "sessions",
    pruneSessionInterval: 60 * 15,
    disableTouch: false,
    errorLog: (error: Error) => log.error({ err: error }, "Session store DB error"),
  });

  store.on("error", (error: Error) => log.error({ err: error }, "Session store error"));

  return session({
    secret: process.env.SESSION_SECRET!,
    store,
    resave: false,
    saveUninitialized: false,
    name: "constancia_session",
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: ttl,
      path: "/",
    },
  });
}
