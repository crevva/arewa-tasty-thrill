import { getSession } from "@/auth";
import { checkoutSchema } from "@/lib/validators/checkout";
import { badRequest, internalError, ok } from "@/lib/utils/http";
import { createOrder } from "@/server/orders/service";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid checkout payload");
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
    return internalError(error);
  }
}
