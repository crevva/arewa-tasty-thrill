import { Resend } from "resend";

import { getEnv } from "@/lib/env";

export async function sendOrderPaidEmail(input: {
  orderCode: string;
  email: string;
  amount: number;
  currency: string;
}) {
  const env = getEnv();
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.email,
    subject: `Payment confirmed for ${input.orderCode}`,
    html: `<p>Your payment has been confirmed for <strong>${input.orderCode}</strong>.</p><p>Total: ${new Intl.NumberFormat("en-NG", { style: "currency", currency: input.currency }).format(input.amount / 100)}</p>`
  });
}
