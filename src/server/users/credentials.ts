import { comparePassword } from "@/lib/security/hash";
import { getDb } from "@/lib/db";

export async function validateCredentials(email: string, password: string) {
  const db = getDb();

  const row = await db
    .selectFrom("users_profile")
    .innerJoin("user_credentials", "user_credentials.user_profile_id", "users_profile.id")
    .select([
      "users_profile.id",
      "users_profile.email",
      "users_profile.name",
      "user_credentials.password_hash"
    ])
    .where("users_profile.email", "=", email.toLowerCase())
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  const valid = await comparePassword(password, row.password_hash);
  if (!valid) {
    return null;
  }

  return {
    id: row.id,
    email: row.email ?? email,
    name: row.name,
    emailVerified: true
  };
}
