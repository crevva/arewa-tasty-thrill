import { getDb } from "@/lib/db";
import {
  isBackofficeAccessError,
  requireBackofficeSession
} from "@/lib/security/admin";
import {
  buildPaginationMeta,
  parseBooleanParam,
  parsePage,
  parsePageSize
} from "@/lib/utils/pagination";
import { zoneSchema } from "@/lib/validators/admin";
import { badRequest, forbidden, internalError, ok } from "@/lib/utils/http";
import { writeAuditLog } from "@/server/admin/audit";

export async function GET(request: Request) {
  try {
    await requireBackofficeSession("admin");
    const searchParams = new URL(request.url).searchParams;
    const page = parsePage(searchParams);
    const pageSize = parsePageSize(searchParams);
    const q = searchParams.get("q")?.trim() ?? "";
    const active = parseBooleanParam(searchParams.get("active"));
    const state = searchParams.get("state")?.trim() ?? "";
    const city = searchParams.get("city")?.trim() ?? "";

    const db = getDb();
    const baseQuery = db
      .selectFrom("delivery_zones")
      .$if(Boolean(q), (query) =>
        query.where((eb) =>
          eb.or([
            eb("delivery_zones.zone", "ilike", `%${q}%`),
            eb("delivery_zones.city", "ilike", `%${q}%`),
            eb("delivery_zones.state", "ilike", `%${q}%`)
          ])
        )
      )
      .$if(active !== null, (query) =>
        query.where("delivery_zones.active", "=", Boolean(active))
      )
      .$if(Boolean(state), (query) => query.where("delivery_zones.state", "=", state))
      .$if(Boolean(city), (query) => query.where("delivery_zones.city", "=", city));

    const totalRow = await baseQuery
      .select(({ fn }) => fn.count<string>("delivery_zones.id").as("total"))
      .executeTakeFirst();
    const total = Number(totalRow?.total ?? 0);
    const pagination = buildPaginationMeta({ page, pageSize, total });

    const items = await baseQuery
      .selectAll()
      .orderBy("delivery_zones.zone asc")
      .limit(pagination.pageSize)
      .offset(pagination.offset)
      .execute();

    return ok({
      items,
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages: pagination.totalPages,
      from: pagination.from,
      to: pagination.to
    });
  } catch (error) {
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    return internalError(error, { context: { route: "admin_delivery_zones_get" } });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireBackofficeSession("admin");
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
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    return internalError(error, { context: { route: "admin_delivery_zones_post" } });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireBackofficeSession("admin");
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
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    return internalError(error, { context: { route: "admin_delivery_zones_put" } });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireBackofficeSession("admin");
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
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    return internalError(error, { context: { route: "admin_delivery_zones_delete" } });
  }
}
