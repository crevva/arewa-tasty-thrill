import { ZonesAdminClient } from "@/components/admin/zones-admin-client";

export default function AdminDeliveryZonesPage() {
  return (
    <div className="space-y-5">
      <h1 className="h1">Delivery Zones</h1>
      <ZonesAdminClient />
    </div>
  );
}
