import { getDb } from "@/lib/db";
import type { Row } from "@/lib/db/types";

export type IdentityInput = {
  provider: string;
  providerUserId: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function findProfileByEmail(email: string) {
  const db = getDb();
  return db
    .selectFrom("users_profile")
    .selectAll()
    .where("email", "=", normalizeEmail(email))
    .executeTakeFirst();
}

export async function ensureUserProfileFromIdentity(input: IdentityInput) {
  const db = getDb();

  const identity = await db
    .selectFrom("auth_identities")
    .innerJoin("users_profile", "users_profile.id", "auth_identities.user_profile_id")
    .select([
      "auth_identities.id as identity_id",
      "users_profile.id",
      "users_profile.email",
      "users_profile.name",
      "users_profile.phone"
    ])
    .where("auth_identities.provider", "=", input.provider)
    .where("auth_identities.provider_user_id", "=", input.providerUserId)
    .executeTakeFirst();

  if (identity) {
    if (input.email || input.name || input.phone) {
      await db
        .updateTable("users_profile")
        .set({
          email: input.email ? normalizeEmail(input.email) : identity.email,
          name: input.name ?? identity.name,
          phone: input.phone ?? identity.phone
        })
        .where("id", "=", identity.id)
        .execute();
    }

    return db
      .selectFrom("users_profile")
      .selectAll()
      .where("id", "=", identity.id)
      .executeTakeFirstOrThrow();
  }

  let profile: Row<"users_profile"> | undefined;
  if (input.email) {
    profile = await findProfileByEmail(input.email);
  }

  if (!profile) {
    profile = await db
      .insertInto("users_profile")
      .values({
        email: input.email ? normalizeEmail(input.email) : null,
        name: input.name ?? null,
        phone: input.phone ?? null
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  await db
    .insertInto("auth_identities")
    .values({
      user_profile_id: profile.id,
      provider: input.provider,
      provider_user_id: input.providerUserId,
      provider_email: input.email ? normalizeEmail(input.email) : null
    })
    .onConflict((oc) => oc.columns(["provider", "provider_user_id"]).doNothing())
    .execute();

  return profile as Row<"users_profile">;
}
