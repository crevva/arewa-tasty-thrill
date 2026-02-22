import { getDb } from "@/lib/db";

export async function writeAuditLog(input: {
  actorUserProfileId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  meta?: Record<string, unknown>;
}) {
  await getDb()
    .insertInto("admin_audit_log")
    .values({
      actor_user_profile_id: input.actorUserProfileId ?? null,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId,
      meta_json: input.meta ?? {}
    })
    .execute();
}
