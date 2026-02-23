"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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
    load().catch(() => setError("Unable to load products"));
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

  return (
    <div className="space-y-6">
      <form
        className="premium-card grid gap-3 p-4 md:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);

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
        }}
      >
        <Input
          placeholder="Name"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          required
        />
        <Input
          placeholder="Slug"
          value={form.slug}
          onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
          required
        />
        <Input
          placeholder="Description"
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
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
          required
        />
        <Select
          value={form.category_id}
          onChange={(event) => setForm((current) => ({ ...current, category_id: event.target.value }))}
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
            />
            <span>In stock</span>
          </div>
        </div>
        <div className="md:col-span-2">
          <Button type="submit">Create product</Button>
        </div>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="space-y-3">
        {productRows.map((product) => (
          <article key={product.id} className="premium-card space-y-3 p-4">
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                value={product.name}
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
                onChange={(event) => setProductPriceDraft(product.id, event.target.value)}
              />
              <Select
                value={product.category_id}
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
                onClick={async () => {
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
                }}
              >
                Save
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const fileInput = document.createElement("input");
                  fileInput.type = "file";
                  fileInput.accept = "image/*";
                  fileInput.onchange = async () => {
                    const file = fileInput.files?.[0];
                    if (!file) {
                      return;
                    }

                    const data = new FormData();
                    data.append("file", file);
                    data.append("productId", product.id);

                    const uploadResponse = await fetch("/api/admin/products/upload", {
                      method: "POST",
                      body: data
                    });
                    const uploadPayload = (await uploadResponse.json()) as { error?: string };
                    if (!uploadResponse.ok) {
                      setError(uploadPayload.error ?? "Unable to upload image");
                    }
                  };
                  fileInput.click();
                }}
              >
                Upload image
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
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
                }}
              >
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
