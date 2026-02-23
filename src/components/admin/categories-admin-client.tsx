"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [initialLoading, setInitialLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

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
    load()
      .catch(() => setError("Unable to load categories"))
      .finally(() => setInitialLoading(false));
  }, []);

  function isRowBusy(categoryId: string) {
    return busyKey === `save:${categoryId}` || busyKey === `delete:${categoryId}`;
  }

  if (initialLoading) {
    return (
      <div className="space-y-5">
        <div className="premium-card flex flex-wrap items-end gap-3 p-4">
          <Skeleton className="h-10 flex-1 min-w-48" />
          <Skeleton className="h-10 flex-1 min-w-48" />
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="premium-card flex flex-wrap items-center gap-3 p-4">
              <Skeleton className="h-10 flex-1 min-w-48" />
              <Skeleton className="h-10 flex-1 min-w-48" />
              <Skeleton className="h-10 w-24 rounded-md" />
              <Skeleton className="h-10 w-24 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form
        className="premium-card flex flex-wrap items-end gap-3 p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setBusyKey("create");
          try {
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
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to create category");
          } finally {
            setBusyKey(null);
          }
        }}
      >
        <Input
          placeholder="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={busyKey === "create"}
          required
        />
        <Input
          placeholder="Slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          disabled={busyKey === "create"}
          required
        />
        <Button type="submit" disabled={busyKey === "create"}>
          {busyKey === "create" ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Creating...
            </span>
          ) : (
            "Create category"
          )}
        </Button>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="space-y-2">
        {categories.map((category) => (
          <div key={category.id} className="premium-card flex flex-wrap items-center gap-3 p-4">
            <Input
              value={category.name}
              disabled={isRowBusy(category.id)}
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
              disabled={isRowBusy(category.id)}
              onChange={(event) =>
                setCategories((rows) =>
                  rows.map((row) =>
                    row.id === category.id ? { ...row, slug: event.target.value } : row
                  )
                )
              }
            />
            <Button
              disabled={isRowBusy(category.id)}
              onClick={async () => {
                setError(null);
                setBusyKey(`save:${category.id}`);
                try {
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
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "Unable to update category");
                } finally {
                  setBusyKey(null);
                }
              }}
            >
              {busyKey === `save:${category.id}` ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving...
                </span>
              ) : (
                "Save"
              )}
            </Button>
            <Button
              variant="destructive"
              disabled={isRowBusy(category.id)}
              onClick={async () => {
                setError(null);
                setBusyKey(`delete:${category.id}`);
                try {
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
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "Unable to delete category");
                } finally {
                  setBusyKey(null);
                }
              }}
            >
              {busyKey === `delete:${category.id}` ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
