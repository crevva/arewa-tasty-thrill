"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { checkoutPaymentMethodSchema, type CheckoutPaymentMethod } from "@/lib/validators/checkout";
import { formatCurrency } from "@/lib/utils/cn";
import { useCartStore } from "@/state/cart-store";

const checkoutFormSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  deliveryZoneId: z.string().uuid(),
  street: z.string().min(3),
  area: z.string().min(2),
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
  const [error, setError] = useState<string | null>(null);

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

  const quotePayload = useMemo(
    () => ({
      deliveryZoneId: selectedZoneId,
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
    }),
    [items, selectedZoneId]
  );

  useEffect(() => {
    if (items.length === 0) {
      setQuote(null);
      setQuoteUpdating(false);
      return;
    }
    if (!selectedZoneId) {
      setQuoteUpdating(false);
      return;
    }

    const controller = new AbortController();
    const run = async () => {
      setQuoteUpdating(true);
      const response = await fetch("/api/cart/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quotePayload),
        signal: controller.signal
      });

      const payload = (await response.json()) as { quote?: QuoteState; error?: string };
      if (!response.ok || !payload.quote) {
        setError(payload.error ?? "Unable to calculate quote");
        return;
      }

      setQuote(payload.quote);
      setError(null);
    };

    run().catch((caught) => {
      if ((caught as Error).name !== "AbortError") {
        setError("Unable to calculate quote");
      }
    }).finally(() => {
      setQuoteUpdating(false);
    });

    return () => controller.abort();
  }, [quotePayload, items.length, selectedZoneId]);

  useEffect(() => {
    if (!showPaypal && selectedPaymentMethod === "paypal") {
      form.setValue("paymentMethod", "pay_online", { shouldDirty: true, shouldValidate: true });
      return;
    }

    if (!props.paymentOptions.cardEnabled && showPaypal && selectedPaymentMethod !== "paypal") {
      form.setValue("paymentMethod", "paypal", { shouldDirty: true, shouldValidate: true });
    }
  }, [form, props.paymentOptions.cardEnabled, selectedPaymentMethod, showPaypal]);

  const payButtonLabel = quote
    ? `Pay ${formatCurrency(quote.total, quote.currency)}`
    : "Calculating total...";

  async function startPayment(
    orderCode: string,
    paymentMethod: CheckoutPaymentMethod
  ): Promise<{ checkoutUrl: string; provider?: string }> {
    const paymentResponse = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderCode,
        paymentMethod
      })
    });

    const paymentPayload = (await paymentResponse.json()) as {
      checkoutUrl?: string;
      provider?: string;
      error?: string;
    };

    if (!paymentResponse.ok || !paymentPayload.checkoutUrl) {
      throw new Error(paymentPayload.error ?? "Could not initialize payment");
    }

    return {
      checkoutUrl: paymentPayload.checkoutUrl,
      provider: paymentPayload.provider
    };
  }

  async function onSubmit(values: CheckoutFormInput) {
    if (!items.length) {
      setError("Your cart is empty.");
      return;
    }
    if (!canPay) {
      setError("No payment method is currently available. Please try again later.");
      return;
    }
    if (!quote) {
      setError("Please wait while we calculate your total.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const orderResponse = await fetch("/api/checkout/order", {
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
      });

      const orderPayload = (await orderResponse.json()) as {
        orderCode?: string;
        paymentMethod?: CheckoutPaymentMethod;
        error?: string;
      };

      if (!orderResponse.ok || !orderPayload.orderCode) {
        throw new Error(orderPayload.error ?? "Could not create order");
      }

      const paymentPayload = await startPayment(orderPayload.orderCode, values.paymentMethod);

      clearCart();
      window.location.href = paymentPayload.checkoutUrl;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout failed");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  }

  if (!items.length) {
    return (
      <div className="premium-card p-8">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Link className="mt-3 inline-block text-sm font-semibold text-primary" href="/shop">
          Continue shopping
        </Link>
      </div>
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" {...form.register("phone")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="street">Street address</Label>
          <Input id="street" {...form.register("street")} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="area">Area</Label>
            <Input id="area" {...form.register("area")} />
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
          {quoteUpdating ? <p className="mt-2 text-xs text-muted-foreground">Updating quote...</p> : null}
        </div>

        {!canPay ? (
          <p className="text-sm text-destructive">
            No payment method is currently available. Please contact support.
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button className="w-full" type="submit" disabled={submitting || !canSubmit} aria-busy={submitting}>
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Initializing payment...
            </span>
          ) : (
            payButtonLabel
          )}
        </Button>
      </section>
    </form>
  );
}
