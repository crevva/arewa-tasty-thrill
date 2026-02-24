import { getSession } from "@/auth";
import { getDb } from "@/lib/db";
import { mapZodError } from "@/lib/errorMapper";
import { eventRequestSchema } from "@/lib/validators/event-request";
import { badRequest, internalError, ok } from "@/lib/utils/http";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = eventRequestSchema.safeParse(payload);

    if (!parsed.success) {
      const validationError = mapZodError(parsed.error, "Please check your event details and try again.");
      return badRequest(validationError.userMessage);
    }

    const session = await getSession();

    const row = await getDb()
      .insertInto("event_requests")
      .values({
        user_profile_id: session?.userId ?? null,
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email,
        event_date: parsed.data.event_date ? new Date(parsed.data.event_date) : null,
        event_type: parsed.data.event_type,
        guests_estimate: parsed.data.guests_estimate ?? null,
        notes: parsed.data.notes ?? null,
        status: "new"
      })
      .returning(["id"])
      .executeTakeFirstOrThrow();

    return ok({ id: row.id });
  } catch (error) {
    return internalError(error, {
      userMessage: "We couldn’t submit your event request right now. Please try again.",
      context: { route: "event_requests_create" }
    });
  }
}
