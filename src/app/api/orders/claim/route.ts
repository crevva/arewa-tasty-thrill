import { requireSession } from "@/auth";
import { claimOrdersSchema } from "@/lib/validators/checkout";
import { badRequest, internalError, ok } from "@/lib/utils/http";
import { claimGuestOrders } from "@/server/orders/service";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const payload = await request.json();
    const parsed = claimOrdersSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const linkedCount = await claimGuestOrders({
      userProfileId: session.userId,
      email: session.email,
      emailVerified: Boolean(session.emailVerified),
      phoneHint: parsed.data.phoneHint
    });

    return ok({ linkedCount });
  } catch (error) {
    return internalError(error);
  }
}
