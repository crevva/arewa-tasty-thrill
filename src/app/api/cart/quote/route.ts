import { quoteSchema } from "@/lib/validators/checkout";
import { mapZodError } from "@/lib/errorMapper";
import { MESSAGES } from "@/lib/messages";
import { badRequest, internalError, ok } from "@/lib/utils/http";
import { calculateQuote } from "@/server/orders/service";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = quoteSchema.safeParse(payload);
    if (!parsed.success) {
      const validationError = mapZodError(parsed.error, "Please confirm your cart items and delivery zone.");
      return badRequest(validationError.userMessage);
    }

    const quote = await calculateQuote({
      deliveryZoneId: parsed.data.deliveryZoneId,
      items: parsed.data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity
      }))
    });

    return ok({ quote });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Delivery zone is invalid") {
        return badRequest(MESSAGES.checkout.zoneUnsupported);
      }
      if (error.message === "One or more products are unavailable") {
        return badRequest("One or more items in your cart are currently unavailable.");
      }
    }
    return internalError(error, {
      userMessage: MESSAGES.checkout.quoteFailed,
      context: { route: "cart_quote" }
    });
  }
}
