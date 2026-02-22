import { getSession } from "@/auth";
import { getDb } from "@/lib/db";
import { eventRequestSchema } from "@/lib/validators/event-request";
import { badRequest, internalError, ok } from "@/lib/utils/http";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = eventRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
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
    return internalError(error);
  }
}
