"use client";

import Image from "next/image";
import { Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminDataTable } from "@/components/admin/data-table/AdminDataTable";
import { ConfirmDialog } from "@/components/admin/data-table/ConfirmDialog";
import { DrawerFormShell } from "@/components/admin/data-table/DrawerFormShell";
import { useAdminTableQuery } from "@/components/admin/data-table/useAdminTableQuery";
import type { PaginatedResponse, TableColumn } from "@/components/admin/data-table/types";
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
import { formatCurrency, slugify } from "@/lib/utils/cn";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  base_price: number;
  active: boolean;
  in_stock: boolean;
  category_id: string;
  category_name: string;
  created_at: string;
  thumbnail_storage_path: string | null;
  thumbnail_url: string | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

const productFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  slug: z.string().min(2, "Slug must be at least 2 characters."),
  description: z.string().min(6, "Description must be at least 6 characters."),
  basePriceNaira: z.string().min(1, "Price is required."),
  categoryId: z.string().uuid("Select a valid category."),
  active: z.boolean(),
  inStock: z.boolean()
});

type ProductFormValues = z.infer<typeof productFormSchema>;

function sanitizeMoneyInput(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) {
    return "";
  }

  const [whole, ...decimals] = cleaned.split(".");
  if (decimals.length === 0) {
    return whole;
  }

  return `${whole}.${decimals.join("").slice(0, 2)}`;
}

function parseNairaToKobo(value: string) {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.round(amount * 100);
}

function formatKoboToNaira(value: number) {
  return (value / 100).toFixed(2);
}

function buildProductsUrl(queryString: string) {
  return queryString ? `/api/admin/products?${queryString}` : "/api/admin/products";
}

export function ProductsAdminClient() {
  const toast = useToast();
  const query = useAdminTableQuery({ defaultPageSize: 10, defaultSort: "newest" });

  const [rows, setRows] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeFilter = query.getFilter("active");
  const stockFilter = query.getFilter("inStock");
  const categoryFilter = query.getFilter("categoryId");

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      basePriceNaira: "",
      categoryId: "",
      active: true,
      inStock: true
    }
  });

  const loadCategories = useCallback(async () => {
    const payload = await requestJson<PaginatedResponse<Category>>(
      "/api/admin/categories?page=1&pageSize=50&sort=name_asc",
      { method: "GET" },
      { context: "admin" }
    );
    setCategories(payload.items);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await requestJson<PaginatedResponse<ProductRow>>(
        buildProductsUrl(query.queryString),
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
      setError((caught as Error).message ?? "Could not load products.");
    } finally {
      setLoading(false);
    }
  }, [query.queryString]);

  useEffect(() => {
    loadCategories().catch((caught) => {
      setError((caught as Error).message ?? "Could not load categories.");
    });
  }, [loadCategories]);

  useEffect(() => {
    loadProducts().catch((caught) => {
      setError((caught as Error).message ?? "Could not load products.");
    });
  }, [loadProducts]);

  const openCreateDrawer = useCallback(() => {
    setEditing(null);
    form.reset({
      name: "",
      slug: "",
      description: "",
      basePriceNaira: "",
      categoryId: categories[0]?.id ?? "",
      active: true,
      inStock: true
    });
    setDrawerOpen(true);
  }, [categories, form]);

  const openEditDrawer = useCallback((row: ProductRow) => {
    setEditing(row);
    form.reset({
      name: row.name,
      slug: row.slug,
      description: row.description,
      basePriceNaira: formatKoboToNaira(row.base_price),
      categoryId: row.category_id,
      active: row.active,
      inStock: row.in_stock
    });
    setDrawerOpen(true);
  }, [form]);

  async function onSubmit(values: ProductFormValues) {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: values.name,
        slug: values.slug,
        description: values.description,
        base_price: parseNairaToKobo(values.basePriceNaira),
        active: values.active,
        in_stock: values.inStock,
        category_id: values.categoryId
      };

      if (editing) {
        await requestJson<{ product: ProductRow }>(
          "/api/admin/products",
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editing.id, ...payload })
          },
          { context: "admin" }
        );
        toast.success(MESSAGES.admin.productUpdated);
      } else {
        await requestJson<{ product: ProductRow }>(
          "/api/admin/products",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          },
          { context: "admin" }
        );
        toast.success(MESSAGES.admin.productCreated);
      }

      setDrawerOpen(false);
      await loadProducts();
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
        "/api/admin/products",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: deleteTarget.id })
        },
        { context: "admin" }
      );

      toast.success(MESSAGES.admin.productDeleted);
      setDeleteTarget(null);
      await loadProducts();
    } catch (caught) {
      const message = (caught as Error).message ?? MESSAGES.admin.saveFailed;
      setError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  async function uploadImage(productId: string, file: File) {
    setUploadingImage(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("productId", productId);

      await requestJson<{ storagePath: string; publicUrl: string }>(
        "/api/admin/products/upload",
        {
          method: "POST",
          body: formData
        },
        { context: "upload", timeoutMs: 25_000 }
      );
      toast.success(MESSAGES.admin.imageUploaded);
      await loadProducts();
    } catch (caught) {
      const message = (caught as Error).message ?? "Upload failed. Check file size and try again.";
      setError(message);
      toast.error(message);
    } finally {
      setUploadingImage(false);
    }
  }

  const columns = useMemo<Array<TableColumn<ProductRow>>>(
    () => [
      {
        key: "thumbnail",
        header: "",
        className: "w-16",
        render: (row) => (
          <div className="relative h-10 w-10 overflow-hidden rounded-md border border-border">
            {row.thumbnail_url ? (
              <Image src={row.thumbnail_url} alt={row.name} fill className="object-cover" />
            ) : (
              <div className="h-full w-full bg-secondary" />
            )}
          </div>
        )
      },
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
        key: "category",
        header: "Category",
        hideOnMobile: true,
        render: (row) => row.category_name
      },
      {
        key: "price",
        header: "Price",
        className: "whitespace-nowrap",
        render: (row) => formatCurrency(row.base_price)
      },
      {
        key: "active",
        header: "Active",
        hideOnMobile: true,
        render: (row) => (
          <Badge
            className={row.active ? "bg-green-700/15 text-green-700" : "bg-secondary text-muted-foreground"}
          >
            {row.active ? "Active" : "Inactive"}
          </Badge>
        )
      },
      {
        key: "stock",
        header: "In stock",
        hideOnMobile: true,
        render: (row) => (
          <Badge
            className={row.in_stock ? "bg-green-700/15 text-green-700" : "bg-secondary text-muted-foreground"}
          >
            {row.in_stock ? "In stock" : "Out"}
          </Badge>
        )
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (row) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditDrawer(row)}
              aria-label={`Edit ${row.name}`}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(row);
                setDrawerOpen(true);
                form.reset({
                  name: row.name,
                  slug: row.slug,
                  description: row.description,
                  basePriceNaira: formatKoboToNaira(row.base_price),
                  categoryId: row.category_id,
                  active: row.active,
                  inStock: row.in_stock
                });
                window.setTimeout(() => fileInputRef.current?.click(), 100);
              }}
              aria-label={`Upload image for ${row.name}`}
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
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
    [form, openEditDrawer]
  );

  return (
    <>
      <AdminPageShell
        title="Products"
        subtitle="Manage your catalog with quick search, filters, and drawer editing."
        actions={
          <Button onClick={openCreateDrawer}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Add Product
          </Button>
        }
        toolbar={
          <div className="grid gap-2 md:grid-cols-5">
            <Input
              placeholder="Search by name or slug"
              value={query.searchInput}
              onChange={(event) => query.setSearchInput(event.target.value)}
            />
            <Select
              value={categoryFilter || "all"}
              onChange={(event) =>
                query.setFilter(
                  "categoryId",
                  event.target.value === "all" ? null : event.target.value
                )
              }
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Select
              value={activeFilter || "all"}
              onChange={(event) =>
                query.setFilter("active", event.target.value === "all" ? null : event.target.value)
              }
            >
              <option value="all">All active states</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
            <Select
              value={stockFilter || "all"}
              onChange={(event) =>
                query.setFilter("inStock", event.target.value === "all" ? null : event.target.value)
              }
            >
              <option value="all">All stock states</option>
              <option value="true">In stock</option>
              <option value="false">Out of stock</option>
            </Select>
            <Select value={query.sort || "newest"} onChange={(event) => query.setSort(event.target.value)}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price low-high</option>
              <option value="price_desc">Price high-low</option>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
            </Select>
          </div>
        }
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>
            Showing {meta.from}-{meta.to} of {meta.total}
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="toolbarPageSize" className="text-xs">
              Rows
            </label>
            <Select
              id="toolbarPageSize"
              value={String(query.pageSize)}
              onChange={(event) => query.setPageSize(Number.parseInt(event.target.value, 10))}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </Select>
          </div>
        </div>

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
          emptyTitle="No products yet"
          emptyDescription="Create your first product to start selling."
        />
      </AdminPageShell>

      <DrawerFormShell
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit Product" : "Add Product"}
        description="Use this form to create or update product details."
      >
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
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
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" {...form.register("slug")} />
            {form.formState.errors.slug ? (
              <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={4} {...form.register("description")} />
            {form.formState.errors.description ? (
              <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Price (NGN)</Label>
              <Input
                id="price"
                value={form.watch("basePriceNaira")}
                onChange={(event) =>
                  form.setValue("basePriceNaira", sanitizeMoneyInput(event.target.value), {
                    shouldValidate: true
                  })
                }
              />
              {form.formState.errors.basePriceNaira ? (
                <p className="text-xs text-destructive">{form.formState.errors.basePriceNaira.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select id="category" {...form.register("categoryId")}>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              {form.formState.errors.categoryId ? (
                <p className="text-xs text-destructive">{form.formState.errors.categoryId.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <Switch
                checked={form.watch("active")}
                onCheckedChange={(checked) => form.setValue("active", checked)}
                aria-label="Toggle active status"
              />
              Active
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <Switch
                checked={form.watch("inStock")}
                onCheckedChange={(checked) => form.setValue("inStock", checked)}
                aria-label="Toggle stock status"
              />
              In stock
            </label>
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="text-sm font-semibold text-primary">Product image</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload one image at a time. The first image appears as the product thumbnail.
            </p>
            <div className="mt-3 flex items-center gap-3">
              {editing?.thumbnail_url ? (
                <div className="relative h-14 w-14 overflow-hidden rounded-md border border-border">
                  <Image src={editing.thumbnail_url} alt={editing.name} fill className="object-cover" />
                </div>
              ) : (
                <div className="h-14 w-14 rounded-md border border-dashed border-border bg-secondary/50" />
              )}
              <Button
                type="button"
                variant="outline"
                disabled={!editing || uploadingImage}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingImage ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  "Upload image"
                )}
              </Button>
            </div>
            {!editing ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Save the product first, then upload images.
              </p>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file || !editing) {
                  return;
                }
                uploadImage(editing.id, file).catch(() => undefined);
                event.currentTarget.value = "";
              }}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
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
        title="Delete this product?"
        description="Delete this product? This cannot be undone."
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
