import { getDb } from "@/lib/db";
import {
  isBackofficeAccessError,
  requireBackofficeSession
} from "@/lib/security/admin";
import { categorySchema } from "@/lib/validators/admin";
import { badRequest, forbidden, internalError, ok } from "@/lib/utils/http";
import { writeAuditLog } from "@/server/admin/audit";

export async function GET() {
  try {
    await requireBackofficeSession("admin");
    const categories = await getDb().selectFrom("categories").selectAll().orderBy("name asc").execute();
    return ok({ categories });
  } catch (error) {
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    return internalError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireBackofficeSession("admin");
    const payload = await request.json();
    const parsed = categorySchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const category = await getDb()
      .insertInto("categories")
      .values(parsed.data)
      .returningAll()
      .executeTakeFirstOrThrow();

    await writeAuditLog({
      actorUserProfileId: admin.userId,
      action: "create",
      entity: "category",
      entityId: category.id
    });

    return ok({ category });
  } catch (error) {
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    return internalError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireBackofficeSession("admin");
    const payload = (await request.json()) as { id?: string } & Record<string, unknown>;
    if (!payload.id) {
      return badRequest("id is required");
    }

    const parsed = categorySchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const category = await getDb()
      .updateTable("categories")
      .set(parsed.data)
      .where("id", "=", payload.id)
      .returningAll()
      .executeTakeFirstOrThrow();

    await writeAuditLog({
      actorUserProfileId: admin.userId,
      action: "update",
      entity: "category",
      entityId: category.id
    });

    return ok({ category });
  } catch (error) {
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    return internalError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireBackofficeSession("admin");
    const payload = (await request.json()) as { id?: string };
    if (!payload.id) {
      return badRequest("id is required");
    }

    await getDb().deleteFrom("categories").where("id", "=", payload.id).execute();

    await writeAuditLog({
      actorUserProfileId: admin.userId,
      action: "delete",
      entity: "category",
      entityId: payload.id
    });

    return ok({ ok: true });
  } catch (error) {
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    return internalError(error);
  }
}
