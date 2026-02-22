export type PricingLine = {
  unitPrice: number;
  quantity: number;
};

export function computeTotals(lines: PricingLine[], deliveryFee: number) {
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  return {
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee
  };
}
