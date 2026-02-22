export type PaymentProviderName = "paystack" | "flutterwave" | "stripe" | "paypal";

export type CreateCheckoutInput = {
  orderCode: string;
  amount: number;
  currency: string;
  customerEmail: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
};

export type CreateCheckoutResult = {
  checkoutUrl: string;
  providerRef: string;
};

export type VerifyWebhookInput = {
  headers: Headers;
  rawBody: string;
};

export type CanonicalWebhookEvent = {
  eventId: string;
  eventType: string;
  orderCode: string;
  providerRef: string;
  amount: number;
  currency: string;
  status: "paid" | "failed" | "pending";
  rawPayload: Record<string, unknown>;
};

export interface PaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<CanonicalWebhookEvent>;
}
