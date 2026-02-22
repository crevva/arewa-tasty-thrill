import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { parseFrontmatter } from "@/content/markdown";

export function MarkdownContent({ markdown }: { markdown: string }) {
  const parsed = parseFrontmatter(markdown);

  return (
    <article className="prose prose-slate max-w-none prose-headings:font-heading prose-headings:text-primary prose-p:text-muted-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {parsed.content}
      </ReactMarkdown>
    </article>
  );
}
