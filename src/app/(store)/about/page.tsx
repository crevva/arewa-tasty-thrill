import { notFound } from "next/navigation";

import { MarkdownContent } from "@/components/store/markdown-content";
import { getCmsPageBySlug } from "@/server/cms/service";

export default async function AboutPage() {
  const page = await getCmsPageBySlug("about");
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
