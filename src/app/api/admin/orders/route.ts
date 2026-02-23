import { getDb } from "@/lib/db";
import {
  isBackofficeAccessError,
  requireBackofficeSession
} from "@/lib/security/admin";
import { badRequest, forbidden, internalError, ok } from "@/lib/utils/http";
import { writeAuditLog } from "@/server/admin/audit";

export async function GET() {
  try {
    await requireBackofficeSession("staff");
    const orders = await getDb()
      .selectFrom("orders")
      .leftJoin("delivery_zones", "delivery_zones.id", "orders.delivery_zone_id")
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
      .execute();

    return ok({ orders });
  } catch (error) {
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    return internalError(error);
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
    return internalError(error);
  }
}
