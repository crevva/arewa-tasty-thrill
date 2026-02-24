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
import { cmsPageSchema } from "@/lib/validators/admin";
import { badRequest, forbidden, internalError, ok } from "@/lib/utils/http";
import { writeAuditLog } from "@/server/admin/audit";

export async function GET(request: Request) {
  try {
    await requireBackofficeSession("admin");
    const searchParams = new URL(request.url).searchParams;
    const page = parsePage(searchParams);
    const pageSize = parsePageSize(searchParams);
    const q = searchParams.get("q")?.trim() ?? "";
    const sort = searchParams.get("sort") ?? "slug_asc";

    const db = getDb();
    const baseQuery = db
      .selectFrom("cms_pages")
      .$if(Boolean(q), (query) =>
        query.where((eb) =>
          eb.or([
            eb("cms_pages.slug", "ilike", `%${q}%`),
            eb("cms_pages.title", "ilike", `%${q}%`)
          ])
        )
      );

    const totalRow = await baseQuery
      .select(({ fn }) => fn.count<string>("cms_pages.id").as("total"))
      .executeTakeFirst();
    const total = Number(totalRow?.total ?? 0);
    const pagination = buildPaginationMeta({ page, pageSize, total });

    let dataQuery = baseQuery.selectAll();
    if (sort === "title_asc") {
      dataQuery = dataQuery.orderBy("title asc");
    } else if (sort === "title_desc") {
      dataQuery = dataQuery.orderBy("title desc");
    } else {
      dataQuery = dataQuery.orderBy("slug asc");
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
    return internalError(error, { context: { route: "admin_cms_pages_get" } });
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
    return internalError(error, { context: { route: "admin_cms_pages_put" } });
  }
}
