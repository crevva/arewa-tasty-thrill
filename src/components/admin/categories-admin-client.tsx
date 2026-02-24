"use client";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminDataTable } from "@/components/admin/data-table/AdminDataTable";
import { ConfirmDialog } from "@/components/admin/data-table/ConfirmDialog";
import { DrawerFormShell } from "@/components/admin/data-table/DrawerFormShell";
import type { PaginatedResponse, TableColumn } from "@/components/admin/data-table/types";
import { useAdminTableQuery } from "@/components/admin/data-table/useAdminTableQuery";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { useToast } from "@/components/feedback/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { requestJson } from "@/lib/http/client";
import { MESSAGES } from "@/lib/messages";
import { slugify } from "@/lib/utils/cn";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
};

const categoryFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  slug: z.string().min(2, "Slug must be at least 2 characters.")
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

function buildCategoriesUrl(queryString: string) {
  return queryString ? `/api/admin/categories?${queryString}` : "/api/admin/categories";
}

export function CategoriesAdminClient() {
  const toast = useToast();
  const query = useAdminTableQuery({ defaultPageSize: 10, defaultSort: "name_asc" });
  const [rows, setRows] = useState<CategoryRow[]>([]);
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
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "", slug: "" }
  });

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await requestJson<PaginatedResponse<CategoryRow>>(
        buildCategoriesUrl(query.queryString),
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
      setError((caught as Error).message ?? "Could not load categories.");
    } finally {
      setLoading(false);
    }
  }, [query.queryString]);

  useEffect(() => {
    loadRows().catch((caught) => {
      setError((caught as Error).message ?? "Could not load categories.");
    });
  }, [loadRows]);

  const openCreateDrawer = useCallback(() => {
    setEditing(null);
    form.reset({ name: "", slug: "" });
    setDrawerOpen(true);
  }, [form]);

  const openEditDrawer = useCallback((row: CategoryRow) => {
    setEditing(row);
    form.reset({ name: row.name, slug: row.slug });
    setDrawerOpen(true);
  }, [form]);

  async function onSubmit(values: CategoryFormValues) {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await requestJson<{ category: CategoryRow }>(
          "/api/admin/categories",
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editing.id, ...values })
          },
          { context: "admin" }
        );
        toast.success(MESSAGES.admin.categoryUpdated);
      } else {
        await requestJson<{ category: CategoryRow }>(
          "/api/admin/categories",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values)
          },
          { context: "admin" }
        );
        toast.success(MESSAGES.admin.categoryCreated);
      }

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

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await requestJson<{ ok: boolean }>(
        "/api/admin/categories",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: deleteTarget.id })
        },
        { context: "admin" }
      );
      toast.success(MESSAGES.admin.categoryDeleted);
      setDeleteTarget(null);
      await loadRows();
    } catch (caught) {
      const message = (caught as Error).message ?? MESSAGES.admin.saveFailed;
      setError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  const columns = useMemo<Array<TableColumn<CategoryRow>>>(
    () => [
      {
        key: "name",
        header: "Name",
        render: (row) => (
          <div>
            <p className="font-semibold text-primary">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.slug}</p>
          </div>
        )
      },
      {
        key: "slug",
        header: "Slug",
        hideOnMobile: true,
        render: (row) => row.slug
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (row) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => openEditDrawer(row)} aria-label={`Edit ${row.name}`}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(row)}
              aria-label={`Delete ${row.name}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
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
        title="Categories"
        subtitle="Keep categories tidy for a better storefront browsing experience."
        actions={
          <Button onClick={openCreateDrawer}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Add Category
          </Button>
        }
        toolbar={
          <div className="grid gap-2 md:grid-cols-3">
            <Input
              placeholder="Search by name or slug"
              value={query.searchInput}
              onChange={(event) => query.setSearchInput(event.target.value)}
            />
            <Select value={query.sort || "name_asc"} onChange={(event) => query.setSort(event.target.value)}>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="newest">Newest</option>
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
          emptyTitle="No categories yet"
          emptyDescription="Add categories to organize the shop."
        />
      </AdminPageShell>

      <DrawerFormShell
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit Category" : "Add Category"}
        description="Create or update category details."
      >
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="categoryName">Name</Label>
            <Input
              id="categoryName"
              {...form.register("name")}
              onChange={(event) => {
                form.setValue("name", event.target.value, { shouldValidate: true });
                if (!editing) {
                  form.setValue("slug", slugify(event.target.value), { shouldValidate: true });
                }
              }}
            />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="categorySlug">Slug</Label>
            <Input id="categorySlug" {...form.register("slug")} />
            {form.formState.errors.slug ? (
              <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
            ) : null}
          </div>

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
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </DrawerFormShell>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this category?"
        description="Delete this category? This cannot be undone."
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        destructive
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          handleDelete().catch(() => undefined);
        }}
      />
    </>
  );
}
