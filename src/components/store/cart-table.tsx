"use client";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/cn";
import { useCartStore } from "@/state/cart-store";

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
              <Input
                className="w-16"
                type="number"
                min={1}
                value={item.quantity}
                onChange={(event) => updateQuantity(item.productId, Number(event.target.value || 1))}
                aria-label={`Quantity for ${item.name}`}
              />
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
