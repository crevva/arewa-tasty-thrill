import { quoteSchema } from "@/lib/validators/checkout";
import { badRequest, internalError, ok } from "@/lib/utils/http";
import { calculateQuote } from "@/server/orders/service";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = quoteSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request payload");
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
    return internalError(error);
  }
}
