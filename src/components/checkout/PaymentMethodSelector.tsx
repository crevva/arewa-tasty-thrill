"use client";

import { CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import type { CheckoutPaymentMethod } from "@/lib/validators/checkout";

type PaymentMethodSelectorProps = {
  value: CheckoutPaymentMethod;
  onChange: (value: CheckoutPaymentMethod) => void;
  showPaypal: boolean;
  onlineDisabled?: boolean;
  paypalDisabled?: boolean;
};

type PaymentOption = {
  value: CheckoutPaymentMethod;
  title: string;
  subtext: string;
  note: string;
  badge?: string;
  microcopy?: string;
  disabled?: boolean;
};

export function PaymentMethodSelector({
  value,
  onChange,
  showPaypal,
  onlineDisabled = false,
  paypalDisabled = false
}: PaymentMethodSelectorProps) {
  const options: PaymentOption[] = [
    {
      value: "pay_online",
      title: "Pay Online",
      subtext: "Card \u2022 Bank Transfer \u2022 USSD",
      note: "Fast and secure checkout",
      badge: "Recommended",
      microcopy: "Powered by Paystack",
      disabled: onlineDisabled
    },
    ...(showPaypal
      ? [
          {
            value: "paypal" as const,
            title: "Pay with PayPal",
            subtext: "Best for international payments",
            note: "Secure checkout via your PayPal account",
            disabled: paypalDisabled
          }
        ]
      : [])
  ];

  return (
    <fieldset className="space-y-3">
      <div className="space-y-1">
        <legend className="text-sm font-semibold text-foreground">Payment method</legend>
        <p className="text-sm text-muted-foreground">Choose how you&apos;d like to pay</p>
      </div>

      <div role="radiogroup" aria-label="Payment method" className="space-y-3">
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <label
              key={option.value}
              className={cn(
                "block cursor-pointer",
                option.disabled ? "cursor-not-allowed opacity-60" : ""
              )}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={option.value}
                checked={selected}
                disabled={option.disabled}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
                aria-label={option.title}
              />

              <div
                className={cn(
                  "rounded-xl border bg-card p-4 shadow-sm transition-all duration-200",
                  "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                  "hover:-translate-y-0.5 hover:shadow-md",
                  selected ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{option.title}</span>
                      {option.badge ? (
                        <span className="rounded-full border border-primary/10 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary/80">
                          {option.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{option.subtext}</p>
                  </div>

                  <CheckCircle2
                    className={cn(
                      "h-5 w-5 shrink-0 transition-opacity",
                      selected ? "opacity-100 text-primary" : "opacity-20 text-muted-foreground"
                    )}
                    aria-hidden="true"
                  />
                </div>

                <p className="mt-2 text-xs text-muted-foreground">{option.note}</p>
                {option.microcopy ? (
                  <p className="mt-1 text-[11px] text-muted-foreground/80">{option.microcopy}</p>
                ) : null}
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
