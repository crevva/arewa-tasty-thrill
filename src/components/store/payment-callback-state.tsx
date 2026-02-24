"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { InlineNotice } from "@/components/feedback/inline-notice";
import { LoadingState } from "@/components/feedback/loading-state";
import { RetryButton } from "@/components/feedback/retry-button";
import { Button } from "@/components/ui/button";
import { MESSAGES } from "@/lib/messages";

type PaymentCallbackStateProps = {
  orderCode?: string;
  provider?: string;
  rawStatus?: string;
};

type ResolvedState = "success" | "pending" | "failed";

function resolveState(rawStatus?: string): ResolvedState {
  const normalized = (rawStatus ?? "").toLowerCase();
  if (["paid", "success", "successful"].includes(normalized)) {
    return "success";
  }
  if (["failed", "cancelled", "canceled"].includes(normalized)) {
    return "failed";
  }
  return "pending";
}

export function PaymentCallbackState({
  orderCode,
  provider,
  rawStatus
}: PaymentCallbackStateProps) {
  const [verifying, setVerifying] = useState(true);
  const state = useMemo(() => resolveState(rawStatus), [rawStatus]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setVerifying(false), 1200);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const lookupHref = orderCode
    ? `/order-lookup?orderCode=${encodeURIComponent(orderCode)}`
    : "/order-lookup";

  if (verifying) {
    return (
      <div className="space-y-4">
        <LoadingState label={MESSAGES.payment.verifying} className="premium-card p-5" />
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="space-y-4">
        <InlineNotice
          type="success"
          title={`${MESSAGES.payment.confirmedTitle} 🎉`}
          description={MESSAGES.payment.confirmedBody}
        />
        {orderCode ? (
          <p className="text-sm text-muted-foreground">
            Order code: <span className="font-semibold text-foreground">{orderCode}</span>
          </p>
        ) : null}
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={lookupHref}>
            <Button>Track order</Button>
          </Link>
          <Link href="/shop">
            <Button variant="outline">Continue shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (state === "failed") {
    return (
      <div className="space-y-4">
        <InlineNotice
          type="error"
          title={MESSAGES.payment.failedTitle}
          description={MESSAGES.payment.failedBody}
        />
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/checkout">
            <Button>Back to checkout</Button>
          </Link>
          <Link href="/cart">
            <Button variant="outline">Review cart</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <InlineNotice
        type="info"
        title={MESSAGES.payment.pendingTitle}
        description={MESSAGES.payment.pendingBody}
      />
      <p className="text-sm text-muted-foreground">
        Provider: <span className="font-medium text-foreground">{provider ?? "payment gateway"}</span>
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <RetryButton onClick={() => window.location.reload()} label="Retry verification" />
        <Link href={lookupHref}>
          <Button variant="outline">Track order</Button>
        </Link>
      </div>
    </div>
  );
}
