import { Pool, PoolClient, QueryResult, QueryResultRow } from "@neondatabase/serverless";
import { config, isProduction, safeLog } from "./config";
import { createChildLogger } from "./lib/logger";

const log = createChildLogger("db-pool");

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ 
      connectionString: config.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    
    pool.on("error", (err) => {
      log.error({ err }, "Unexpected error on idle client");
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string, 
  params?: unknown[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  const start = Date.now();
  
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    if (!isProduction && duration > 1000) {
      log.warn({ duration, query: text.substring(0, 100) }, "Slow query detected");
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    log.error({
      duration,
      query: text.substring(0, 200),
      err: error instanceof Error ? error : new Error(String(error)),
    }, "Query failed");
    throw error;
  }
}

export async function withClient<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  return withClient(async (client) => {
    await client.query("BEGIN");
    
    try {
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export async function checkHealth(): Promise<{
  healthy: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    await query("SELECT 1");
    return {
      healthy: true,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    log.info("Connection pool closed");
  }
}

process.on("SIGTERM", async () => {
  await closePool();
});

process.on("SIGINT", async () => {
  await closePool();
});
