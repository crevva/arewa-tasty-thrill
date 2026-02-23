import { z } from "zod";

import { badRequest, internalError, ok } from "@/lib/utils/http";
import { checkoutPaymentMethodInputSchema } from "@/lib/validators/checkout";
import { getEnabledPaymentProviders, resolveCardPaymentProvider } from "@/payments";
import { startCheckoutWithProvider } from "@/server/payments/checkout";

const startPaymentSchema = z.object({
  orderCode: z.string().min(3),
  paymentMethod: checkoutPaymentMethodInputSchema
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = startPaymentSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payment payload");
    }

    const providerName =
      parsed.data.paymentMethod === "paypal"
        ? "paypal"
        : resolveCardPaymentProvider();

    if (parsed.data.paymentMethod === "paypal" && !getEnabledPaymentProviders().includes("paypal")) {
      return badRequest("PayPal payments are not available right now");
    }

    const checkout = await startCheckoutWithProvider({
      orderCode: parsed.data.orderCode,
      providerName
    });

    return ok({
      checkoutUrl: checkout.checkoutUrl,
      providerRef: checkout.providerRef,
      provider: checkout.provider
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Order not found" ||
        error.message === "Order is already paid" ||
        error.message === "Selected payment provider is disabled" ||
        error.message === "No card payment provider is enabled"
      ) {
        return badRequest(error.message);
      }
    }

    return internalError(error);
  }
}
