"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { InlineNotice } from "@/components/feedback/inline-notice";
import { useToast } from "@/components/feedback/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { MESSAGES } from "@/lib/messages";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  base_price: number;
  active: boolean;
  in_stock: boolean;
  category_id: string;
  category_name: string;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

const DEFAULT_NAIRA_INPUT = "0.00";

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

export function ProductsAdminClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const toast = useToast();

  const defaultCategory = categories[0]?.id ?? "";

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    base_price: DEFAULT_NAIRA_INPUT,
    active: true,
    in_stock: true,
    category_id: ""
  });

  async function load() {
    const [productsRes, categoriesRes] = await Promise.all([
      fetch("/api/admin/products"),
      fetch("/api/admin/categories")
    ]);

    const productPayload = (await productsRes.json()) as { products?: Product[]; error?: string };
    const categoryPayload = (await categoriesRes.json()) as { categories?: Category[]; error?: string };

    if (!productsRes.ok || !categoryPayload.categories || !productPayload.products) {
      setError(productPayload.error ?? categoryPayload.error ?? "Unable to load data");
      return;
    }

    setProducts(productPayload.products);
    setPriceDrafts(
      Object.fromEntries(
        productPayload.products.map((product) => [product.id, formatKoboToNaira(product.base_price)])
      )
    );
    setCategories(categoryPayload.categories);
  }

  useEffect(() => {
    load()
      .catch(() => setError("Unable to load products"))
      .finally(() => setInitialLoading(false));
  }, []);

  useEffect(() => {
    if (!form.category_id && defaultCategory) {
      setForm((current) => ({ ...current, category_id: defaultCategory }));
    }
  }, [defaultCategory, form.category_id]);

  function setProductPriceDraft(productId: string, rawValue: string) {
    const sanitized = sanitizeMoneyInput(rawValue);
    setPriceDrafts((current) => ({ ...current, [productId]: sanitized }));

    setProducts((rows) =>
      rows.map((row) =>
        row.id === productId
          ? { ...row, base_price: parseNairaToKobo(sanitized || "0") }
          : row
      )
    );
  }

  const productRows = useMemo(() => products, [products]);

  function isRowBusy(productId: string) {
    return (
      busyKey === `save:${productId}` ||
      busyKey === `upload:${productId}` ||
      busyKey === `delete:${productId}`
    );
  }

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="premium-card grid gap-3 p-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-md" />
          ))}
          <Skeleton className="h-10 w-40 rounded-md md:col-span-2" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="premium-card space-y-3 p-4">
              <div className="grid gap-2 md:grid-cols-2">
                {Array.from({ length: 6 }).map((__, innerIndex) => (
                  <Skeleton key={innerIndex} className="h-10 w-full rounded-md" />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-10 w-20 rounded-md" />
                <Skeleton className="h-10 w-28 rounded-md" />
                <Skeleton className="h-10 w-24 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form
        className="premium-card grid gap-3 p-4 md:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setBusyKey("create");

          try {
            const response = await fetch("/api/admin/products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...form,
                base_price: parseNairaToKobo(form.base_price || "0")
              })
            });

            const payload = (await response.json()) as { error?: string };
            if (!response.ok) {
              setError(payload.error ?? "Unable to create product");
              return;
            }

            setForm({
              name: "",
              slug: "",
              description: "",
              base_price: DEFAULT_NAIRA_INPUT,
              active: true,
              in_stock: true,
              category_id: defaultCategory
            });
            await load();
            toast.success(MESSAGES.admin.productCreated);
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to create product");
          } finally {
            setBusyKey(null);
          }
        }}
      >
        <Input
          placeholder="Name"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          disabled={busyKey === "create"}
          required
        />
        <Input
          placeholder="Slug"
          value={form.slug}
          onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
          disabled={busyKey === "create"}
          required
        />
        <Input
          placeholder="Description"
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          disabled={busyKey === "create"}
          required
        />
        <Input
          placeholder="Base price (NGN)"
          type="text"
          inputMode="decimal"
          value={form.base_price}
          onChange={(event) => {
            const sanitized = sanitizeMoneyInput(event.target.value);
            setForm((current) => ({ ...current, base_price: sanitized }));
          }}
          disabled={busyKey === "create"}
          required
        />
        <Select
          value={form.category_id}
          onChange={(event) => setForm((current) => ({ ...current, category_id: event.target.value }))}
          disabled={busyKey === "create"}
          required
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-xs">
            <Switch
              checked={form.active}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, active: checked }))}
              aria-label="Toggle active state for new product"
              disabled={busyKey === "create"}
            />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Switch
              checked={form.in_stock}
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, in_stock: checked }))
              }
              aria-label="Toggle stock state for new product"
              disabled={busyKey === "create"}
            />
            <span>In stock</span>
          </div>
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={busyKey === "create"}>
            {busyKey === "create" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Creating...
              </span>
            ) : (
              "Create product"
            )}
          </Button>
        </div>
      </form>

      {error ? <InlineNotice type="error" title={error} /> : null}

      <div className="space-y-3">
        {productRows.map((product) => (
          <article key={product.id} className="premium-card space-y-3 p-4">
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                value={product.name}
                disabled={isRowBusy(product.id)}
                onChange={(event) =>
                  setProducts((rows) =>
                    rows.map((row) =>
                      row.id === product.id ? { ...row, name: event.target.value } : row
                    )
                  )
                }
              />
              <Input
                value={product.slug}
                disabled={isRowBusy(product.id)}
                onChange={(event) =>
                  setProducts((rows) =>
                    rows.map((row) =>
                      row.id === product.id ? { ...row, slug: event.target.value } : row
                    )
                  )
                }
              />
              <Input
                value={product.description}
                disabled={isRowBusy(product.id)}
                onChange={(event) =>
                  setProducts((rows) =>
                    rows.map((row) =>
                      row.id === product.id ? { ...row, description: event.target.value } : row
                    )
                  )
                }
              />
              <Input
                type="text"
                inputMode="decimal"
                value={priceDrafts[product.id] ?? formatKoboToNaira(product.base_price)}
                disabled={isRowBusy(product.id)}
                onChange={(event) => setProductPriceDraft(product.id, event.target.value)}
              />
              <Select
                value={product.category_id}
                disabled={isRowBusy(product.id)}
                onChange={(event) =>
                  setProducts((rows) =>
                    rows.map((row) =>
                      row.id === product.id ? { ...row, category_id: event.target.value } : row
                    )
                  )
                }
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={product.active}
                    disabled={isRowBusy(product.id)}
                    onCheckedChange={(checked) =>
                      setProducts((rows) =>
                        rows.map((row) =>
                          row.id === product.id ? { ...row, active: checked } : row
                        )
                      )
                    }
                    aria-label={`Toggle active state for ${product.name}`}
                  />
                  <span>Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={product.in_stock}
                    disabled={isRowBusy(product.id)}
                    onCheckedChange={(checked) =>
                      setProducts((rows) =>
                        rows.map((row) =>
                          row.id === product.id ? { ...row, in_stock: checked } : row
                        )
                      )
                    }
                    aria-label={`Toggle stock state for ${product.name}`}
                  />
                  <span>In stock</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={isRowBusy(product.id)}
                onClick={async () => {
                  setError(null);
                  setBusyKey(`save:${product.id}`);
                  try {
                    const response = await fetch("/api/admin/products", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(product)
                    });
                    const payload = (await response.json()) as { error?: string };
                    if (!response.ok) {
                      setError(payload.error ?? "Unable to update product");
                      return;
                    }
                    await load();
                    toast.success(MESSAGES.admin.productUpdated);
                  } catch (caught) {
                    setError(caught instanceof Error ? caught.message : "Unable to update product");
                  } finally {
                    setBusyKey(null);
                  }
                }}
              >
                {busyKey === `save:${product.id}` ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Saving...
                  </span>
                ) : (
                  "Save"
                )}
              </Button>
              <Button
                variant="outline"
                disabled={isRowBusy(product.id)}
                onClick={async () => {
                  setError(null);
                  setBusyKey(`upload:${product.id}`);
                  const fileInput = document.createElement("input");
                  fileInput.type = "file";
                  fileInput.accept = "image/*";
                  fileInput.onchange = async () => {
                    const file = fileInput.files?.[0];
                    if (!file) {
                      setBusyKey(null);
                      return;
                    }

                    const data = new FormData();
                    data.append("file", file);
                    data.append("productId", product.id);

                    try {
                      const uploadResponse = await fetch("/api/admin/products/upload", {
                        method: "POST",
                        body: data
                      });
                      const uploadPayload = (await uploadResponse.json()) as { error?: string };
                      if (!uploadResponse.ok) {
                        setError(uploadPayload.error ?? "Unable to upload image");
                      } else {
                        toast.success(MESSAGES.admin.imageUploaded);
                      }
                    } catch (caught) {
                      setError(caught instanceof Error ? caught.message : "Unable to upload image");
                    } finally {
                      setBusyKey(null);
                    }
                  };
                  fileInput.click();
                }}
              >
                {busyKey === `upload:${product.id}` ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Uploading...
                  </span>
                ) : (
                  "Upload image"
                )}
              </Button>
              <Button
                variant="destructive"
                disabled={isRowBusy(product.id)}
                onClick={async () => {
                  setError(null);
                  setBusyKey(`delete:${product.id}`);
                  try {
                    const response = await fetch("/api/admin/products", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: product.id })
                    });
                    const payload = (await response.json()) as { error?: string };
                    if (!response.ok) {
                      setError(payload.error ?? "Unable to delete product");
                      return;
                    }
                    await load();
                    toast.success(MESSAGES.admin.productDeleted);
                  } catch (caught) {
                    setError(caught instanceof Error ? caught.message : "Unable to delete product");
                  } finally {
                    setBusyKey(null);
                  }
                }}
              >
                {busyKey === `delete:${product.id}` ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Deleting...
                  </span>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
