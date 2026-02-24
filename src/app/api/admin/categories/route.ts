import { getDb } from "@/lib/db";
import {
  isBackofficeAccessError,
  requireBackofficeSession
} from "@/lib/security/admin";
import {
  buildPaginationMeta,
  parsePage,
  parsePageSize
} from "@/lib/utils/pagination";
import { categorySchema } from "@/lib/validators/admin";
import { badRequest, forbidden, internalError, ok } from "@/lib/utils/http";
import { writeAuditLog } from "@/server/admin/audit";

export async function GET(request: Request) {
  try {
    await requireBackofficeSession("admin");

    const searchParams = new URL(request.url).searchParams;
    const page = parsePage(searchParams);
    const pageSize = parsePageSize(searchParams);
    const q = searchParams.get("q")?.trim() ?? "";
    const sort = searchParams.get("sort") ?? "name_asc";

    const db = getDb();
    const baseQuery = db
      .selectFrom("categories")
      .$if(Boolean(q), (query) =>
        query.where((eb) =>
          eb.or([
            eb("categories.name", "ilike", `%${q}%`),
            eb("categories.slug", "ilike", `%${q}%`)
          ])
        )
      );

    const totalRow = await baseQuery
      .select(({ fn }) => fn.count<string>("categories.id").as("total"))
      .executeTakeFirst();
    const total = Number(totalRow?.total ?? 0);
    const pagination = buildPaginationMeta({ page, pageSize, total });

    let dataQuery = baseQuery.selectAll();
    if (sort === "name_desc") {
      dataQuery = dataQuery.orderBy("name desc");
    } else if (sort === "newest") {
      dataQuery = dataQuery.orderBy("id desc");
    } else {
      dataQuery = dataQuery.orderBy("name asc");
    }

    const items = await dataQuery
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
    return internalError(error, { context: { route: "admin_categories_get" } });
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
    return internalError(error, { context: { route: "admin_categories_post" } });
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
    return internalError(error, { context: { route: "admin_categories_put" } });
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
    return internalError(error, { context: { route: "admin_categories_delete" } });
  }
}
