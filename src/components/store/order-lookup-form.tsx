"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { LoadingState } from "@/components/feedback/loading-state";
import { RetryButton } from "@/components/feedback/retry-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mapUnknownError } from "@/lib/errorMapper";
import { requestJson } from "@/lib/http/client";
import { MESSAGES } from "@/lib/messages";
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
  const params = useSearchParams();
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

  useEffect(() => {
    const queryOrderCode = params.get("orderCode");
    if (queryOrderCode && !orderCode) {
      setOrderCode(normalizeOrderCodeInput(queryOrderCode));
    }
  }, [orderCode, params]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    const normalizedCode = normalizeOrderCodeInput(orderCode);
    if (!/^AT-[A-Z0-9]{8}$/.test(normalizedCode)) {
      setError("Order code should be in this format: AT-XXXXXXXX.");
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const payload = await requestJson<{
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
      }>(
        "/api/orders/lookup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderCode: normalizedCode, emailOrPhone })
        },
        { context: "order_lookup", timeoutMs: 12_000 }
      );

      if (!payload.order || !payload.items) {
        throw new Error(MESSAGES.orders.lookupNotFound);
      }

      setResult({ order: payload.order, items: payload.items });
    } catch (caught) {
      setError(mapUnknownError(caught, "order_lookup").userMessage);
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
        {error ? (
          <InlineNotice
            type="error"
            title={error}
            description={MESSAGES.common.retry}
            actionLabel="Try again"
            onAction={() => {
              if (!busy) {
                const form = document.getElementById("orderCode");
                form?.focus();
              }
            }}
          />
        ) : null}
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
        <LoadingState
          label="Checking your order..."
          className="premium-card space-y-3 p-6"
        />
      ) : null}

      {result ? (
        <div className="premium-card p-6">
          <h3 className="font-heading text-xl text-primary">{result.order.orderCode}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Status: {result.order.status}</p>
          {result.order.status === "delivered" ? (
            <p className="mt-1 text-sm text-green-700">{MESSAGES.orders.statusDelivered}</p>
          ) : null}
          {["paid", "processing", "dispatched"].includes(result.order.status) ? (
            <p className="mt-1 text-sm text-muted-foreground">{MESSAGES.orders.statusProcessing}</p>
          ) : null}
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

      {!busy && !result && !error ? (
        <EmptyState
          title="Track your order"
          description="Enter your order code and checkout email/phone to get live status."
        />
      ) : null}

      {error ? (
        <div className="flex justify-end">
          <RetryButton onClick={() => setError(null)} />
        </div>
      ) : null}
    </div>
  );
}
