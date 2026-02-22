import type { CheckoutInput } from "@/lib/validators/checkout";
import type { PaymentProviderName } from "@/payments/types";

export type CreateOrderInput = CheckoutInput & {
  userProfileId?: string | null;
};

export type OrderLookupInput = {
  orderCode: string;
  emailOrPhone: string;
};

export type ClaimOrdersInput = {
  userProfileId: string;
  email: string;
  emailVerified: boolean;
  phoneHint?: string;
};

export type CheckoutLine = {
  productId: string;
  name: string;
  slug: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  imageUrl: string;
};

export type QuoteResult = {
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  lines: CheckoutLine[];
  deliveryZone: {
    id: string;
    zone: string;
    etaText: string;
  };
};

export type NewPaymentAttempt = {
  orderId: string;
  provider: PaymentProviderName;
  providerRef: string;
  amount: number;
  currency: string;
  rawPayload: Record<string, unknown>;
};
