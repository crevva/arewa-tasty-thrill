import { getDb } from "@/lib/db";
import { getStorageProvider } from "@/storage";
import { requireAdminSession } from "@/lib/security/admin";
import { badRequest, forbidden, internalError, ok } from "@/lib/utils/http";
import { writeAuditLog } from "@/server/admin/audit";

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession();
    const formData = await request.formData();
    const file = formData.get("file");
    const productId = formData.get("productId");

    if (!(file instanceof File) || typeof productId !== "string") {
      return badRequest("file and productId are required");
    }

    const buffer = await file.arrayBuffer();
    const storage = getStorageProvider();
    const uploaded = await storage.uploadProductImage({
      fileName: file.name,
      fileBuffer: buffer,
      contentType: file.type,
      folder: "products"
    });

    const nextSort = await getDb()
      .selectFrom("product_images")
      .select(({ fn }) => fn.max("sort_order").as("max_sort"))
      .where("product_id", "=", productId)
      .executeTakeFirst();

    await getDb()
      .insertInto("product_images")
      .values({
        product_id: productId,
        storage_path: uploaded.storagePath,
        sort_order: (nextSort?.max_sort ?? -1) + 1
      })
      .execute();

    await writeAuditLog({
      actorUserProfileId: admin.userId,
      action: "upload_image",
      entity: "product",
      entityId: productId,
      meta: { storagePath: uploaded.storagePath }
    });

    return ok({ storagePath: uploaded.storagePath, publicUrl: uploaded.publicUrl });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Admin access required")) {
      return forbidden();
    }
    return internalError(error);
  }
}
