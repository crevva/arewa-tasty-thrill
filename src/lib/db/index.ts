import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import { getEnv } from "@/lib/env";
import type { Database } from "@/lib/db/types";

let dbSingleton: Kysely<Database> | null = null;

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

export function getDb() {
  if (!dbSingleton) {
    const env = getEnv();
    const ssl = resolveSslForDatabaseUrl(env.DATABASE_URL);
    const connectionString = normalizeConnectionString(env.DATABASE_URL, Boolean(ssl));
    const pool = new Pool({
      connectionString,
      max: 10,
      ...(ssl ? { ssl } : {})
    });

    dbSingleton = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool:
          pool as unknown as ConstructorParameters<typeof PostgresDialect>[0]["pool"]
      })
    });
  }

  return dbSingleton;
}

export async function destroyDb() {
  if (!dbSingleton) {
    return;
  }

  await dbSingleton.destroy();
  dbSingleton = null;
}
