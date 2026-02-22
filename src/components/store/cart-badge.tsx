"use client";

import { ShoppingBag } from "lucide-react";

import { useCartStore } from "@/state/cart-store";

export function CartBadge() {
  const count = useCartStore((state) => state.itemCount());

  return (
    <div className="relative inline-flex items-center justify-center" aria-label={`Cart with ${count} items`}>
      <ShoppingBag className="h-5 w-5" aria-hidden="true" />
      <span className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-accent-foreground">
        {count}
      </span>
    </div>
  );
}
