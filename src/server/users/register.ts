import { hashPassword } from "@/lib/security/hash";
import { normalizeEmail } from "@/server/users/identity";
import { getDb } from "@/lib/db";

export async function registerCredentialsUser(input: {
  email: string;
  password: string;
  name?: string | null;
}) {
  const db = getDb();
  const normalizedEmail = normalizeEmail(input.email);

  const existing = await db.selectFrom("users_profile").selectAll().where("email", "=", normalizedEmail).executeTakeFirst();
  if (existing) {
    throw new Error("A user with this email already exists");
  }

  const profile = await db
    .insertInto("users_profile")
    .values({
      email: normalizedEmail,
      name: input.name ?? null,
      phone: null
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  await db
    .insertInto("auth_identities")
    .values({
      user_profile_id: profile.id,
      provider: "nextauth",
      provider_user_id: normalizedEmail,
      provider_email: normalizedEmail
    })
    .execute();

  await db
    .insertInto("user_credentials")
    .values({
      user_profile_id: profile.id,
      password_hash: await hashPassword(input.password)
    })
    .execute();

  return profile;
}
