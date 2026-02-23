import { getSession, requireSession } from "@/auth";
import type { AppSession } from "@/auth/types";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { ensureSuperadminRoleForSession } from "@/server/backoffice/bootstrap";
import type { BackofficeAccessSource, BackofficeRole } from "@/server/backoffice/types";

const roleRanks: Record<BackofficeRole, number> = {
  staff: 1,
  admin: 2,
  superadmin: 3
};

export function hasRequiredBackofficeRole(role: BackofficeRole, minRole: BackofficeRole) {
  return roleRanks[role] >= roleRanks[minRole];
}

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

export function isBackofficeAccessError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message === "Authentication required" ||
    error.message === "Admin access required" ||
    error.message === "Insufficient backoffice role"
  );
}

export type BackofficeAccess = AppSession & {
  role: BackofficeRole;
  source: BackofficeAccessSource;
};

async function loadRoleForUserProfile(userProfileId: string) {
  return getDb()
    .selectFrom("backoffice_users")
    .select(["role", "status"])
    .where("user_profile_id", "=", userProfileId)
    .executeTakeFirst();
}

export async function getBackofficeAccess(inputSession?: AppSession | null): Promise<BackofficeAccess | null> {
  const session = inputSession ?? (await getSession());
  if (!session) {
    return null;
  }

  let roleRow = await loadRoleForUserProfile(session.userId);

  if (!roleRow && session.email) {
    const seededNow = await ensureSuperadminRoleForSession({
      userId: session.userId,
      email: session.email
    });

    if (seededNow) {
      roleRow = await loadRoleForUserProfile(session.userId);
    }
  }

  if (roleRow) {
    if (roleRow.status !== "active") {
      return null;
    }

    return {
      ...session,
      role: roleRow.role as BackofficeRole,
      source: "role"
    };
  }

  if (getEnv().ENABLE_ADMIN_EMAILS_FALLBACK === "true" && isAdminEmail(session.email)) {
    return {
      ...session,
      role: "superadmin",
      source: "fallback"
    };
  }

  return null;
}

export async function requireBackofficeSession(minRole: BackofficeRole = "staff") {
  const session = await requireSession();
  const access = await getBackofficeAccess(session);
  if (!access) {
    throw new Error("Admin access required");
  }

  if (!hasRequiredBackofficeRole(access.role, minRole)) {
    throw new Error("Insufficient backoffice role");
  }

  return access;
}

// Backward compatible alias; prefer requireBackofficeSession(minRole).
export async function requireAdminSession() {
  return requireBackofficeSession("admin");
}
