"use client";

import { Button } from "@/components/ui/button";

type TablePaginationProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

const pageSizeOptions = [10, 25, 50];

export function TablePagination({
  page,
  totalPages,
  pageSize,
  total,
  from,
  to,
  onPageChange,
  onPageSizeChange
}: TablePaginationProps) {
  const pageWindow = Array.from({ length: totalPages }, (_, index) => index + 1).slice(
    Math.max(0, page - 3),
    Math.min(totalPages, page + 2)
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-3 text-sm">
      <p className="text-muted-foreground">
        Showing {from}-{to} of {total}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground" htmlFor="pageSize">
          Rows
        </label>
        <select
          id="pageSize"
          value={pageSize}
          className="focus-ring h-9 rounded-md border border-input bg-background px-2 text-sm"
          onChange={(event) => onPageSizeChange(Number.parseInt(event.target.value, 10))}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </Button>
        {pageWindow.map((pageValue) => (
          <Button
            key={pageValue}
            variant={pageValue === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(pageValue)}
          >
            {pageValue}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

