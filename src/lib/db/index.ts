import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import { getEnv } from "@/lib/env";
import type { Database } from "@/lib/db/types";

let dbSingleton: Kysely<Database> | null = null;

export function getDb() {
  if (!dbSingleton) {
    const env = getEnv();
    const pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10
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
