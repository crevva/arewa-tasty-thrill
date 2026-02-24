import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import { getEnv } from "@/lib/env";
import type { Database } from "@/lib/db/types";

type DbState = {
  db: Kysely<Database>;
};

const globalForDb = globalThis as unknown as {
  __atThrillDbState?: DbState;
};

let dbState: DbState | null = null;
let warnedSupabaseSessionPooler = false;

function resolveSslForDatabaseUrl(databaseUrl: string) {
  try {
    const parsed = new URL(databaseUrl);
    const sslMode = parsed.searchParams.get("sslmode");
    const isSupabaseHost =
      parsed.hostname.includes(".supabase.co") ||
      parsed.hostname.includes(".pooler.supabase.com");

    if (isSupabaseHost || (sslMode && sslMode !== "disable")) {
      return { rejectUnauthorized: false };
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function warnIfSupabaseSessionPooler(databaseUrl: string) {
  if (warnedSupabaseSessionPooler || !process.env.VERCEL) {
    return;
  }

  try {
    const parsed = new URL(databaseUrl);
    const isSupabasePooler = parsed.hostname.includes(".pooler.supabase.com");
    const isSessionModePort = parsed.port === "5432";

    if (isSupabasePooler && isSessionModePort) {
      warnedSupabaseSessionPooler = true;
      console.warn(
        "[db] Supabase session pooler detected on port 5432 in Vercel. " +
          "Use Supabase transaction pooler (port 6543) for serverless workloads."
      );
    }
  } catch {
    // Ignore URL parsing errors.
  }
}

function normalizeConnectionString(databaseUrl: string, useCustomSsl: boolean) {
  if (!useCustomSsl) {
    return databaseUrl;
  }

  try {
    const parsed = new URL(databaseUrl);
    // Remove sslmode from URL to avoid pg-connection-string enforcing verify-full.
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    return databaseUrl;
  }
}

function resolvePoolSettings() {
  const env = getEnv();
  const isVercel = Boolean(process.env.VERCEL);

  return {
    max: env.DB_POOL_MAX ?? (isVercel ? 1 : 10),
    idleTimeoutMillis: env.DB_POOL_IDLE_TIMEOUT_MS ?? (isVercel ? 5_000 : 30_000),
    connectionTimeoutMillis: env.DB_POOL_CONNECTION_TIMEOUT_MS ?? 10_000,
    maxUses: env.DB_POOL_MAX_USES
  };
}

export function getDb() {
  if (dbState) {
    return dbState.db;
  }

  if (globalForDb.__atThrillDbState) {
    dbState = globalForDb.__atThrillDbState;
    return dbState.db;
  }

  const env = getEnv();
  warnIfSupabaseSessionPooler(env.DATABASE_URL);

  const ssl = resolveSslForDatabaseUrl(env.DATABASE_URL);
  const connectionString = normalizeConnectionString(env.DATABASE_URL, Boolean(ssl));
  const pool = new Pool({
    connectionString,
    ...resolvePoolSettings(),
    ...(ssl ? { ssl } : {})
  });

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool:
        pool as unknown as ConstructorParameters<typeof PostgresDialect>[0]["pool"]
    })
  });

  dbState = { db };
  globalForDb.__atThrillDbState = dbState;
  return dbState.db;
}

export async function destroyDb() {
  const activeState = dbState ?? globalForDb.__atThrillDbState;
  if (!activeState) {
    return;
  }

  await activeState.db.destroy();
  dbState = null;
  delete globalForDb.__atThrillDbState;
}
