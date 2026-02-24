import { getDb } from "@/lib/db";
import {
  isBackofficeAccessError,
  requireBackofficeSession
} from "@/lib/security/admin";
import {
  buildPaginationMeta,
  parseDateParam,
  parsePage,
  parsePageSize
} from "@/lib/utils/pagination";
import { badRequest, forbidden, internalError, ok } from "@/lib/utils/http";
import { writeAuditLog } from "@/server/admin/audit";

export async function GET(request: Request) {
  try {
    await requireBackofficeSession("staff");

    const searchParams = new URL(request.url).searchParams;
    const page = parsePage(searchParams);
    const pageSize = parsePageSize(searchParams);
    const q = searchParams.get("q")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";
    const dateFrom = parseDateParam(searchParams.get("dateFrom"));
    const dateToValue = parseDateParam(searchParams.get("dateTo"));
    const dateTo = dateToValue
      ? new Date(dateToValue.getTime() + (24 * 60 * 60 * 1000 - 1))
      : null;

    const db = getDb();
    const baseQuery = db
      .selectFrom("orders")
      .leftJoin("delivery_zones", "delivery_zones.id", "orders.delivery_zone_id")
      .$if(Boolean(q), (query) =>
        query.where((eb) =>
          eb.or([
            eb("orders.order_code", "ilike", `%${q}%`),
            eb("orders.guest_email", "ilike", `%${q}%`),
            eb("orders.guest_phone", "ilike", `%${q}%`)
          ])
        )
      )
      .$if(Boolean(status), (query) => query.where("orders.status", "=", status))
      .$if(Boolean(dateFrom), (query) =>
        query.where("orders.created_at", ">=", dateFrom as Date)
      )
      .$if(Boolean(dateTo), (query) => query.where("orders.created_at", "<=", dateTo as Date));

    const totalRow = await baseQuery
      .select(({ fn }) => fn.count<string>("orders.id").as("total"))
      .executeTakeFirst();
    const total = Number(totalRow?.total ?? 0);
    const pagination = buildPaginationMeta({ page, pageSize, total });

    const items = await baseQuery
      .select([
        "orders.id",
        "orders.order_code",
        "orders.status",
        "orders.total",
        "orders.currency",
        "orders.guest_email",
        "orders.guest_phone",
        "orders.created_at",
        "delivery_zones.zone as delivery_zone"
      ])
      .orderBy("orders.created_at desc")
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
    return internalError(error, { context: { route: "admin_orders_get" } });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireBackofficeSession("staff");
    const payload = (await request.json()) as { id?: string; status?: string };

    if (!payload.id || !payload.status) {
      return badRequest("id and status are required");
    }

    const order = await getDb()
      .updateTable("orders")
      .set({ status: payload.status })
      .where("id", "=", payload.id)
      .returningAll()
      .executeTakeFirstOrThrow();

    await writeAuditLog({
      actorUserProfileId: admin.userId,
      action: "update_status",
      entity: "order",
      entityId: order.id,
      meta: { status: payload.status }
    });

    return ok({ order });
  } catch (error) {
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    return internalError(error, { context: { route: "admin_orders_put" } });
  }
}
