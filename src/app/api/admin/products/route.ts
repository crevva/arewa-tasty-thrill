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
import { productSchema } from "@/lib/validators/admin";
import { badRequest, forbidden, internalError, ok } from "@/lib/utils/http";
import { getStorageProvider } from "@/storage";
import { writeAuditLog } from "@/server/admin/audit";

export async function GET(request: Request) {
  try {
    await requireBackofficeSession("admin");

    const searchParams = new URL(request.url).searchParams;
    const page = parsePage(searchParams);
    const pageSize = parsePageSize(searchParams);
    const q = searchParams.get("q")?.trim() ?? "";
    const categoryId = searchParams.get("categoryId")?.trim() ?? "";
    const active = parseBooleanParam(searchParams.get("active"));
    const inStock = parseBooleanParam(searchParams.get("inStock"));
    const sort = searchParams.get("sort") ?? "newest";

    const db = getDb();
    const baseQuery = db
      .selectFrom("products")
      .innerJoin("categories", "categories.id", "products.category_id")
      .$if(Boolean(q), (query) =>
        query.where((eb) =>
          eb.or([
            eb("products.name", "ilike", `%${q}%`),
            eb("products.slug", "ilike", `%${q}%`)
          ])
        )
      )
      .$if(Boolean(categoryId), (query) =>
        query.where("products.category_id", "=", categoryId)
      )
      .$if(active !== null, (query) => query.where("products.active", "=", Boolean(active)))
      .$if(inStock !== null, (query) =>
        query.where("products.in_stock", "=", Boolean(inStock))
      );

    const totalRow = await baseQuery
      .select(({ fn }) => fn.count<string>("products.id").as("total"))
      .executeTakeFirst();
    const total = Number(totalRow?.total ?? 0);
    const pagination = buildPaginationMeta({ page, pageSize, total });

    let dataQuery = baseQuery.select([
      "products.id",
      "products.name",
      "products.slug",
      "products.description",
      "products.base_price",
      "products.active",
      "products.in_stock",
      "products.category_id",
      "products.created_at",
      "categories.name as category_name"
    ]);

    if (sort === "price_asc") {
      dataQuery = dataQuery.orderBy("products.base_price asc");
    } else if (sort === "price_desc") {
      dataQuery = dataQuery.orderBy("products.base_price desc");
    } else if (sort === "name_asc") {
      dataQuery = dataQuery.orderBy("products.name asc");
    } else if (sort === "name_desc") {
      dataQuery = dataQuery.orderBy("products.name desc");
    } else {
      dataQuery = dataQuery.orderBy("products.created_at desc");
    }

    const rows = await dataQuery
      .limit(pagination.pageSize)
      .offset(pagination.offset)
      .execute();

    const productIds = rows.map((row) => row.id);
    const imageRows = productIds.length
      ? await db
          .selectFrom("product_images")
          .select(["product_id", "storage_path", "sort_order"])
          .where("product_id", "in", productIds)
          .orderBy("product_id asc")
          .orderBy("sort_order asc")
          .execute()
      : [];

    const firstImageByProductId = new Map<string, string>();
    for (const image of imageRows) {
      if (!firstImageByProductId.has(image.product_id)) {
        firstImageByProductId.set(image.product_id, image.storage_path);
      }
    }

    const storage = getStorageProvider();
    const items = rows.map((row) => {
      const thumbnailStoragePath = firstImageByProductId.get(row.id) ?? null;
      return {
        ...row,
        thumbnail_storage_path: thumbnailStoragePath,
        thumbnail_url: thumbnailStoragePath
          ? storage.getPublicUrl(thumbnailStoragePath)
          : null
      };
    });

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
    return internalError(error, { context: { route: "admin_products_get" } });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireBackofficeSession("admin");
    const payload = await request.json();
    const parsed = productSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const product = await getDb().insertInto("products").values(parsed.data).returningAll().executeTakeFirstOrThrow();

    await writeAuditLog({
      actorUserProfileId: admin.userId,
      action: "create",
      entity: "product",
      entityId: product.id,
      meta: { slug: product.slug }
    });

    return ok({ product });
  } catch (error) {
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    return internalError(error, { context: { route: "admin_products_post" } });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireBackofficeSession("admin");
    const payload = (await request.json()) as { id?: string } & Record<string, unknown>;
    if (!payload.id) {
      return badRequest("id is required");
    }

    const parsed = productSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const product = await getDb()
      .updateTable("products")
      .set(parsed.data)
      .where("id", "=", payload.id)
      .returningAll()
      .executeTakeFirstOrThrow();

    await writeAuditLog({
      actorUserProfileId: admin.userId,
      action: "update",
      entity: "product",
      entityId: product.id,
      meta: { slug: product.slug }
    });

    return ok({ product });
  } catch (error) {
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    return internalError(error, { context: { route: "admin_products_put" } });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireBackofficeSession("admin");
    const payload = (await request.json()) as { id?: string };
    if (!payload.id) {
      return badRequest("id is required");
    }

    await getDb().deleteFrom("products").where("id", "=", payload.id).execute();

    await writeAuditLog({
      actorUserProfileId: admin.userId,
      action: "delete",
      entity: "product",
      entityId: payload.id
    });

    return ok({ ok: true });
  } catch (error) {
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    return internalError(error, { context: { route: "admin_products_delete" } });
  }
}
