import { enforceRateLimit } from "@/lib/security/rate-limit";
import { orderLookupSchema } from "@/lib/validators/checkout";
import { badRequest, internalError, ok } from "@/lib/utils/http";
import { lookupOrder } from "@/server/orders/service";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    await enforceRateLimit("order_lookup", ip);

    const payload = await request.json();
    const parsed = orderLookupSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const result = await lookupOrder({
      orderCode: parsed.data.orderCode,
      emailOrPhone: parsed.data.emailOrPhone
    });

    return ok({
      order: {
        orderCode: result.order.order_code,
        status: result.order.status,
        total: result.order.total,
        currency: result.order.currency,
        createdAt: result.order.created_at
      },
      items: result.items
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Order not found" || message === "Order identity verification failed") {
      return badRequest(message);
    }
    return internalError(error);
  }
}
