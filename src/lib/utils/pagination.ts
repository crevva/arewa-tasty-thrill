export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export function parsePositiveInt(
  value: string | null,
  fallback: number
) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function parsePage(searchParams: URLSearchParams) {
  return parsePositiveInt(searchParams.get("page"), 1);
}

export function parsePageSize(searchParams: URLSearchParams) {
  const parsed = parsePositiveInt(searchParams.get("pageSize"), PAGE_SIZE_OPTIONS[0]);
  if (!PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])) {
    return PAGE_SIZE_OPTIONS[0];
  }
  return parsed;
}

export function parseBooleanParam(value: string | null) {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return null;
}

export function parseDateParam(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function buildPaginationMeta(input: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(input.total / input.pageSize));
  const safePage = Math.min(Math.max(input.page, 1), totalPages);
  const offset = (safePage - 1) * input.pageSize;
  const from = input.total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + input.pageSize, input.total);

  return {
    page: safePage,
    pageSize: input.pageSize,
    total: input.total,
    totalPages,
    offset,
    from,
    to
  };
}

