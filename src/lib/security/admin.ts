import { requireSession } from "@/auth";
import { getEnv } from "@/lib/env";

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  const allowed = getEnv()
    .ADMIN_EMAILS.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.toLowerCase());
}

export async function requireAdminSession() {
  const session = await requireSession();
  if (!isAdminEmail(session.email)) {
    throw new Error("Admin access required");
  }
  return session;
}
