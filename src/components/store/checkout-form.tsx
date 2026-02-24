"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import { EmptyState } from "@/components/feedback/empty-state";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { LoadingState } from "@/components/feedback/loading-state";
import { RetryButton } from "@/components/feedback/retry-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type AppError } from "@/lib/errors";
import { mapUnknownError } from "@/lib/errorMapper";
import { requestJson } from "@/lib/http/client";
import { MESSAGES } from "@/lib/messages";
import { checkoutPaymentMethodSchema, type CheckoutPaymentMethod } from "@/lib/validators/checkout";
import { formatCurrency } from "@/lib/utils/cn";
import { useCartStore } from "@/state/cart-store";

const checkoutFormSchema = z.object({
  name: z.string().min(2, "Enter your full name."),
  email: z.string().email(MESSAGES.checkout.emailHelp),
  phone: z
    .string()
    .min(7, MESSAGES.checkout.phoneHelp)
    .regex(/^[+\d][\d\s\-()]{6,}$/, MESSAGES.checkout.phoneHelp),
  deliveryZoneId: z.string().uuid(MESSAGES.checkout.zoneRequired),
  street: z.string().min(3, MESSAGES.checkout.addressHelp),
  area: z.string().min(2, "Please add your area for delivery."),
  landmark: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: checkoutPaymentMethodSchema
});

type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;

type DeliveryZone = {
  id: string;
  zone: string;
  fee: number;
  eta_text: string;
};

type QuoteState = {
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
};

export function CheckoutForm(props: {
  zones: DeliveryZone[];
  paymentOptions: {
    cardEnabled: boolean;
    paypalEnabled: boolean;
    showPaypalAlways: boolean;
  };
  prefill?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
}) {
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clear);
  const [quote, setQuote] = useState<QuoteState | null>(null);
  const [quoteUpdating, setQuoteUpdating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quoteError, setQuoteError] = useState<AppError | null>(null);
  const [submitError, setSubmitError] = useState<AppError | null>(null);

  const defaultZoneId = props.zones[0]?.id;
  const defaultPaymentMethod: CheckoutPaymentMethod =
    props.paymentOptions.cardEnabled || !props.paymentOptions.paypalEnabled ? "pay_online" : "paypal";

  const form = useForm<CheckoutFormInput>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      name: props.prefill?.name ?? "",
      email: props.prefill?.email ?? "",
      phone: props.prefill?.phone ?? "",
      deliveryZoneId: defaultZoneId,
      street: "",
      area: "",
      landmark: "",
      notes: "",
      paymentMethod: defaultPaymentMethod
    }
  });

  const selectedZoneId = form.watch("deliveryZoneId");
  const selectedPaymentMethod = form.watch("paymentMethod");
  const quoteCurrency = quote?.currency ?? "NGN";
  const showPaypal =
    props.paymentOptions.paypalEnabled &&
    (props.paymentOptions.showPaypalAlways || quoteCurrency !== "NGN");
  const canPay = props.paymentOptions.cardEnabled || showPaypal;
  const canSubmit = canPay && !!quote && !quoteUpdating;
  const fieldErrors = form.formState.errors;

  const quotePayload = useMemo(
    () => ({
      deliveryZoneId: selectedZoneId,
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
    }),
    [items, selectedZoneId]
  );

  const refreshQuote = useCallback(async () => {
    if (items.length === 0) {
      setQuote(null);
      setQuoteUpdating(false);
      return;
    }
    if (!selectedZoneId) {
      setQuoteUpdating(false);
      setQuoteError({
        code: "validation",
        userMessage: MESSAGES.checkout.zoneRequired
      });
      return;
    }

    setQuoteUpdating(true);
    try {
      const payload = await requestJson<{ quote?: QuoteState }>(
        "/api/cart/quote",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(quotePayload)
        },
        { context: "checkout_quote", timeoutMs: 12_000 }
      );

      if (!payload.quote) {
        throw new Error(MESSAGES.checkout.quoteFailed);
      }

      setQuote(payload.quote);
      setQuoteError(null);
    } catch (caught) {
      setQuoteError(mapUnknownError(caught, "checkout_quote"));
    } finally {
      setQuoteUpdating(false);
    }
  }, [items.length, quotePayload, selectedZoneId]);

  useEffect(() => {
    if (items.length === 0) {
      setQuote(null);
      setQuoteUpdating(false);
      setQuoteError(null);
      return;
    }
    refreshQuote().catch(() => undefined);
  }, [items.length, refreshQuote]);

  useEffect(() => {
    if (!showPaypal && selectedPaymentMethod === "paypal") {
      form.setValue("paymentMethod", "pay_online", { shouldDirty: true, shouldValidate: true });
      return;
    }

    if (!props.paymentOptions.cardEnabled && showPaypal && selectedPaymentMethod !== "paypal") {
      form.setValue("paymentMethod", "paypal", { shouldDirty: true, shouldValidate: true });
    }
  }, [form, props.paymentOptions.cardEnabled, selectedPaymentMethod, showPaypal]);

  const payButtonLabel = submitting
    ? MESSAGES.checkout.payButtonLoading
    : canSubmit && quote
      ? MESSAGES.checkout.payButtonDefault(formatCurrency(quote.total, quote.currency))
      : MESSAGES.checkout.payButtonDisabled;

  async function startPayment(
    orderCode: string,
    paymentMethod: CheckoutPaymentMethod
  ): Promise<{ checkoutUrl: string; provider?: string }> {
    const paymentPayload = await requestJson<{
      checkoutUrl?: string;
      provider?: string;
    }>(
      "/api/payments/checkout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderCode,
          paymentMethod
        })
      },
      { context: "payment_init", timeoutMs: 15_000 }
    );

    if (!paymentPayload.checkoutUrl) {
      throw new Error("Payment checkout URL missing from server response.");
    }

    return {
      checkoutUrl: paymentPayload.checkoutUrl,
      provider: paymentPayload.provider
    };
  }

  async function onSubmit(values: CheckoutFormInput) {
    if (!items.length) {
      setSubmitError({
        code: "validation",
        userMessage: MESSAGES.checkout.emptyCart
      });
      return;
    }
    if (!canPay) {
      setSubmitError({
        code: "payment_init_failed",
        userMessage: "No payment method is currently available. Please try again later."
      });
      return;
    }
    if (!quote) {
      setSubmitError({
        code: "validation",
        userMessage: "Please wait while we calculate your total."
      });
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const orderPayload = await requestJson<{
        orderCode?: string;
        paymentMethod?: CheckoutPaymentMethod;
      }>(
        "/api/checkout/order",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer: {
              name: values.name,
              email: values.email,
              phone: values.phone
            },
            deliveryZoneId: values.deliveryZoneId,
            items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
            address: {
              street: values.street,
              area: values.area,
              landmark: values.landmark,
              notes: values.notes
            },
            paymentMethod: values.paymentMethod
          })
        },
        { context: "checkout_order", timeoutMs: 15_000 }
      );

      if (!orderPayload.orderCode) {
        throw new Error("Order code missing from server response.");
      }

      const paymentPayload = await startPayment(orderPayload.orderCode, values.paymentMethod);

      clearCart();
      window.location.href = paymentPayload.checkoutUrl;
    } catch (caught) {
      setSubmitError(mapUnknownError(caught, "payment_init"));
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  }

  if (!items.length) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Add your favourites from the shop to continue."
        actionLabel="Continue shopping"
        onAction={() => {
          window.location.href = "/shop";
        }}
      />
    );
  }

  return (
    <form className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]" onSubmit={form.handleSubmit(onSubmit)}>
      <section className="premium-card space-y-4 p-6">
        <h2 className="font-heading text-2xl text-primary">Delivery details</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" {...form.register("name")} />
            {fieldErrors.name?.message ? (
              <p className="text-xs text-destructive">{fieldErrors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" {...form.register("phone")} />
            {fieldErrors.phone?.message ? (
              <p className="text-xs text-destructive">{fieldErrors.phone.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{MESSAGES.checkout.phoneHelp}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
          {fieldErrors.email?.message ? (
            <p className="text-xs text-destructive">{fieldErrors.email.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{MESSAGES.checkout.emailHelp}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="deliveryZoneId">Delivery Zone</Label>
          <Select id="deliveryZoneId" {...form.register("deliveryZoneId")}>
            {props.zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.zone} ({formatCurrency(zone.fee)} | {zone.eta_text})
              </option>
            ))}
          </Select>
          {fieldErrors.deliveryZoneId?.message ? (
            <p className="text-xs text-destructive">{fieldErrors.deliveryZoneId.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="street">Street address</Label>
          <Input id="street" {...form.register("street")} />
          {fieldErrors.street?.message ? (
            <p className="text-xs text-destructive">{fieldErrors.street.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{MESSAGES.checkout.addressHelp}</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="area">Area</Label>
            <Input id="area" {...form.register("area")} />
            {fieldErrors.area?.message ? (
              <p className="text-xs text-destructive">{fieldErrors.area.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="landmark">Landmark (optional)</Label>
            <Input id="landmark" {...form.register("landmark")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Delivery notes (optional)</Label>
          <Textarea id="notes" {...form.register("notes")} />
        </div>
      </section>

      <section className="premium-card space-y-4 p-6">
        <h2 className="font-heading text-2xl text-primary">Payment</h2>

        <PaymentMethodSelector
          value={selectedPaymentMethod}
          onChange={(paymentMethod) =>
            form.setValue("paymentMethod", paymentMethod, {
              shouldDirty: true,
              shouldValidate: true
            })
          }
          showPaypal={showPaypal}
          onlineDisabled={!props.paymentOptions.cardEnabled}
          paypalDisabled={!props.paymentOptions.paypalEnabled}
        />

        <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground/80">{quote ? formatCurrency(quote.subtotal, quote.currency) : "..."}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span className="text-foreground/80">{quote ? formatCurrency(quote.deliveryFee, quote.currency) : "..."}</span>
          </div>
          <div className="my-3 border-t border-border/70" aria-hidden="true" />
          <div className="flex items-center justify-between text-base font-semibold text-foreground">
            <span>Total</span>
            <span className="text-lg font-bold text-primary">{quote ? formatCurrency(quote.total, quote.currency) : "..."}</span>
          </div>
          {quoteUpdating ? (
            <div className="mt-2">
              <LoadingState label={MESSAGES.checkout.quoteUpdating} className="border-0 p-0 shadow-none" />
            </div>
          ) : null}
        </div>

        {!canPay ? (
          <InlineNotice
            type="error"
            title="Payment is currently unavailable"
            description="Please try again shortly or contact support."
          />
        ) : null}
        {quoteError ? (
          <InlineNotice
            type="error"
            title={quoteError.userMessage}
            description={quoteError.retryable ? MESSAGES.common.retry : undefined}
            actionLabel={quoteError.retryable ? "Retry quote" : undefined}
            onAction={quoteError.retryable ? () => refreshQuote().catch(() => undefined) : undefined}
          />
        ) : null}
        {submitError ? (
          <InlineNotice
            type="error"
            title={submitError.userMessage}
            description={submitError.retryable ? MESSAGES.common.contactSupport : undefined}
          />
        ) : null}

        <Button className="w-full" type="submit" disabled={submitting || !canSubmit} aria-busy={submitting}>
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {MESSAGES.checkout.payButtonLoading}
            </span>
          ) : (
            payButtonLabel
          )}
        </Button>
        {submitError?.retryable ? (
          <div className="flex justify-end">
            <RetryButton
              onClick={() => form.handleSubmit(onSubmit)()}
              disabled={submitting}
              label="Retry payment"
            />
          </div>
        ) : null}
      </section>
    </form>
  );
}
