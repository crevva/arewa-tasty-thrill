import { EventsAdminClient } from "@/components/admin/events-admin-client";
import { requireBackofficeSession } from "@/lib/security/admin";

export default async function AdminEventsPage() {
  await requireBackofficeSession("staff");

  return (
    <div className="space-y-5">
      <h1 className="h1">Event Requests</h1>
      <EventsAdminClient />
    </div>
  );
}
