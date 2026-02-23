import { getDb } from "@/lib/db";
import {
  isBackofficeAccessError,
  requireBackofficeSession
} from "@/lib/security/admin";
import { backofficeUserUpdateSchema } from "@/lib/validators/admin";
import { badRequest, forbidden, internalError, ok } from "@/lib/utils/http";
import { writeAuditLog } from "@/server/admin/audit";
import { listBackofficeUsers } from "@/server/backoffice/invites";

export async function GET() {
  try {
    await requireBackofficeSession("superadmin");
    const users = await listBackofficeUsers();

    return ok({ users });
  } catch (error) {
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    return internalError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const actor = await requireBackofficeSession("superadmin");
    const payload = await request.json();
    const parsed = backofficeUserUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const existing = await getDb()
      .selectFrom("backoffice_users")
      .select(["id", "user_profile_id", "role", "status"])
      .where("id", "=", parsed.data.id)
      .executeTakeFirst();

    if (!existing) {
      return badRequest("Backoffice user not found");
    }

    if (
      existing.user_profile_id === actor.userId &&
      parsed.data.role &&
      parsed.data.role !== "superadmin"
    ) {
      return badRequest("You cannot demote your own superadmin role");
    }

    if (
      existing.user_profile_id === actor.userId &&
      parsed.data.status &&
      parsed.data.status !== "active"
    ) {
      return badRequest("You cannot suspend your own account");
    }

    const updated = await getDb()
      .updateTable("backoffice_users")
      .set({
        role: parsed.data.role ?? existing.role,
        status: parsed.data.status ?? existing.status,
        updated_at: new Date()
      })
      .where("id", "=", parsed.data.id)
      .returningAll()
      .executeTakeFirstOrThrow();

    await writeAuditLog({
      actorUserProfileId: actor.userId,
      action: "update_backoffice_user",
      entity: "backoffice_user",
      entityId: updated.id,
      meta: {
        role: updated.role,
        status: updated.status
      }
    });

    return ok({ user: updated });
  } catch (error) {
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    return internalError(error);
  }
}
