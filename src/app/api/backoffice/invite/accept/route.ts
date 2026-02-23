import { acceptInviteSchema } from "@/lib/validators/backoffice";
import { badRequest, internalError, ok } from "@/lib/utils/http";
import { acceptInvite } from "@/server/backoffice/invites";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = acceptInviteSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const accepted = await acceptInvite({
      token: parsed.data.token,
      name: parsed.data.name,
      password: parsed.data.password
    });

    return ok({
      ok: true,
      email: accepted.email,
      role: accepted.role
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Invite link is invalid." ||
        error.message === "This invite has expired." ||
        error.message === "This invite has already been accepted." ||
        error.message === "This invite has been revoked." ||
        error.message === "Invite is no longer pending." ||
        error.message === "Backoffice invite acceptance is currently available only when AUTH_PROVIDER=nextauth."
      ) {
        return badRequest(error.message);
      }
    }
    return internalError(error);
  }
}
