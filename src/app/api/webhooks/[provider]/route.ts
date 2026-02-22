import { getPaymentProvider } from "@/payments";
import type { PaymentProviderName } from "@/payments/types";
import { internalError, ok } from "@/lib/utils/http";
import { applyWebhookEvent } from "@/server/orders/service";

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
    const provider = getPaymentProvider(providerName);

    const rawBody = await request.text();
    const event = await provider.verifyWebhook({
      headers: request.headers,
      rawBody
    });

    const result = await applyWebhookEvent(providerName, event);

    return ok({ ok: true, duplicated: result.duplicated, orderCode: result.orderCode });
  } catch (error) {
    return internalError(error);
  }
}
