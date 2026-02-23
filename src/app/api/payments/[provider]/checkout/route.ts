import type { PaymentProviderName } from "@/payments/types";
import { badRequest, internalError, ok } from "@/lib/utils/http";
import { startCheckoutWithProvider } from "@/server/payments/checkout";

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
    const body = (await request.json()) as { orderCode?: string };
    if (!body.orderCode) {
      return badRequest("orderCode is required");
    }
    const checkout = await startCheckoutWithProvider({
      orderCode: body.orderCode,
      providerName
    });

    return ok({ checkoutUrl: checkout.checkoutUrl, providerRef: checkout.providerRef, provider: checkout.provider });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Order not found" ||
        error.message === "Order is already paid" ||
        error.message === "Selected payment provider is disabled"
      ) {
        return badRequest(error.message);
      }
    }
    return internalError(error);
  }
}
