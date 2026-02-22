import { getDb } from "@/lib/db";
import { requireAdminSession } from "@/lib/security/admin";
import { eventRequestUpdateSchema } from "@/lib/validators/admin";
import { badRequest, forbidden, internalError, ok } from "@/lib/utils/http";
import { writeAuditLog } from "@/server/admin/audit";

export async function GET() {
  try {
    await requireAdminSession();
    const requests = await getDb()
      .selectFrom("event_requests")
      .selectAll()
      .orderBy("created_at desc")
      .execute();
    return ok({ requests });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Admin access required")) {
      return forbidden();
    }
    return internalError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdminSession();
    const payload = (await request.json()) as { id?: string; status?: string };
    if (!payload.id) {
      return badRequest("id is required");
    }

    const parsed = eventRequestUpdateSchema.safeParse({ status: payload.status });
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const eventRequest = await getDb()
      .updateTable("event_requests")
      .set({ status: parsed.data.status })
      .where("id", "=", payload.id)
      .returningAll()
      .executeTakeFirstOrThrow();

    await writeAuditLog({
      actorUserProfileId: admin.userId,
      action: "update_status",
      entity: "event_request",
      entityId: eventRequest.id,
      meta: { status: eventRequest.status }
    });

    return ok({ eventRequest });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Admin access required")) {
      return forbidden();
    }
    return internalError(error);
  }
}
