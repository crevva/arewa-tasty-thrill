import { NextResponse } from "next/server";

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
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
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
    const message = error instanceof Error ? error.message : "Unable to create account";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
