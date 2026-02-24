import { getEnv } from "@/lib/env";
import { getEnabledPaymentProviders, getPaymentProvider } from "@/payments";
import type { PaymentProviderName } from "@/payments/types";
import { createPaymentAttempt, findOrderByCode } from "@/server/orders/service";

type StartCheckoutWithProviderInput = {
  orderCode: string;
  providerName: PaymentProviderName;
};

export async function startCheckoutWithProvider(input: StartCheckoutWithProviderInput) {
  const enabled = getEnabledPaymentProviders();
  if (!enabled.includes(input.providerName)) {
    throw new Error("Selected payment provider is disabled");
  }

  const order = await findOrderByCode(input.orderCode);
  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status === "paid") {
    throw new Error("Order is already paid");
  }

  const provider = getPaymentProvider(input.providerName);
  const env = getEnv();
  const checkout = await provider.createCheckout({
    orderCode: order.order_code,
    amount: order.total,
    currency: order.currency,
    customerEmail: order.guest_email ?? "guest@atthrill.local",
    callbackUrl: `${env.APP_BASE_URL}/payment/callback?orderCode=${encodeURIComponent(order.order_code)}&provider=${input.providerName}`,
    metadata: {
      orderId: order.id
    }
  });

  await createPaymentAttempt({
    orderId: order.id,
    provider: input.providerName,
    providerRef: checkout.providerRef,
    amount: order.total,
    currency: order.currency,
    rawPayload: {
      type: "checkout_created",
      providerRef: checkout.providerRef
    }
  });

  return {
    checkoutUrl: checkout.checkoutUrl,
    providerRef: checkout.providerRef,
    provider: input.providerName
  };
}
