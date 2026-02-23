"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  paymentProvider: z.enum(["paystack", "stripe", "paypal", "flutterwave"])
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
  enabledProviders: string[];
  prefill?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
}) {
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clear);
  const [quote, setQuote] = useState<QuoteState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultZoneId = props.zones[0]?.id;
  const defaultProvider = (props.enabledProviders[0] ?? "paystack") as CheckoutFormInput["paymentProvider"];

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
      paymentProvider: defaultProvider
    }
  });

  const selectedZoneId = form.watch("deliveryZoneId");

  const quotePayload = useMemo(
    () => ({
      deliveryZoneId: selectedZoneId,
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
    }),
    [items, selectedZoneId]
  );

  useEffect(() => {
    if (!selectedZoneId || items.length === 0) {
      setQuote(null);
      return;
    }

    const controller = new AbortController();
    const run = async () => {
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
    });

    return () => controller.abort();
  }, [quotePayload, items.length, selectedZoneId]);

  async function onSubmit(values: CheckoutFormInput) {
    if (!items.length) {
      setError("Your cart is empty.");
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
          paymentProvider: values.paymentProvider
        })
      });

      const orderPayload = (await orderResponse.json()) as {
        orderCode?: string;
        paymentProvider?: string;
        error?: string;
      };

      if (!orderResponse.ok || !orderPayload.orderCode) {
        throw new Error(orderPayload.error ?? "Could not create order");
      }

      const paymentResponse = await fetch(`/api/payments/${values.paymentProvider}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderCode: orderPayload.orderCode
        })
      });

      const paymentPayload = (await paymentResponse.json()) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!paymentResponse.ok || !paymentPayload.checkoutUrl) {
        throw new Error(paymentPayload.error ?? "Could not initialize payment");
      }

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

        <div className="space-y-2">
          <Label htmlFor="paymentProvider">Payment method</Label>
          <Select id="paymentProvider" {...form.register("paymentProvider")}>
            {props.enabledProviders.map((provider) => (
              <option value={provider} key={provider}>
                {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </option>
            ))}
          </Select>
        </div>

        <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(quote?.subtotal ?? 0)}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span>Delivery</span>
            <span>{formatCurrency(quote?.deliveryFee ?? 0)}</span>
          </div>
          <div className="mt-3 flex justify-between font-semibold text-primary">
            <span>Total</span>
            <span>{formatCurrency(quote?.total ?? 0)}</span>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button className="w-full" type="submit" disabled={submitting}>
          {submitting ? "Redirecting to payment..." : "Pay now"}
        </Button>
      </section>
    </form>
  );
}
