"use client";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/cn";
import { useCartStore } from "@/state/cart-store";

const MIN_QTY = 1;
const MAX_QTY = 25;

export function CartTable() {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const subtotal = useCartStore((state) => state.subtotal());

  if (!items.length) {
    return (
      <div className="premium-card p-8 text-center">
        <h2 className="font-heading text-2xl text-primary">Your cart is empty</h2>
        <p className="mt-2 text-muted-foreground">Add some thrill to your basket from the shop.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.productId} className="premium-card flex flex-col gap-4 p-4 md:flex-row md:items-center">
            <div className="relative h-20 w-20 overflow-hidden rounded-xl">
              <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-primary">{item.name}</h3>
              <p className="text-sm text-muted-foreground">{formatCurrency(item.unitPrice)} each</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center rounded-md border border-input bg-background">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-none rounded-l-md px-0 text-foreground hover:bg-secondary/60"
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  disabled={item.quantity <= MIN_QTY}
                  aria-label={`Decrease quantity for ${item.name}`}
                >
                  -
                </Button>
                <span className="w-10 text-center text-sm font-semibold text-foreground" aria-live="polite">
                  {item.quantity}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-none rounded-r-md px-0 text-foreground hover:bg-secondary/60"
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  disabled={item.quantity >= MAX_QTY}
                  aria-label={`Increase quantity for ${item.name}`}
                >
                  +
                </Button>
              </div>
              <p className="w-24 text-right text-sm font-semibold text-primary">
                {formatCurrency(item.unitPrice * item.quantity)}
              </p>
              <Button variant="ghost" onClick={() => removeItem(item.productId)}>
                Remove
              </Button>
            </div>
          </article>
        ))}
      </div>
      <div className="premium-card flex items-center justify-between p-4">
        <span className="text-sm text-muted-foreground">Subtotal</span>
        <strong className="text-xl text-primary">{formatCurrency(subtotal)}</strong>
      </div>
    </div>
  );
}
