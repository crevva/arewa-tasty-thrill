import {
  isBackofficeAccessError,
  requireBackofficeSession
} from "@/lib/security/admin";
import { backofficeInviteRevokeSchema } from "@/lib/validators/admin";
import { badRequest, forbidden, internalError, ok } from "@/lib/utils/http";
import { revokeInvite } from "@/server/backoffice/invites";

export async function POST(request: Request) {
  try {
    const actor = await requireBackofficeSession("superadmin");
    const payload = await request.json();
    const parsed = backofficeInviteRevokeSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const invite = await revokeInvite({
      inviteId: parsed.data.id,
      actorUserId: actor.userId
    });

    return ok({ invite });
  } catch (error) {
    if (isBackofficeAccessError(error)) {
      return forbidden();
    }
    if (error instanceof Error && error.message === "Invite not found or no longer pending") {
      return badRequest(error.message);
    }
    return internalError(error);
  }
}
