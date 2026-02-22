import Stripe from "stripe";

import { getEnv } from "@/lib/env";
import type {
  CanonicalWebhookEvent,
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
  VerifyWebhookInput
} from "@/payments/types";

function getStripeClient() {
  const env = getEnv();
  if (!env.STRIPE_SECRET_KEY) {
    return null;
  }
  return new Stripe(env.STRIPE_SECRET_KEY);
}

async function createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  const env = getEnv();
  const stripe = getStripeClient();

  if (!stripe) {
    return {
      checkoutUrl: `${env.APP_BASE_URL}/order-success?orderCode=${encodeURIComponent(input.orderCode)}&provider=stripe&mock=1`,
      providerRef: `mock-${input.orderCode}`
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.customerEmail,
    success_url: `${env.APP_BASE_URL}/order-success?orderCode=${encodeURIComponent(input.orderCode)}&provider=stripe`,
    cancel_url: `${env.APP_BASE_URL}/checkout?orderCode=${encodeURIComponent(input.orderCode)}`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: input.amount,
          product_data: {
            name: `AT Thrill Order ${input.orderCode}`
          }
        }
      }
    ],
    metadata: {
      orderCode: input.orderCode,
      ...Object.fromEntries(
        Object.entries(input.metadata ?? {}).map(([key, value]) => [key, String(value)])
      )
    }
  });

  if (!session.url || !session.id) {
    throw new Error("Unable to initialize Stripe checkout");
  }

  return {
    checkoutUrl: session.url,
    providerRef: session.id
  };
}

async function verifyWebhook(input: VerifyWebhookInput): Promise<CanonicalWebhookEvent> {
  const env = getEnv();
  const stripe = getStripeClient();

  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    const payload = JSON.parse(input.rawBody) as {
      id?: string;
      type?: string;
      data?: {
        object?: {
          id?: string;
          amount_total?: number;
          currency?: string;
          metadata?: { orderCode?: string };
        };
      };
    };
    const object = payload.data?.object;
    return {
      eventId: String(payload.id ?? `stripe-mock-${Date.now()}`),
      eventType: String(payload.type ?? "stripe.mock"),
      orderCode: String(object?.metadata?.orderCode ?? ""),
      providerRef: String(object?.id ?? ""),
      amount: Number(object?.amount_total ?? 0),
      currency: String(object?.currency ?? "NGN").toUpperCase(),
      status: "paid",
      rawPayload: payload as unknown as Record<string, unknown>
    };
  }

  const signature = input.headers.get("stripe-signature");
  if (!signature) {
    throw new Error("Missing stripe signature");
  }

  const event = stripe.webhooks.constructEvent(input.rawBody, signature, env.STRIPE_WEBHOOK_SECRET);

  if (event.type !== "checkout.session.completed" && event.type !== "payment_intent.succeeded") {
    throw new Error(`Unhandled stripe event: ${event.type}`);
  }

  const object = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
  const metadata = object.metadata ?? {};

  return {
    eventId: event.id,
    eventType: event.type,
    orderCode: String(metadata.orderCode ?? ""),
    providerRef: String(object.id),
    amount: Number(
      "amount_total" in object
        ? object.amount_total ?? 0
        : "amount_received" in object
          ? object.amount_received ?? 0
          : 0
    ),
    currency: String((object.currency ?? "NGN")).toUpperCase(),
    status: "paid",
    rawPayload: event as unknown as Record<string, unknown>
  };
}

const stripeProvider: PaymentProvider = {
  createCheckout,
  verifyWebhook
};

export default stripeProvider;
