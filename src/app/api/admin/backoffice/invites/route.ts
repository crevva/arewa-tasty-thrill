import {
  isBackofficeAccessError,
  requireBackofficeSession
} from "@/lib/security/admin";
import {
  backofficeInviteCreateSchema
} from "@/lib/validators/admin";
import { badRequest, forbidden, internalError, ok } from "@/lib/utils/http";
import { createInvite, listInvites } from "@/server/backoffice/invites";

export async function GET() {
  try {
    await requireBackofficeSession("superadmin");
    const invites = await listInvites();
    return ok({ invites });
  } catch (error) {
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    return internalError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireBackofficeSession("superadmin");
    const payload = await request.json();
    const parsed = backofficeInviteCreateSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const invite = await createInvite({
      email: parsed.data.email,
      role: parsed.data.role,
      actorUserId: actor.userId,
      actorEmail: actor.email
    });

    return ok({ invite });
  } catch (error) {
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    if (error instanceof Error) {
      if (
        error.message === "A pending invite already exists for this email" ||
        error.message === "Backoffice invites are currently available only when AUTH_PROVIDER=nextauth." ||
        error.message.startsWith("Backoffice invite email delivery is not configured")
      ) {
        return badRequest(error.message);
      }
    }
    return internalError(error);
  }
}
