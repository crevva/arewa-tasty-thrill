export type ParsedMarkdown = {
  frontmatter: Record<string, string>;
  content: string;
};

export function parseFrontmatter(markdown: string): ParsedMarkdown {
  if (!markdown.startsWith("---\n")) {
    return { frontmatter: {}, content: markdown };
  }

  const end = markdown.indexOf("\n---\n", 4);
  if (end < 0) {
    return { frontmatter: {}, content: markdown };
  }

  const raw = markdown.slice(4, end);
  const content = markdown.slice(end + 5);
  const frontmatter: Record<string, string> = {};

  for (const line of raw.split("\n")) {
    const [key, ...rest] = line.split(":");
    if (!key || rest.length === 0) {
      continue;
    }
    frontmatter[key.trim()] = rest.join(":").trim();
  }

  return { frontmatter, content };
}
