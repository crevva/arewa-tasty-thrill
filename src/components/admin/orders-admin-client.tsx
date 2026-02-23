"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils/cn";

type Order = {
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

const statuses = ["pending_payment", "paid", "processing", "dispatched", "delivered", "cancelled"];

export function OrdersAdminClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/orders");
    const payload = (await response.json()) as { orders?: Order[]; error?: string };
    if (!response.ok || !payload.orders) {
      setError(payload.error ?? "Unable to load orders");
      return;
    }

    setOrders(payload.orders);
  }

  useEffect(() => {
    load()
      .catch(() => setError("Unable to load orders"))
      .finally(() => setInitialLoading(false));
  }, []);

  if (initialLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <article key={index} className="premium-card space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64 max-w-full" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 flex-1 rounded-md" />
              <Skeleton className="h-10 w-24 rounded-md" />
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {orders.map((order) => (
        <article key={order.id} className="premium-card space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-primary">{order.order_code}</h2>
              <p className="text-xs text-muted-foreground">
                {order.delivery_zone ?? "No zone"} | {order.guest_email ?? order.guest_phone ?? "Guest"}
              </p>
            </div>
            <strong>{formatCurrency(order.total, order.currency)}</strong>
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={order.status}
              disabled={busyKey === `save:${order.id}`}
              onChange={(event) =>
                setOrders((rows) =>
                  rows.map((row) =>
                    row.id === order.id ? { ...row, status: event.target.value } : row
                  )
                )
              }
            >
              {statuses.map((status) => (
                <option value={status} key={status}>
                  {status}
                </option>
              ))}
            </Select>
            <Button
              disabled={busyKey === `save:${order.id}`}
              onClick={async () => {
                setError(null);
                setBusyKey(`save:${order.id}`);
                try {
                  const response = await fetch("/api/admin/orders", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: order.id, status: order.status })
                  });
                  const payload = (await response.json()) as { error?: string };
                  if (!response.ok) {
                    setError(payload.error ?? "Unable to update order");
                    return;
                  }
                  await load();
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "Unable to update order");
                } finally {
                  setBusyKey(null);
                }
              }}
            >
              {busyKey === `save:${order.id}` ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving...
                </span>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
