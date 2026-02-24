import { getSession } from "@/auth";
import { mapZodError } from "@/lib/errorMapper";
import { MESSAGES } from "@/lib/messages";
import { checkoutSchema } from "@/lib/validators/checkout";
import { badRequest, internalError, ok } from "@/lib/utils/http";
import { createOrder } from "@/server/orders/service";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) {
      const validationError = mapZodError(parsed.error, "Please complete your checkout details.");
      return badRequest(validationError.userMessage);
    }

    const session = await getSession();

    const order = await createOrder({
      ...parsed.data,
      userProfileId: session?.userId ?? null
    });

    return ok({
      orderCode: order.orderCode,
      orderId: order.id,
      total: order.quote.total,
      currency: order.quote.currency,
      paymentMethod: parsed.data.paymentMethod
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Delivery zone is invalid") {
        return badRequest(MESSAGES.checkout.zoneUnsupported);
      }
      if (error.message === "One or more products are unavailable") {
        return badRequest("Some items in your cart are unavailable. Update your cart and try again.");
      }
    }
    return internalError(error, {
      userMessage: "We couldn’t place your order right now. Please try again.",
      context: { route: "checkout_order" }
    });
  }
}
