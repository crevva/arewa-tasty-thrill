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
import { eventRequestUpdateSchema } from "@/lib/validators/admin";
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
      .selectFrom("event_requests")
      .$if(Boolean(q), (query) =>
        query.where((eb) =>
          eb.or([
            eb("event_requests.name", "ilike", `%${q}%`),
            eb("event_requests.email", "ilike", `%${q}%`),
            eb("event_requests.phone", "ilike", `%${q}%`),
            eb("event_requests.event_type", "ilike", `%${q}%`)
          ])
        )
      )
      .$if(Boolean(status), (query) => query.where("event_requests.status", "=", status))
      .$if(Boolean(dateFrom), (query) =>
        query.where("event_requests.created_at", ">=", dateFrom as Date)
      )
      .$if(Boolean(dateTo), (query) =>
        query.where("event_requests.created_at", "<=", dateTo as Date)
      );

    const totalRow = await baseQuery
      .select(({ fn }) => fn.count<string>("event_requests.id").as("total"))
      .executeTakeFirst();
    const total = Number(totalRow?.total ?? 0);
    const pagination = buildPaginationMeta({ page, pageSize, total });

    const items = await baseQuery
      .selectAll()
      .orderBy("created_at desc")
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
    return internalError(error, { context: { route: "admin_event_requests_get" } });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireBackofficeSession("staff");
    const payload = (await request.json()) as { id?: string; status?: string };
    if (!payload.id) {
      return badRequest("id is required");
    }

    const parsed = eventRequestUpdateSchema.safeParse({ status: payload.status });
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const eventRequest = await getDb()
      .updateTable("event_requests")
      .set({ status: parsed.data.status })
      .where("id", "=", payload.id)
      .returningAll()
      .executeTakeFirstOrThrow();

    await writeAuditLog({
      actorUserProfileId: admin.userId,
      action: "update_status",
      entity: "event_request",
      entityId: eventRequest.id,
      meta: { status: eventRequest.status }
    });

    return ok({ eventRequest });
  } catch (error) {
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    return internalError(error, { context: { route: "admin_event_requests_put" } });
  }
}
