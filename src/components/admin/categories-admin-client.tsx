"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Category = {
  id: string;
  name: string;
  slug: string;
};

export function CategoriesAdminClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/categories");
    const payload = (await response.json()) as { categories?: Category[]; error?: string };
    if (!response.ok || !payload.categories) {
      setError(payload.error ?? "Unable to load categories");
      return;
    }
    setCategories(payload.categories);
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load categories"));
  }, []);

  return (
    <div className="space-y-5">
      <form
        className="premium-card flex flex-wrap items-end gap-3 p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const response = await fetch("/api/admin/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, slug })
          });
          const payload = (await response.json()) as { error?: string };
          if (!response.ok) {
            setError(payload.error ?? "Unable to create category");
            return;
          }

          setName("");
          setSlug("");
          await load();
        }}
      >
        <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} required />
        <Input placeholder="Slug" value={slug} onChange={(event) => setSlug(event.target.value)} required />
        <Button type="submit">Create category</Button>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="space-y-2">
        {categories.map((category) => (
          <div key={category.id} className="premium-card flex flex-wrap items-center gap-3 p-4">
            <Input
              value={category.name}
              onChange={(event) =>
                setCategories((rows) =>
                  rows.map((row) =>
                    row.id === category.id ? { ...row, name: event.target.value } : row
                  )
                )
              }
            />
            <Input
              value={category.slug}
              onChange={(event) =>
                setCategories((rows) =>
                  rows.map((row) =>
                    row.id === category.id ? { ...row, slug: event.target.value } : row
                  )
                )
              }
            />
            <Button
              onClick={async () => {
                const response = await fetch("/api/admin/categories", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(category)
                });
                const payload = (await response.json()) as { error?: string };
                if (!response.ok) {
                  setError(payload.error ?? "Unable to update category");
                  return;
                }
                await load();
              }}
            >
              Save
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const response = await fetch("/api/admin/categories", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: category.id })
                });
                const payload = (await response.json()) as { error?: string };
                if (!response.ok) {
                  setError(payload.error ?? "Unable to delete category");
                  return;
                }
                await load();
              }}
            >
              Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
