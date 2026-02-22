import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";

export async function enforceRateLimit(routeKey: string, subjectKey: string) {
  const env = getEnv();
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / (env.RATE_LIMIT_WINDOW_SECONDS * 1000)) * env.RATE_LIMIT_WINDOW_SECONDS * 1000);

  const db = getDb();
  const existing = await db
    .selectFrom("rate_limit_buckets")
    .select(["id", "attempts"])
    .where("route_key", "=", routeKey)
    .where("subject_key", "=", subjectKey)
    .where("window_start", "=", windowStart)
    .executeTakeFirst();

  if (!existing) {
    await db
      .insertInto("rate_limit_buckets")
      .values({
        route_key: routeKey,
        subject_key: subjectKey,
        window_start: windowStart,
        attempts: 1,
        updated_at: now
      })
      .execute();
    return;
  }

  if (existing.attempts >= env.RATE_LIMIT_MAX_ATTEMPTS) {
    throw new Error("Too many requests. Try again soon.");
  }

  await db
    .updateTable("rate_limit_buckets")
    .set({
      attempts: existing.attempts + 1,
      updated_at: now
    })
    .where("id", "=", existing.id)
    .execute();
}
