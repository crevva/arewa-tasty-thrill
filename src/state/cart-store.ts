"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  name: string;
  slug: string;
  unitPrice: number;
  imageUrl: string;
  quantity: number;
};

type CartStore = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  itemCount: () => number;
  subtotal: () => number;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, quantity = 1) => {
        const existing = get().items.find((cartItem) => cartItem.productId === item.productId);
        if (existing) {
          set({
            items: get().items.map((cartItem) =>
              cartItem.productId === item.productId
                ? { ...cartItem, quantity: cartItem.quantity + quantity }
                : cartItem
            )
          });
          return;
        }

        set({ items: [...get().items, { ...item, quantity }] });
      },
      removeItem: (productId) => {
        set({ items: get().items.filter((item) => item.productId !== productId) });
      },
      updateQuantity: (productId, quantity) => {
        const normalized = Math.max(1, quantity);
        set({
          items: get().items.map((item) =>
            item.productId === productId ? { ...item, quantity: normalized } : item
          )
        });
      },
      clear: () => set({ items: [] }),
      itemCount: () => get().items.reduce((count, item) => count + item.quantity, 0),
      subtotal: () => get().items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    }),
    {
      name: "at-thrill-cart"
    }
  )
);
