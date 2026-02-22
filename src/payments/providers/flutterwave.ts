import { randomUUID } from "node:crypto";

import { getEnv } from "@/lib/env";
import { parseJson } from "@/lib/security/webhook";
import type { CanonicalWebhookEvent, CreateCheckoutInput, CreateCheckoutResult, PaymentProvider, VerifyWebhookInput } from "@/payments/types";

const FLUTTERWAVE_BASE = "https://api.flutterwave.com/v3";

async function initializeFlutterwave(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  const env = getEnv();
  const providerRef = `FLW-${input.orderCode}-${Date.now()}`;

  if (!env.FLUTTERWAVE_SECRET_KEY) {
    return {
      checkoutUrl: `${env.APP_BASE_URL}/order-success?orderCode=${encodeURIComponent(input.orderCode)}&provider=flutterwave&mock=1`,
      providerRef
    };
  }

  const response = await fetch(`${FLUTTERWAVE_BASE}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      tx_ref: providerRef,
      amount: input.amount / 100,
      currency: input.currency,
      redirect_url: input.callbackUrl,
      customer: {
        email: input.customerEmail
      },
      customizations: {
        title: "AT Thrill Checkout"
      },
      meta: {
        orderCode: input.orderCode,
        ...(input.metadata ?? {})
      }
    })
  });

  const payload = (await response.json()) as { data?: { link?: string }; message?: string };

  if (!response.ok || !payload.data?.link) {
    throw new Error(payload.message ?? "Unable to initialize Flutterwave checkout");
  }

  return {
    checkoutUrl: payload.data.link,
    providerRef
  };
}

function normalizeFlutterwaveWebhook(input: VerifyWebhookInput): CanonicalWebhookEvent {
  const env = getEnv();
  const signature = input.headers.get("verif-hash");

  if (env.FLUTTERWAVE_WEBHOOK_SECRET) {
    if (!signature || signature !== env.FLUTTERWAVE_WEBHOOK_SECRET) {
      throw new Error("Invalid flutterwave signature");
    }
  }

  const payload = parseJson(input.rawBody);
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const meta = (data.meta ?? {}) as Record<string, unknown>;
  const statusRaw = String(data.status ?? "pending").toLowerCase();

  const status: CanonicalWebhookEvent["status"] =
    statusRaw === "successful" ? "paid" : statusRaw === "failed" ? "failed" : "pending";

  return {
    eventId: String(data.id ?? randomUUID()),
    eventType: String(payload.event ?? "flutterwave.unknown"),
    orderCode: String(meta.orderCode ?? ""),
    providerRef: String(data.tx_ref ?? ""),
    amount: Math.round(Number(data.amount ?? 0) * 100),
    currency: String(data.currency ?? "NGN"),
    status,
    rawPayload: payload
  };
}

const flutterwaveProvider: PaymentProvider = {
  createCheckout: initializeFlutterwave,
  verifyWebhook: async (input) => normalizeFlutterwaveWebhook(input)
};

export default flutterwaveProvider;
