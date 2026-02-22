import { getDb } from "@/lib/db";
import { requireAdminSession } from "@/lib/security/admin";
import { productSchema } from "@/lib/validators/admin";
import { badRequest, forbidden, internalError, ok } from "@/lib/utils/http";
import { writeAuditLog } from "@/server/admin/audit";

export async function GET() {
  try {
    await requireAdminSession();
    const products = await getDb()
      .selectFrom("products")
      .innerJoin("categories", "categories.id", "products.category_id")
      .select([
        "products.id",
        "products.name",
        "products.slug",
        "products.description",
        "products.base_price",
        "products.active",
        "products.in_stock",
        "products.category_id",
        "categories.name as category_name"
      ])
      .orderBy("products.created_at desc")
      .execute();

    return ok({ products });
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

    await getDb().deleteFrom("products").where("id", "=", payload.id).execute();

    await writeAuditLog({
      actorUserProfileId: admin.userId,
      action: "delete",
      entity: "product",
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
