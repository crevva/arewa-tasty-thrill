import { getDb } from "@/lib/db";
import { requireAdminSession } from "@/lib/security/admin";
import { zoneSchema } from "@/lib/validators/admin";
import { badRequest, forbidden, internalError, ok } from "@/lib/utils/http";
import { writeAuditLog } from "@/server/admin/audit";

export async function GET() {
  try {
    await requireAdminSession();
    const zones = await getDb().selectFrom("delivery_zones").selectAll().orderBy("zone asc").execute();
    return ok({ zones });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Admin access required")) {
      return forbidden();
    }
    return internalError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession();
    const payload = await request.json();
    const parsed = zoneSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const zone = await getDb().insertInto("delivery_zones").values(parsed.data).returningAll().executeTakeFirstOrThrow();

    await writeAuditLog({
      actorUserProfileId: admin.userId,
      action: "create",
      entity: "delivery_zone",
      entityId: zone.id
    });

    return ok({ zone });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Admin access required")) {
      return forbidden();
    }
    return internalError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdminSession();
    const payload = (await request.json()) as { id?: string } & Record<string, unknown>;
    if (!payload.id) {
      return badRequest("id is required");
    }

    const parsed = zoneSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const zone = await getDb()
      .updateTable("delivery_zones")
      .set(parsed.data)
      .where("id", "=", payload.id)
      .returningAll()
      .executeTakeFirstOrThrow();

    await writeAuditLog({
      actorUserProfileId: admin.userId,
      action: "update",
      entity: "delivery_zone",
      entityId: zone.id
    });

    return ok({ zone });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Admin access required")) {
      return forbidden();
    }
    return internalError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdminSession();
    const payload = (await request.json()) as { id?: string };
    if (!payload.id) {
      return badRequest("id is required");
    }

    await getDb().deleteFrom("delivery_zones").where("id", "=", payload.id).execute();

    await writeAuditLog({
      actorUserProfileId: admin.userId,
      action: "delete",
      entity: "delivery_zone",
      entityId: payload.id
    });

    return ok({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Admin access required")) {
      return forbidden();
    }
    return internalError(error);
  }
}
