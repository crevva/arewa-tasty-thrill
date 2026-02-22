"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CmsPage = {
  id: string;
  slug: string;
  title: string;
  seo_title: string | null;
  seo_description: string | null;
  markdown: string;
  published: boolean;
};

export function CmsAdminClient() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [selected, setSelected] = useState<string>("home");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/cms-pages");
    const payload = (await response.json()) as { pages?: CmsPage[]; error?: string };
    if (!response.ok || !payload.pages) {
      setError(payload.error ?? "Unable to load CMS pages");
      return;
    }
    setPages(payload.pages);
    if (!payload.pages.some((page) => page.slug === selected) && payload.pages[0]) {
      setSelected(payload.pages[0].slug);
    }
  }, [selected]);

  useEffect(() => {
    load().catch(() => setError("Unable to load CMS pages"));
  }, [load]);

  const page = pages.find((entry) => entry.slug === selected);

  if (!page) {
    return <p className="text-sm text-muted-foreground">No CMS pages found.</p>;
  }

  return (
    <div className="space-y-4">
      <Select value={selected} onChange={(event) => setSelected(event.target.value)}>
        {pages.map((entry) => (
          <option key={entry.slug} value={entry.slug}>
            {entry.slug}
          </option>
        ))}
      </Select>

      <div className="premium-card space-y-3 p-4">
        <Input
          value={page.title}
          onChange={(event) =>
            setPages((rows) =>
              rows.map((row) =>
                row.slug === page.slug ? { ...row, title: event.target.value } : row
              )
            )
          }
        />
        <Input
          value={page.seo_title ?? ""}
          placeholder="SEO title"
          onChange={(event) =>
            setPages((rows) =>
              rows.map((row) =>
                row.slug === page.slug ? { ...row, seo_title: event.target.value } : row
              )
            )
          }
        />
        <Input
          value={page.seo_description ?? ""}
          placeholder="SEO description"
          onChange={(event) =>
            setPages((rows) =>
              rows.map((row) =>
                row.slug === page.slug ? { ...row, seo_description: event.target.value } : row
              )
            )
          }
        />
        <Textarea
          value={page.markdown}
          onChange={(event) =>
            setPages((rows) =>
              rows.map((row) =>
                row.slug === page.slug ? { ...row, markdown: event.target.value } : row
              )
            )
          }
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={page.published}
            onChange={(event) =>
              setPages((rows) =>
                rows.map((row) =>
                  row.slug === page.slug ? { ...row, published: event.target.checked } : row
                )
              )
            }
          />
          Published
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button
          onClick={async () => {
            const response = await fetch("/api/admin/cms-pages", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                slug: page.slug,
                title: page.title,
                seo_title: page.seo_title ?? undefined,
                seo_description: page.seo_description ?? undefined,
                markdown: page.markdown,
                published: page.published
              })
            });

            const payload = (await response.json()) as { error?: string };
            if (!response.ok) {
              setError(payload.error ?? "Unable to save page");
              return;
            }

            await load();
          }}
        >
          Save page
        </Button>
      </div>
    </div>
  );
}
