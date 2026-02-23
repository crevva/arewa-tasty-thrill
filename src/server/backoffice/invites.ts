import { createHash, randomBytes } from "node:crypto";
import { sql } from "kysely";

import { getEnv } from "@/lib/env";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/security/hash";
import { sendBackofficeInviteEmail } from "@/server/notifications/email";
import { writeAuditLog } from "@/server/admin/audit";
import { normalizeEmail } from "@/server/users/identity";
import type {
  BackofficeInviteRole,
  BackofficeInviteStatus
} from "@/server/backoffice/types";

function inviteExpiryDate(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createInviteToken() {
  return randomBytes(32).toString("hex");
}

export async function expirePendingInvitesByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  await getDb()
    .updateTable("backoffice_invites")
    .set({ status: "expired" })
    .where(sql`lower(email)`, "=", normalizedEmail)
    .where("status", "=", "pending")
    .where("expires_at", "<=", now)
    .execute();
}

export async function hasPendingBackofficeInviteForEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  await expirePendingInvitesByEmail(normalizedEmail);

  const pending = await getDb()
    .selectFrom("backoffice_invites")
    .select(["id"])
    .where(sql`lower(email)`, "=", normalizedEmail)
    .where("status", "=", "pending")
    .where("expires_at", ">", new Date())
    .executeTakeFirst();

  return Boolean(pending);
}

export async function createInvite(input: {
  email: string;
  role: BackofficeInviteRole;
  actorUserId: string;
  actorEmail?: string | null;
}) {
  const env = getEnv();
  if (env.AUTH_PROVIDER !== "nextauth") {
    throw new Error("Backoffice invites are currently available only when AUTH_PROVIDER=nextauth.");
  }

  const email = normalizeEmail(input.email);
  const now = new Date();
  const expiresAt = inviteExpiryDate(env.BACKOFFICE_INVITE_TTL_HOURS);

  await expirePendingInvitesByEmail(email);

  const existingPending = await getDb()
    .selectFrom("backoffice_invites")
    .select(["id"])
    .where(sql`lower(email)`, "=", email)
    .where("status", "=", "pending")
    .where("expires_at", ">", now)
    .executeTakeFirst();

  if (existingPending) {
    throw new Error("A pending invite already exists for this email");
  }

  const token = createInviteToken();
  const tokenHash = hashInviteToken(token);

  const invite = await getDb()
    .insertInto("backoffice_invites")
    .values({
      email,
      role: input.role,
      token_hash: tokenHash,
      status: "pending",
      expires_at: expiresAt,
      invited_by_user_profile_id: input.actorUserId
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  const acceptUrl = `${env.APP_BASE_URL}/backoffice/invite/accept?token=${encodeURIComponent(token)}`;
  try {
    await sendBackofficeInviteEmail({
      to: email,
      role: input.role,
      acceptUrl,
      expiresAt,
      invitedByEmail: input.actorEmail ?? null
    });
  } catch (error) {
    await getDb().deleteFrom("backoffice_invites").where("id", "=", invite.id).execute();
    throw error;
  }

  await writeAuditLog({
    actorUserProfileId: input.actorUserId,
    action: "invite_backoffice_user",
    entity: "backoffice_invite",
    entityId: invite.id,
    meta: {
      email,
      role: input.role,
      expiresAt: expiresAt.toISOString()
    }
  });

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    status: invite.status,
    expiresAt: invite.expires_at,
    createdAt: invite.created_at
  };
}

export async function listInvites() {
  const now = new Date();
  await getDb()
    .updateTable("backoffice_invites")
    .set({ status: "expired" })
    .where("status", "=", "pending")
    .where("expires_at", "<=", now)
    .execute();

  return getDb()
    .selectFrom("backoffice_invites")
    .leftJoin(
      "users_profile as inviter",
      "inviter.id",
      "backoffice_invites.invited_by_user_profile_id"
    )
    .leftJoin(
      "users_profile as accepted_user",
      "accepted_user.id",
      "backoffice_invites.accepted_user_profile_id"
    )
    .select([
      "backoffice_invites.id",
      "backoffice_invites.email",
      "backoffice_invites.role",
      "backoffice_invites.status",
      "backoffice_invites.expires_at",
      "backoffice_invites.created_at",
      "backoffice_invites.accepted_at",
      "backoffice_invites.revoked_at",
      "inviter.email as invited_by_email",
      "accepted_user.email as accepted_user_email"
    ])
    .orderBy("backoffice_invites.created_at desc")
    .execute();
}

export async function listBackofficeUsers() {
  return getDb()
    .selectFrom("backoffice_users")
    .innerJoin("users_profile", "users_profile.id", "backoffice_users.user_profile_id")
    .select([
      "backoffice_users.id",
      "backoffice_users.user_profile_id",
      "backoffice_users.role",
      "backoffice_users.status",
      "backoffice_users.created_at",
      "backoffice_users.updated_at",
      "users_profile.email",
      "users_profile.name",
      "users_profile.phone"
    ])
    .orderBy("backoffice_users.created_at desc")
    .execute();
}

export async function revokeInvite(input: { inviteId: string; actorUserId: string }) {
  const now = new Date();

  const invite = await getDb()
    .updateTable("backoffice_invites")
    .set({
      status: "revoked",
      revoked_at: now
    })
    .where("id", "=", input.inviteId)
    .where("status", "=", "pending")
    .returningAll()
    .executeTakeFirst();

  if (!invite) {
    throw new Error("Invite not found or no longer pending");
  }

  await writeAuditLog({
    actorUserProfileId: input.actorUserId,
    action: "revoke_backoffice_invite",
    entity: "backoffice_invite",
    entityId: invite.id,
    meta: {
      email: invite.email
    }
  });

  return invite;
}

function statusMessage(status: BackofficeInviteStatus) {
  if (status === "accepted") {
    return "This invite has already been accepted.";
  }
  if (status === "revoked") {
    return "This invite has been revoked.";
  }
  if (status === "expired") {
    return "This invite has expired.";
  }
  return null;
}

export async function validateInviteToken(token: string) {
  const env = getEnv();
  if (env.AUTH_PROVIDER !== "nextauth") {
    return {
      valid: false,
      status: "not_supported" as const,
      message: "Backoffice invite acceptance is currently available only when AUTH_PROVIDER=nextauth."
    };
  }

  const tokenHash = hashInviteToken(token);
  const now = new Date();
  const invite = await getDb()
    .selectFrom("backoffice_invites")
    .selectAll()
    .where("token_hash", "=", tokenHash)
    .executeTakeFirst();

  if (!invite) {
    return {
      valid: false,
      status: "invalid" as const,
      message: "Invite link is invalid."
    };
  }

  if (invite.status === "pending" && invite.expires_at <= now) {
    await getDb()
      .updateTable("backoffice_invites")
      .set({ status: "expired" })
      .where("id", "=", invite.id)
      .where("status", "=", "pending")
      .execute();

    return {
      valid: false,
      status: "expired" as const,
      message: "This invite has expired."
    };
  }

  if (invite.status !== "pending") {
    return {
      valid: false,
      status: invite.status,
      message: statusMessage(invite.status) ?? "Invite is not available."
    };
  }

  return {
    valid: true,
    status: invite.status,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expires_at
  };
}

export async function acceptInvite(input: {
  token: string;
  name: string;
  password: string;
}) {
  const env = getEnv();
  if (env.AUTH_PROVIDER !== "nextauth") {
    throw new Error("Backoffice invite acceptance is currently available only when AUTH_PROVIDER=nextauth.");
  }

  const tokenHash = hashInviteToken(input.token);
  const now = new Date();
  const db = getDb();

  const accepted = await db.transaction().execute(async (trx) => {
    const invite = await trx
      .selectFrom("backoffice_invites")
      .selectAll()
      .where("token_hash", "=", tokenHash)
      .executeTakeFirst();

    if (!invite) {
      throw new Error("Invite link is invalid.");
    }

    if (invite.status !== "pending") {
      throw new Error(statusMessage(invite.status) ?? "Invite is not available.");
    }

    if (invite.expires_at <= now) {
      await trx
        .updateTable("backoffice_invites")
        .set({ status: "expired" })
        .where("id", "=", invite.id)
        .where("status", "=", "pending")
        .execute();
      throw new Error("This invite has expired.");
    }

    const email = normalizeEmail(invite.email);
    const identity = await trx
      .selectFrom("auth_identities")
      .select(["user_profile_id"])
      .where("provider", "=", "nextauth")
      .where("provider_user_id", "=", email)
      .executeTakeFirst();

    let profileId = identity?.user_profile_id;
    if (!profileId) {
      const profileByEmail = await trx
        .selectFrom("users_profile")
        .select(["id"])
        .where("email", "=", email)
        .executeTakeFirst();
      profileId = profileByEmail?.id;
    }

    if (!profileId) {
      const createdProfile = await trx
        .insertInto("users_profile")
        .values({
          email,
          name: input.name,
          phone: null
        })
        .returning(["id"])
        .executeTakeFirstOrThrow();
      profileId = createdProfile.id;
    }

    await trx
      .updateTable("users_profile")
      .set({
        email,
        name: input.name
      })
      .where("id", "=", profileId)
      .execute();

    await trx
      .insertInto("auth_identities")
      .values({
        user_profile_id: profileId,
        provider: "nextauth",
        provider_user_id: email,
        provider_email: email
      })
      .onConflict((oc) => oc.columns(["provider", "provider_user_id"]).doNothing())
      .execute();

    const passwordHash = await hashPassword(input.password);
    await trx
      .insertInto("user_credentials")
      .values({
        user_profile_id: profileId,
        password_hash: passwordHash,
        updated_at: now
      })
      .onConflict((oc) =>
        oc.column("user_profile_id").doUpdateSet({
          password_hash: passwordHash,
          updated_at: now
        })
      )
      .execute();

    await trx
      .insertInto("backoffice_users")
      .values({
        user_profile_id: profileId,
        role: invite.role,
        status: "active",
        created_by_user_profile_id: invite.invited_by_user_profile_id,
        updated_at: now
      })
      .onConflict((oc) =>
        oc.column("user_profile_id").doUpdateSet({
          role: invite.role,
          status: "active",
          updated_at: now
        })
      )
      .execute();

    const updatedInvite = await trx
      .updateTable("backoffice_invites")
      .set({
        status: "accepted",
        accepted_user_profile_id: profileId,
        accepted_at: now
      })
      .where("id", "=", invite.id)
      .where("status", "=", "pending")
      .returningAll()
      .executeTakeFirst();

    if (!updatedInvite) {
      throw new Error("Invite is no longer pending.");
    }

    return {
      inviteId: updatedInvite.id,
      profileId,
      email,
      role: invite.role
    };
  });

  await writeAuditLog({
    actorUserProfileId: accepted.profileId,
    action: "accept_backoffice_invite",
    entity: "backoffice_invite",
    entityId: accepted.inviteId,
    meta: {
      role: accepted.role,
      email: accepted.email
    }
  });

  return accepted;
}
