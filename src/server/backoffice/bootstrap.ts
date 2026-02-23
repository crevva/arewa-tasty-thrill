import type { Kysely } from "kysely";

import type { AppSession } from "@/auth/types";
import { getDb } from "@/lib/db";
import type { Database } from "@/lib/db/types";
import { getEnv } from "@/lib/env";
import { hashPassword } from "@/lib/security/hash";
import { normalizeEmail } from "@/server/users/identity";

type EnsureSeededSuperadminInput = {
  db?: Kysely<Database>;
};

export async function ensureSeededSuperadmin(input: EnsureSeededSuperadminInput = {}) {
  const env = getEnv();
  if (!env.SUPERADMIN_EMAIL) {
    return null;
  }

  const db = input.db ?? getDb();
  const email = normalizeEmail(env.SUPERADMIN_EMAIL);
  const superadminName = env.SUPERADMIN_NAME;
  const now = new Date();

  const profile =
    (await db.selectFrom("users_profile").selectAll().where("email", "=", email).executeTakeFirst()) ??
    (await db
      .insertInto("users_profile")
      .values({
        email,
        name: superadminName,
        phone: null
      })
      .returningAll()
      .executeTakeFirstOrThrow());

  if (!profile.name && superadminName) {
    await db.updateTable("users_profile").set({ name: superadminName }).where("id", "=", profile.id).execute();
  }

  await db
    .insertInto("auth_identities")
    .values({
      user_profile_id: profile.id,
      provider: "nextauth",
      provider_user_id: email,
      provider_email: email
    })
    .onConflict((oc) =>
      oc.columns(["provider", "provider_user_id"]).doUpdateSet({
        user_profile_id: profile.id,
        provider_email: email
      })
    )
    .execute();

  if (env.SUPERADMIN_INITIAL_PASSWORD) {
    const existingCredentials = await db
      .selectFrom("user_credentials")
      .select(["id"])
      .where("user_profile_id", "=", profile.id)
      .executeTakeFirst();

    if (!existingCredentials) {
      await db
        .insertInto("user_credentials")
        .values({
          user_profile_id: profile.id,
          password_hash: await hashPassword(env.SUPERADMIN_INITIAL_PASSWORD),
          updated_at: now
        })
        .execute();
    }
  }

  await db
    .insertInto("backoffice_users")
    .values({
      user_profile_id: profile.id,
      role: "superadmin",
      status: "active",
      created_by_user_profile_id: null,
      updated_at: now
    })
    .onConflict((oc) =>
      oc.column("user_profile_id").doUpdateSet({
        role: "superadmin",
        status: "active",
        updated_at: now
      })
    )
    .execute();

  return profile;
}

export async function ensureSuperadminRoleForSession(session: Pick<AppSession, "userId" | "email">) {
  const env = getEnv();
  if (!env.SUPERADMIN_EMAIL) {
    return false;
  }

  const configured = normalizeEmail(env.SUPERADMIN_EMAIL);
  if (normalizeEmail(session.email) !== configured) {
    return false;
  }

  await getDb()
    .insertInto("backoffice_users")
    .values({
      user_profile_id: session.userId,
      role: "superadmin",
      status: "active",
      created_by_user_profile_id: null,
      updated_at: new Date()
    })
    .onConflict((oc) =>
      oc.column("user_profile_id").doUpdateSet({
        role: "superadmin",
        status: "active",
        updated_at: new Date()
      })
    )
    .execute();

  return true;
}
