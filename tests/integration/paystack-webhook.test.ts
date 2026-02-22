import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

describe("paystack webhook verification", () => {
  it("accepts valid signature and normalizes payload", async () => {
    vi.resetModules();

    process.env.APP_BASE_URL = "http://localhost:3000";
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres";
    process.env.AUTH_PROVIDER = "supabase";
    process.env.ADMIN_EMAILS = "";
    process.env.PAYSTACK_WEBHOOK_SECRET = "test-secret";

    const payload = JSON.stringify({
      event: "charge.success",
      data: {
        id: 1,
        reference: "ref_123",
        amount: 250000,
        currency: "NGN",
        status: "success",
        metadata: {
          orderCode: "AT-ABCDEFGH"
        }
      }
    });

    const signature = createHmac("sha512", "test-secret").update(payload).digest("hex");

    const paystackProvider = (await import("@/payments/providers/paystack")).default;

    const event = await paystackProvider.verifyWebhook({
      headers: new Headers({ "x-paystack-signature": signature }),
      rawBody: payload
    });

    expect(event.orderCode).toBe("AT-ABCDEFGH");
    expect(event.status).toBe("paid");
    expect(event.providerRef).toBe("ref_123");
  });
});
