"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminDataTable } from "@/components/admin/data-table/AdminDataTable";
import { DrawerFormShell } from "@/components/admin/data-table/DrawerFormShell";
import type { PaginatedResponse, TableColumn } from "@/components/admin/data-table/types";
import { useAdminTableQuery } from "@/components/admin/data-table/useAdminTableQuery";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { useToast } from "@/components/feedback/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { requestJson } from "@/lib/http/client";
import { MESSAGES } from "@/lib/messages";
import { slugify } from "@/lib/utils/cn";

type CmsPageRow = {
  id: string;
  slug: string;
  title: string;
  seo_title: string | null;
  seo_description: string | null;
  markdown: string;
  published: boolean;
  updated_at: string;
};

const cmsFormSchema = z.object({
  slug: z.string().min(2, "Slug is required."),
  title: z.string().min(2, "Title is required."),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  markdown: z.string().min(3, "Page content is required."),
  published: z.boolean()
});

type CmsFormValues = z.infer<typeof cmsFormSchema>;

const defaultFormValues: CmsFormValues = {
  slug: "",
  title: "",
  seo_title: "",
  seo_description: "",
  markdown: "",
  published: false
};

function buildCmsUrl(queryString: string) {
  return queryString ? `/api/admin/cms-pages?${queryString}` : "/api/admin/cms-pages";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function CmsAdminClient() {
  const toast = useToast();
  const query = useAdminTableQuery({ defaultPageSize: 10, defaultSort: "slug_asc" });
  const [rows, setRows] = useState<CmsPageRow[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
    from: 0,
    to: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CmsPageRow | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<CmsFormValues>({
    resolver: zodResolver(cmsFormSchema),
    defaultValues: defaultFormValues
  });

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await requestJson<PaginatedResponse<CmsPageRow>>(
        buildCmsUrl(query.queryString),
        { method: "GET" },
        { context: "admin" }
      );
      setRows(payload.items);
      setMeta({
        page: payload.page,
        pageSize: payload.pageSize,
        total: payload.total,
        totalPages: payload.totalPages,
        from: payload.from ?? (payload.total ? (payload.page - 1) * payload.pageSize + 1 : 0),
        to: payload.to ?? Math.min(payload.page * payload.pageSize, payload.total)
      });
    } catch (caught) {
      setError((caught as Error).message ?? "Could not load CMS pages.");
    } finally {
      setLoading(false);
    }
  }, [query.queryString]);

  useEffect(() => {
    loadRows().catch((caught) => {
      setError((caught as Error).message ?? "Could not load CMS pages.");
    });
  }, [loadRows]);

  const openCreateDrawer = useCallback(() => {
    setEditing(null);
    form.reset(defaultFormValues);
    setDrawerOpen(true);
  }, [form]);

  const openEditDrawer = useCallback((row: CmsPageRow) => {
    setEditing(row);
    form.reset({
      slug: row.slug,
      title: row.title,
      seo_title: row.seo_title ?? "",
      seo_description: row.seo_description ?? "",
      markdown: row.markdown,
      published: row.published
    });
    setDrawerOpen(true);
  }, [form]);

  async function onSubmit(values: CmsFormValues) {
    setSaving(true);
    setError(null);
    try {
      await requestJson<{ page: CmsPageRow }>(
        "/api/admin/cms-pages",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: values.slug,
            title: values.title,
            seo_title: values.seo_title || undefined,
            seo_description: values.seo_description || undefined,
            markdown: values.markdown,
            published: values.published
          })
        },
        { context: "admin" }
      );
      toast.success(MESSAGES.admin.pageUpdated);
      setDrawerOpen(false);
      await loadRows();
    } catch (caught) {
      const message = (caught as Error).message ?? MESSAGES.admin.saveFailed;
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo<Array<TableColumn<CmsPageRow>>>(
    () => [
      {
        key: "page",
        header: "Page",
        render: (row) => (
          <div>
            <p className="font-semibold text-primary">{row.title}</p>
            <p className="text-xs text-muted-foreground">/{row.slug}</p>
          </div>
        )
      },
      {
        key: "published",
        header: "Status",
        render: (row) => (
          <Badge className={row.published ? "bg-green-700/15 text-green-700" : "bg-secondary text-muted-foreground"}>
            {row.published ? "Published" : "Draft"}
          </Badge>
        )
      },
      {
        key: "updated",
        header: "Updated",
        hideOnMobile: true,
        render: (row) => formatDate(row.updated_at)
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (row) => (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => openEditDrawer(row)} aria-label={`Edit ${row.title}`}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )
      }
    ],
    [openEditDrawer]
  );

  return (
    <>
      <AdminPageShell
        title="CMS Pages"
        subtitle="Edit storefront and legal copy from a structured page table."
        actions={
          <Button onClick={openCreateDrawer}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Add Page
          </Button>
        }
        toolbar={
          <div className="grid gap-2 md:grid-cols-3">
            <Input
              placeholder="Search slug or title"
              value={query.searchInput}
              onChange={(event) => query.setSearchInput(event.target.value)}
            />
            <Select value={query.sort || "slug_asc"} onChange={(event) => query.setSort(event.target.value)}>
              <option value="slug_asc">Slug A-Z</option>
              <option value="title_asc">Title A-Z</option>
              <option value="title_desc">Title Z-A</option>
            </Select>
            <div className="flex items-center justify-end text-sm text-muted-foreground">
              Showing {meta.from}-{meta.to} of {meta.total}
            </div>
          </div>
        }
      >
        {error ? (
          <div className="mb-3">
            <InlineNotice type="error" title={error} />
          </div>
        ) : null}

        <AdminDataTable
          columns={columns}
          items={rows}
          loading={loading}
          rowKey={(row) => row.id}
          page={meta.page}
          pageSize={meta.pageSize}
          total={meta.total}
          totalPages={meta.totalPages}
          from={meta.from}
          to={meta.to}
          onPageChange={query.setPage}
          onPageSizeChange={query.setPageSize}
          emptyTitle="No CMS pages found"
          emptyDescription="Create a page to manage storefront and legal content."
        />
      </AdminPageShell>

      <DrawerFormShell
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit Page" : "Add Page"}
        description="Update published content and SEO metadata."
      >
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cmsTitle">Title</Label>
              <Input
                id="cmsTitle"
                {...form.register("title")}
                onChange={(event) => {
                  form.setValue("title", event.target.value, { shouldValidate: true });
                  if (!editing) {
                    form.setValue("slug", slugify(event.target.value), { shouldValidate: true });
                  }
                }}
              />
              {form.formState.errors.title ? (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cmsSlug">Slug</Label>
              <Input id="cmsSlug" {...form.register("slug")} disabled={Boolean(editing)} />
              {form.formState.errors.slug ? (
                <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
              ) : null}
              {editing ? <p className="text-xs text-muted-foreground">Slug is locked for existing pages.</p> : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cmsSeoTitle">SEO title</Label>
            <Input id="cmsSeoTitle" {...form.register("seo_title")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cmsSeoDescription">SEO description</Label>
            <Input id="cmsSeoDescription" {...form.register("seo_description")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cmsMarkdown">Markdown content</Label>
            <Textarea id="cmsMarkdown" rows={12} {...form.register("markdown")} />
            {form.formState.errors.markdown ? (
              <p className="text-xs text-destructive">{form.formState.errors.markdown.message}</p>
            ) : null}
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <Switch checked={form.watch("published")} onCheckedChange={(checked) => form.setValue("published", checked)} />
            Published
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
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
        </form>
      </DrawerFormShell>
    </>
  );
}
