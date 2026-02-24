"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { InlineNotice } from "@/components/feedback/inline-notice";
import { useToast } from "@/components/feedback/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MESSAGES } from "@/lib/messages";

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
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

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
    load()
      .catch(() => setError("Unable to load CMS pages"))
      .finally(() => setInitialLoading(false));
  }, [load]);

  if (initialLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="premium-card space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-md" />
          ))}
          <Skeleton className="h-28 w-full rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
      </div>
    );
  }

  const page = pages.find((entry) => entry.slug === selected);

  if (!page) {
    return <p className="text-sm text-muted-foreground">No CMS pages found.</p>;
  }

  return (
    <div className="space-y-4">
      <Select value={selected} onChange={(event) => setSelected(event.target.value)} disabled={saving}>
        {pages.map((entry) => (
          <option key={entry.slug} value={entry.slug}>
            {entry.slug}
          </option>
        ))}
      </Select>

      <div className="premium-card space-y-3 p-4">
        <Input
          value={page.title}
          disabled={saving}
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
          disabled={saving}
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
          disabled={saving}
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
          disabled={saving}
          onChange={(event) =>
            setPages((rows) =>
              rows.map((row) =>
                row.slug === page.slug ? { ...row, markdown: event.target.value } : row
              )
            )
          }
        />
        <div className="flex items-center gap-2 text-sm">
          <Switch
            checked={page.published}
            disabled={saving}
            onCheckedChange={(checked) =>
              setPages((rows) =>
                rows.map((row) =>
                  row.slug === page.slug ? { ...row, published: checked } : row
                )
              )
            }
            aria-label={`Toggle published state for ${page.slug}`}
          />
          <span>Published</span>
        </div>

        {error ? <InlineNotice type="error" title={error} /> : null}

        <Button
          disabled={saving}
          onClick={async () => {
            setError(null);
            setSaving(true);
            try {
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
              toast.success(MESSAGES.admin.pageUpdated);
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Unable to save page");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Saving...
            </span>
          ) : (
            "Save page"
          )}
        </Button>
      </div>
    </div>
  );
}
