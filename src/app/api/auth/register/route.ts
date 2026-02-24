import { NextResponse } from "next/server";

import { logServerError } from "@/lib/logger";
import { MESSAGES } from "@/lib/messages";
import { hasPendingBackofficeInviteForEmail } from "@/server/backoffice/invites";
import { registerCredentialsUser } from "@/server/users/register";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!body.email || !body.password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const hasPendingInvite = await hasPendingBackofficeInviteForEmail(body.email);
    if (hasPendingInvite) {
      return NextResponse.json(
        { error: "This email has a backoffice invite. Use your invitation link." },
        { status: 403 }
      );
    }

    await registerCredentialsUser({
      email: body.email,
      password: body.password,
      name: body.name
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "A user with this email already exists") {
        return NextResponse.json(
          { error: "An account already exists with this email. Please sign in instead." },
          { status: 400 }
        );
      }
    }

    logServerError(error, { route: "auth_register" });
    return NextResponse.json({ error: MESSAGES.auth.registerFailed }, { status: 400 });
  }
}
