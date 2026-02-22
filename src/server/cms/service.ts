import type { CmsPage } from "@/content/types";
import { getDb } from "@/lib/db";

export async function getCmsPageBySlug(slug: string) {
  const row = await getDb()
    .selectFrom("cms_pages")
    .selectAll()
    .where("slug", "=", slug)
    .where("published", "=", true)
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  const page: CmsPage = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    markdown: row.markdown,
    published: row.published,
    updatedAt: row.updated_at.toISOString()
  };

  return page;
}

export async function listCmsPages() {
  const rows = await getDb().selectFrom("cms_pages").selectAll().orderBy("slug asc").execute();
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    markdown: row.markdown,
    published: row.published,
    updatedAt: row.updated_at.toISOString()
  })) satisfies CmsPage[];
}
