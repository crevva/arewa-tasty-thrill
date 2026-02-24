"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function useAdminTableQuery(options?: {
  defaultPageSize?: number;
  defaultSort?: string;
  searchDebounceMs?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultPageSize = options?.defaultPageSize ?? 10;
  const searchDebounceMs = options?.searchDebounceMs ?? 350;

  const page = parsePositiveInt(searchParams.get("page"), 1);
  const pageSize = parsePositiveInt(searchParams.get("pageSize"), defaultPageSize);
  const sort = searchParams.get("sort") ?? options?.defaultSort ?? "";
  const q = searchParams.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>, resetPage = false) => {
      const next = new URLSearchParams(searchParams.toString());

      if (resetPage) {
        next.set("page", "1");
      }

      Object.entries(updates).forEach(([key, value]) => {
        if (!value || value === "all") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });

      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const currentQuery = searchParams.get("q") ?? "";
      if (searchInput !== currentQuery) {
        updateParams({ q: searchInput || null }, true);
      }
    }, searchDebounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [searchDebounceMs, searchInput, searchParams, updateParams]);

  const queryString = useMemo(() => searchParams.toString(), [searchParams]);

  return {
    page,
    pageSize,
    q,
    sort,
    searchInput,
    queryString,
    setSearchInput,
    setPage: (nextPage: number) => updateParams({ page: String(nextPage) }),
    setPageSize: (nextPageSize: number) =>
      updateParams({ pageSize: String(nextPageSize) }, true),
    setSort: (nextSort: string) => updateParams({ sort: nextSort || null }, true),
    setFilter: (key: string, value: string | null) => updateParams({ [key]: value }, true),
    getFilter: (key: string) => searchParams.get(key) ?? ""
  };
}

