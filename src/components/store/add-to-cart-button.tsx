"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/state/cart-store";

export function AddToCartButton(props: {
  productId: string;
  name: string;
  slug: string;
  unitPrice: number;
  imageUrl: string;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const [added, setAdded] = useState(false);

  return (
    <Button
      className="w-full"
      onClick={() => {
        addItem(
          {
            productId: props.productId,
            name: props.name,
            slug: props.slug,
            unitPrice: props.unitPrice,
            imageUrl: props.imageUrl
          },
          1
        );
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1000);
      }}
    >
      {added ? "Added" : "Add to Cart"}
    </Button>
  );
}
