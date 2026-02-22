import { getEnabledPaymentProviders, getPaymentProvider } from "@/payments";
import type { PaymentProviderName } from "@/payments/types";
import { badRequest, internalError, ok } from "@/lib/utils/http";
import { createPaymentAttempt, findOrderByCode } from "@/server/orders/service";

function parseProvider(provider: string): PaymentProviderName {
  if (!["paystack", "flutterwave", "stripe", "paypal"].includes(provider)) {
    throw new Error("Unsupported payment provider");
  }
  return provider as PaymentProviderName;
}

export async function POST(
  request: Request,
  context: { params: { provider: string } }
) {
  try {
    const providerName = parseProvider(context.params.provider);
    const enabled = getEnabledPaymentProviders();
    if (!enabled.includes(providerName)) {
      return badRequest("Selected payment provider is disabled");
    }

    const body = (await request.json()) as { orderCode?: string };
    if (!body.orderCode) {
      return badRequest("orderCode is required");
    }

    const order = await findOrderByCode(body.orderCode);
    if (!order) {
      return badRequest("Order not found");
    }

    if (order.status === "paid") {
      return badRequest("Order is already paid");
    }

    const provider = getPaymentProvider(providerName);
    const checkout = await provider.createCheckout({
      orderCode: order.order_code,
      amount: order.total,
      currency: order.currency,
      customerEmail: order.guest_email ?? "guest@atthrill.local",
      callbackUrl: `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/order-success?orderCode=${encodeURIComponent(order.order_code)}&provider=${providerName}`,
      metadata: {
        orderId: order.id
      }
    });

    await createPaymentAttempt({
      orderId: order.id,
      provider: providerName,
      providerRef: checkout.providerRef,
      amount: order.total,
      currency: order.currency,
      rawPayload: {
        type: "checkout_created",
        providerRef: checkout.providerRef
      }
    });

    return ok({ checkoutUrl: checkout.checkoutUrl, providerRef: checkout.providerRef });
  } catch (error) {
    return internalError(error);
  }
}
