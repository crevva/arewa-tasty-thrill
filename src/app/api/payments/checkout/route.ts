import { z } from "zod";

import { mapZodError } from "@/lib/errorMapper";
import { MESSAGES } from "@/lib/messages";
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
      const validationError = mapZodError(parsed.error, "Payment details are incomplete.");
      return badRequest(validationError.userMessage);
    }

    const providerName =
      parsed.data.paymentMethod === "paypal"
        ? "paypal"
        : resolveCardPaymentProvider();

    if (parsed.data.paymentMethod === "paypal" && !getEnabledPaymentProviders().includes("paypal")) {
      return badRequest("PayPal is not available right now. Please use Pay Online.");
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
        if (error.message === "Order not found") {
          return badRequest("We couldn’t find your order. Please refresh checkout and try again.");
        }
        if (error.message === "Order is already paid") {
          return badRequest("This order has already been paid.");
        }
        return badRequest("Online payment is not available right now. Please try again shortly.");
      }
    }

    return internalError(error, {
      userMessage: MESSAGES.checkout.initPaymentFailed,
      context: { route: "payments_checkout" }
    });
  }
}
