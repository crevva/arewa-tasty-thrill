import { describe, expect, it } from "vitest";

import { computeTotals } from "@/server/orders/pricing";

describe("computeTotals", () => {
  it("computes subtotal and total with delivery fee", () => {
    const result = computeTotals(
      [
        { unitPrice: 250000, quantity: 2 },
        { unitPrice: 420000, quantity: 1 }
      ],
      180000
    );

    expect(result.subtotal).toBe(920000);
    expect(result.deliveryFee).toBe(180000);
    expect(result.total).toBe(1100000);
  });
});
