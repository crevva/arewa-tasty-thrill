import { EventsAdminClient } from "@/components/admin/events-admin-client";
import { requireBackofficeSession } from "@/lib/security/admin";

export default async function AdminEventsPage() {
  await requireBackofficeSession("staff");

  return <EventsAdminClient />;
}
