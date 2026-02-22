import { randomUUID } from "node:crypto";

import { getEnv } from "@/lib/env";
import { parseJson, safeCompareSignature, sha512Hex } from "@/lib/security/webhook";
import type { CanonicalWebhookEvent, CreateCheckoutInput, CreateCheckoutResult, PaymentProvider, VerifyWebhookInput } from "@/payments/types";

async function initializePaystack(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  const env = getEnv();
  if (!env.PAYSTACK_SECRET_KEY) {
    return {
      checkoutUrl: `${env.APP_BASE_URL}/order-success?orderCode=${encodeURIComponent(input.orderCode)}&provider=paystack&mock=1`,
      providerRef: `mock-${input.orderCode}`
    };
  }

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: input.customerEmail,
      amount: input.amount,
      currency: input.currency,
      callback_url: input.callbackUrl,
      metadata: {
        orderCode: input.orderCode,
        ...(input.metadata ?? {})
      }
    })
  });

  const payload = (await response.json()) as {
    data?: { authorization_url?: string; reference?: string };
    message?: string;
  };

  if (!response.ok || !payload.data?.authorization_url || !payload.data.reference) {
    throw new Error(payload.message ?? "Unable to initialize Paystack checkout");
  }

  return {
    checkoutUrl: payload.data.authorization_url,
    providerRef: payload.data.reference
  };
}

function normalizePaystackWebhook(input: VerifyWebhookInput): CanonicalWebhookEvent {
  const env = getEnv();
  const signature = input.headers.get("x-paystack-signature");

  if (env.PAYSTACK_WEBHOOK_SECRET) {
    if (!signature) {
      throw new Error("Missing paystack signature");
    }
    const digest = sha512Hex(input.rawBody, env.PAYSTACK_WEBHOOK_SECRET);
    if (!safeCompareSignature(signature, digest)) {
      throw new Error("Invalid paystack signature");
    }
  }

  const payload = parseJson(input.rawBody);
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const metadata = (data.metadata ?? {}) as Record<string, unknown>;

  const statusRaw = String(data.status ?? "pending").toLowerCase();
  const status: CanonicalWebhookEvent["status"] =
    statusRaw === "success" ? "paid" : statusRaw === "failed" ? "failed" : "pending";

  return {
    eventId: String(data.id ?? payload.event ?? randomUUID()),
    eventType: String(payload.event ?? "paystack.unknown"),
    orderCode: String(metadata.orderCode ?? metadata.order_code ?? ""),
    providerRef: String(data.reference ?? ""),
    amount: Number(data.amount ?? 0),
    currency: String(data.currency ?? "NGN"),
    status,
    rawPayload: payload
  };
}

const paystackProvider: PaymentProvider = {
  createCheckout: initializePaystack,
  verifyWebhook: async (input) => normalizePaystackWebhook(input)
};

export default paystackProvider;
