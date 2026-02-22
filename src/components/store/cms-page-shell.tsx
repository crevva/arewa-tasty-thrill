import { notFound } from "next/navigation";

import { MarkdownContent } from "@/components/store/markdown-content";
import { getCmsPageBySlug } from "@/server/cms/service";

export async function CmsPageShell({ slug }: { slug: string }) {
  const page = await getCmsPageBySlug(slug);
  if (!page) {
    notFound();
  }

  return (
    <section className="section-shell">
      <h1 className="h1">{page.title}</h1>
      <div className="mt-6 premium-card p-6 md:p-8">
        <MarkdownContent markdown={page.markdown} />
      </div>
    </section>
  );
}
