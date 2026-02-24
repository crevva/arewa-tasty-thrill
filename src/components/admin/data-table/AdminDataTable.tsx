"use client";

import { Table, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";
import { TablePagination } from "@/components/admin/data-table/TablePagination";
import type { TableColumn } from "@/components/admin/data-table/types";

type AdminDataTableProps<T> = {
  columns: Array<TableColumn<T>>;
  items: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  rowKey: (item: T) => string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  rowClassName?: (row: T) => string;
};

export function AdminDataTable<T>({
  columns,
  items,
  loading = false,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search or filters.",
  rowKey,
  page,
  pageSize,
  total,
  totalPages,
  from,
  to,
  onPageChange,
  onPageSizeChange,
  rowClassName
}: AdminDataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="max-h-[68vh] overflow-auto">
        <Table>
          <thead className="sticky top-0 z-10 bg-secondary/90 backdrop-blur">
            <TableRow className="border-b border-border/80">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    "whitespace-nowrap",
                    column.hideOnMobile ? "hidden md:table-cell" : "",
                    column.className
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: Math.max(4, pageSize) }).map((_, rowIndex) => (
                  <TableRow key={`loading-${rowIndex}`}>
                    {columns.map((column) => (
                      <TableCell
                        key={`${column.key}-${rowIndex}`}
                        className={cn(
                          column.hideOnMobile ? "hidden md:table-cell" : "",
                          column.className
                        )}
                      >
                        <div className="h-4 w-full animate-pulse rounded bg-secondary" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : null}

            {!loading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="px-4 py-10 text-center">
                  <p className="font-semibold text-primary">{emptyTitle}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
                </TableCell>
              </TableRow>
            ) : null}

            {!loading
              ? items.map((item, index) => (
                  <TableRow
                    key={rowKey(item)}
                    className={cn(
                      "transition-colors odd:bg-background even:bg-secondary/20 hover:bg-primary/5",
                      index === items.length - 1 ? "border-b-0" : "",
                      rowClassName ? rowClassName(item) : ""
                    )}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={`${rowKey(item)}-${column.key}`}
                        className={cn(
                          column.hideOnMobile ? "hidden md:table-cell" : "",
                          column.className
                        )}
                      >
                        {column.render(item)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : null}
          </tbody>
        </Table>
      </div>
      <TablePagination
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        total={total}
        from={from}
        to={to}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}

