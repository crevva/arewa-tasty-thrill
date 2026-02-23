import { inviteTokenSchema } from "@/lib/validators/backoffice";
import { badRequest, internalError, ok } from "@/lib/utils/http";
import { validateInviteToken } from "@/server/backoffice/invites";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = inviteTokenSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const result = await validateInviteToken(parsed.data.token);
    return ok(result);
  } catch (error) {
    return internalError(error);
  }
}
