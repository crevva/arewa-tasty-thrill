"use client";

import { Loader2, Pencil } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminDataTable } from "@/components/admin/data-table/AdminDataTable";
import { DrawerFormShell } from "@/components/admin/data-table/DrawerFormShell";
import type { PaginatedResponse, TableColumn } from "@/components/admin/data-table/types";
import { useAdminTableQuery } from "@/components/admin/data-table/useAdminTableQuery";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { useToast } from "@/components/feedback/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { requestJson } from "@/lib/http/client";
import { MESSAGES } from "@/lib/messages";
import { formatCurrency } from "@/lib/utils/cn";

type OrderRow = {
  id: string;
  order_code: string;
  status: string;
  total: number;
  currency: string;
  guest_email: string | null;
  guest_phone: string | null;
  delivery_zone: string | null;
  created_at: string;
};

const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "processing",
  "dispatched",
  "delivered",
  "cancelled"
] as const;

function buildOrdersUrl(queryString: string) {
  return queryString ? `/api/admin/orders?${queryString}` : "/api/admin/orders";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function getStatusTone(status: string) {
  if (status === "paid" || status === "delivered") {
    return "bg-green-700/15 text-green-700";
  }
  if (status === "cancelled") {
    return "bg-destructive/15 text-destructive";
  }
  if (status === "pending_payment") {
    return "bg-amber-600/15 text-amber-700";
  }
  return "bg-secondary text-muted-foreground";
}

export function OrdersAdminClient() {
  const toast = useToast();
  const query = useAdminTableQuery({ defaultPageSize: 10, defaultSort: "newest" });

  const [rows, setRows] = useState<OrderRow[]>([]);
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

  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [nextStatus, setNextStatus] = useState<string>("pending_payment");
  const [savingStatus, setSavingStatus] = useState(false);

  const statusFilter = query.getFilter("status");
  const dateFrom = query.getFilter("dateFrom");
  const dateTo = query.getFilter("dateTo");

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await requestJson<PaginatedResponse<OrderRow>>(
        buildOrdersUrl(query.queryString),
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
      setError((caught as Error).message ?? "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [query.queryString]);

  useEffect(() => {
    loadRows().catch((caught) => {
      setError((caught as Error).message ?? "Could not load orders.");
    });
  }, [loadRows]);

  function openDrawer(order: OrderRow) {
    setSelectedOrder(order);
    setNextStatus(order.status);
  }

  async function saveStatus() {
    if (!selectedOrder) {
      return;
    }
    setSavingStatus(true);
    setError(null);
    try {
      await requestJson<{ order: OrderRow }>(
        "/api/admin/orders",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selectedOrder.id, status: nextStatus })
        },
        { context: "admin" }
      );
      toast.success(MESSAGES.admin.orderUpdated);
      setSelectedOrder(null);
      await loadRows();
    } catch (caught) {
      const message = (caught as Error).message ?? MESSAGES.admin.saveFailed;
      setError(message);
      toast.error(message);
    } finally {
      setSavingStatus(false);
    }
  }

  const columns = useMemo<Array<TableColumn<OrderRow>>>(
    () => [
      {
        key: "order",
        header: "Order",
        render: (row) => (
          <button
            type="button"
            className="text-left"
            onClick={() => openDrawer(row)}
            aria-label={`View order ${row.order_code}`}
          >
            <p className="font-semibold text-primary">{row.order_code}</p>
            <p className="text-xs text-muted-foreground">{formatDate(row.created_at)}</p>
          </button>
        )
      },
      {
        key: "customer",
        header: "Customer",
        hideOnMobile: true,
        render: (row) => row.guest_email ?? row.guest_phone ?? "Guest"
      },
      {
        key: "zone",
        header: "Zone",
        hideOnMobile: true,
        render: (row) => row.delivery_zone ?? "No zone"
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <Badge className={getStatusTone(row.status)}>{row.status.replaceAll("_", " ")}</Badge>
        )
      },
      {
        key: "total",
        header: "Total",
        className: "whitespace-nowrap",
        render: (row) => formatCurrency(row.total, row.currency)
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (row) => (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => openDrawer(row)} aria-label={`Edit ${row.order_code}`}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )
      }
    ],
    []
  );

  return (
    <>
      <AdminPageShell
        title="Orders"
        subtitle="Monitor and update order status with filters for daily operations."
        toolbar={
          <div className="grid gap-2 md:grid-cols-5">
            <Input
              placeholder="Search code, email, or phone"
              value={query.searchInput}
              onChange={(event) => query.setSearchInput(event.target.value)}
            />
            <Select
              value={statusFilter || "all"}
              onChange={(event) => query.setFilter("status", event.target.value === "all" ? null : event.target.value)}
            >
              <option value="all">All statuses</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => query.setFilter("dateFrom", event.target.value || null)}
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(event) => query.setFilter("dateTo", event.target.value || null)}
            />
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
          emptyTitle="No orders found"
          emptyDescription="Try broadening your filters or date range."
        />
      </AdminPageShell>

      <DrawerFormShell
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order ${selectedOrder.order_code}` : "Order details"}
        description="Review customer details and update status."
      >
        {selectedOrder ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-3 text-sm">
              <p>
                <span className="font-medium text-primary">Customer:</span>{" "}
                {selectedOrder.guest_email ?? selectedOrder.guest_phone ?? "Guest"}
              </p>
              <p className="mt-1">
                <span className="font-medium text-primary">Zone:</span>{" "}
                {selectedOrder.delivery_zone ?? "No zone"}
              </p>
              <p className="mt-1">
                <span className="font-medium text-primary">Placed:</span> {formatDate(selectedOrder.created_at)}
              </p>
              <p className="mt-1">
                <span className="font-medium text-primary">Amount:</span>{" "}
                {formatCurrency(selectedOrder.total, selectedOrder.currency)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderStatus">Order status</Label>
              <Select
                id="orderStatus"
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value)}
                disabled={savingStatus}
              >
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedOrder(null)} disabled={savingStatus}>
                Cancel
              </Button>
              <Button onClick={() => saveStatus().catch(() => undefined)} disabled={savingStatus}>
                {savingStatus ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Saving...
                  </span>
                ) : (
                  "Save status"
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </DrawerFormShell>
    </>
  );
}
