import { describe, expect, it } from "vitest";

import { parseFrontmatter } from "@/content/markdown";

describe("parseFrontmatter", () => {
  it("parses yaml-like frontmatter and body", () => {
    const markdown = `---\ntitle: Hello\ndescription: World\n---\n# Heading`;
    const parsed = parseFrontmatter(markdown);

    expect(parsed.frontmatter.title).toBe("Hello");
    expect(parsed.frontmatter.description).toBe("World");
    expect(parsed.content.trim()).toBe("# Heading");
  });
});
