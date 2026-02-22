import { Buffer } from "node:buffer";

import { getEnv } from "@/lib/env";
import type {
  CanonicalWebhookEvent,
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
  VerifyWebhookInput
} from "@/payments/types";

const PAYPAL_BASE = "https://api-m.sandbox.paypal.com";

async function getAccessToken() {
  const env = getEnv();
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    return null;
  }

  const credentials = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64");

  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const payload = (await response.json()) as { access_token?: string; error_description?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? "Unable to fetch PayPal access token");
  }

  return payload.access_token;
}

async function createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  const env = getEnv();
  const token = await getAccessToken().catch(() => null);

  if (!token) {
    return {
      checkoutUrl: `${env.APP_BASE_URL}/order-success?orderCode=${encodeURIComponent(input.orderCode)}&provider=paypal&mock=1`,
      providerRef: `mock-${input.orderCode}`
    };
  }

  const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.orderCode,
          amount: {
            currency_code: input.currency,
            value: (input.amount / 100).toFixed(2)
          },
          custom_id: input.orderCode
        }
      ],
      application_context: {
        return_url: input.callbackUrl,
        cancel_url: `${env.APP_BASE_URL}/checkout?orderCode=${encodeURIComponent(input.orderCode)}`
      }
    })
  });

  const payload = (await response.json()) as {
    id?: string;
    links?: Array<{ rel?: string; href?: string }>;
    message?: string;
  };

  const approveUrl = payload.links?.find((link) => link.rel === "approve")?.href;
  if (!response.ok || !payload.id || !approveUrl) {
    throw new Error(payload.message ?? "Unable to initialize PayPal checkout");
  }

  return {
    checkoutUrl: approveUrl,
    providerRef: payload.id
  };
}

async function verifyPayPalSignature(rawBody: string, headers: Headers) {
  const env = getEnv();
  if (!env.PAYPAL_WEBHOOK_ID || !env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    return true;
  }

  const token = await getAccessToken();

  const response = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: env.PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(rawBody)
    })
  });

  const payload = (await response.json()) as { verification_status?: string };
  return payload.verification_status === "SUCCESS";
}

async function verifyWebhook(input: VerifyWebhookInput): Promise<CanonicalWebhookEvent> {
  const valid = await verifyPayPalSignature(input.rawBody, input.headers);
  if (!valid) {
    throw new Error("Invalid PayPal webhook signature");
  }

  const payload = JSON.parse(input.rawBody) as {
    id?: string;
    event_type?: string;
    resource?: {
      id?: string;
      custom_id?: string;
      purchase_units?: Array<{ custom_id?: string; reference_id?: string }>;
      amount?: { value?: string | number; currency_code?: string };
    };
  };
  const resource = payload.resource ?? {};
  const customId =
    resource.custom_id ?? resource.purchase_units?.[0]?.custom_id ?? resource.purchase_units?.[0]?.reference_id;

  return {
    eventId: String(payload.id ?? `paypal-${Date.now()}`),
    eventType: String(payload.event_type ?? "paypal.unknown"),
    orderCode: String(customId ?? ""),
    providerRef: String(resource.id ?? ""),
    amount: Math.round(Number(resource.amount?.value ?? 0) * 100),
    currency: String(resource.amount?.currency_code ?? "NGN"),
    status: payload.event_type?.includes("COMPLETED") ? "paid" : "pending",
    rawPayload: payload as unknown as Record<string, unknown>
  };
}

const paypalProvider: PaymentProvider = {
  createCheckout,
  verifyWebhook
};

export default paypalProvider;
