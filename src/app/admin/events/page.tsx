import { EventsAdminClient } from "@/components/admin/events-admin-client";

export default function AdminEventsPage() {
  return (
    <div className="space-y-5">
      <h1 className="h1">Event Requests</h1>
      <EventsAdminClient />
    </div>
  );
}
