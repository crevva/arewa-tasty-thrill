"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils/cn";

function normalizeOrderCodeInput(value: string) {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleaned) {
    return "";
  }

  const withoutPrefix = cleaned.startsWith("AT") ? cleaned.slice(2) : cleaned;
  return `AT-${withoutPrefix.slice(0, 8)}`;
}

export function OrderLookupForm() {
  const [orderCode, setOrderCode] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [result, setResult] = useState<{
    order: {
      orderCode: string;
      status: string;
      total: number;
      currency: string;
      createdAt: string;
    };
    items: Array<{
      id: string;
      name_snapshot: string;
      qty: number;
      line_total: number;
    }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    const normalizedCode = normalizeOrderCodeInput(orderCode);
    if (!/^AT-[A-Z0-9]{8}$/.test(normalizedCode)) {
      setError("Order code must be in the format AT-XXXXXXXX.");
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderCode: normalizedCode, emailOrPhone })
      });
      const payload = (await response.json()) as {
        error?: string;
        order?: {
          orderCode: string;
          status: string;
          total: number;
          currency: string;
          createdAt: string;
        };
        items?: Array<{
          id: string;
          name_snapshot: string;
          qty: number;
          line_total: number;
        }>;
      };

      if (!response.ok || !payload.order || !payload.items) {
        throw new Error(payload.error ?? "Could not find order");
      }

      setResult({ order: payload.order, items: payload.items });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <form className="premium-card space-y-4 p-6" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label htmlFor="orderCode" className="text-sm font-medium text-primary">
            Order Code
          </label>
          <Input
            id="orderCode"
            value={orderCode}
            onChange={(event) => setOrderCode(normalizeOrderCodeInput(event.target.value))}
            onBlur={() => {
              if (orderCode === "AT-") {
                setOrderCode("");
              }
            }}
            placeholder="AT-XXXXXXXX"
            maxLength={11}
            autoCapitalize="characters"
            spellCheck={false}
            pattern="AT-[A-Z0-9]{8}"
            disabled={busy}
            required
          />
          <p className="text-xs text-muted-foreground">Use the exact code shown in your order confirmation.</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="emailOrPhone" className="text-sm font-medium text-primary">
            Email or phone
          </label>
          <Input
            id="emailOrPhone"
            value={emailOrPhone}
            onChange={(event) => setEmailOrPhone(event.target.value)}
            disabled={busy}
            required
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={busy}>
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Checking...
            </span>
          ) : (
            "Lookup order"
          )}
        </Button>
      </form>

      {busy && !result ? (
        <div className="premium-card space-y-3 p-6" aria-live="polite" aria-busy="true">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
          <div className="space-y-2 pt-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="premium-card p-6">
          <h3 className="font-heading text-xl text-primary">{result.order.orderCode}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Status: {result.order.status}</p>
          <p className="text-sm text-muted-foreground">
            Total: {formatCurrency(result.order.total, result.order.currency)}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {result.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between">
                <span>
                  {item.name_snapshot} x{item.qty}
                </span>
                <strong>{formatCurrency(item.line_total, result.order.currency)}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
