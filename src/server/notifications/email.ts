import { Resend } from "resend";

import { getEnv } from "@/lib/env";
import type { BackofficeInviteRole } from "@/server/backoffice/types";

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

export async function sendBackofficeInviteEmail(input: {
  to: string;
  role: BackofficeInviteRole;
  acceptUrl: string;
  expiresAt: Date;
  invitedByEmail?: string | null;
}) {
  const env = getEnv();
  const from = env.BACKOFFICE_INVITE_FROM ?? env.EMAIL_FROM;

  if (!env.RESEND_API_KEY || !from) {
    throw new Error("Backoffice invite email delivery is not configured. Set RESEND_API_KEY and BACKOFFICE_INVITE_FROM (or EMAIL_FROM).");
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const readableExpiry = input.expiresAt.toISOString();
  const inviterLine = input.invitedByEmail ? `<p>Invited by: ${input.invitedByEmail}</p>` : "";

  await resend.emails.send({
    from,
    to: input.to,
    subject: "You are invited to the AT Thrill backoffice",
    html: `<p>You have been invited as <strong>${input.role}</strong> for the AT Thrill backoffice.</p>${inviterLine}<p>Accept invite: <a href="${input.acceptUrl}">${input.acceptUrl}</a></p><p>This invite expires at ${readableExpiry}.</p>`
  });
}
