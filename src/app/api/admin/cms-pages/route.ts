import { getDb } from "@/lib/db";
import {
  isBackofficeAccessError,
  requireBackofficeSession
} from "@/lib/security/admin";
import { cmsPageSchema } from "@/lib/validators/admin";
import { badRequest, forbidden, internalError, ok } from "@/lib/utils/http";
import { writeAuditLog } from "@/server/admin/audit";

export async function GET() {
  try {
    await requireBackofficeSession("admin");
    const pages = await getDb().selectFrom("cms_pages").selectAll().orderBy("slug asc").execute();
    return ok({ pages });
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
    const payload = await request.json();
    const parsed = cmsPageSchema.safeParse(payload);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const page = await getDb()
      .insertInto("cms_pages")
      .values({
        ...parsed.data,
        updated_at: new Date()
      })
      .onConflict((oc) =>
        oc.column("slug").doUpdateSet({
          title: parsed.data.title,
          seo_title: parsed.data.seo_title ?? null,
          seo_description: parsed.data.seo_description ?? null,
          markdown: parsed.data.markdown,
          published: parsed.data.published,
          updated_at: new Date()
        })
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    await writeAuditLog({
      actorUserProfileId: admin.userId,
      action: "upsert",
      entity: "cms_page",
      entityId: page.id,
      meta: { slug: page.slug }
    });

    return ok({ page });
  } catch (error) {
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    return internalError(error);
  }
}
