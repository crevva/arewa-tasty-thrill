"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";

import { useCartStore } from "@/state/cart-store";

export function CartBadge() {
  const count = useCartStore((state) => state.itemCount());
  const [mounted, setMounted] = useState(false);
  const safeCount = mounted ? count : 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      aria-label={`Cart with ${safeCount} items`}
    >
      <ShoppingBag className="h-5 w-5" aria-hidden="true" />
      <span
        className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-accent-foreground"
        suppressHydrationWarning
      >
        {safeCount}
      </span>
    </div>
  );
}
