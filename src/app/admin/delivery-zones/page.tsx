import { redirect } from "next/navigation";

import { ZonesAdminClient } from "@/components/admin/zones-admin-client";
import { requireBackofficeSession } from "@/lib/security/admin";

export default async function AdminDeliveryZonesPage() {
  const access = await requireBackofficeSession("admin").catch(() => null);
  if (!access) {
    redirect("/admin");
  }

  return (
    <div className="space-y-5">
      <h1 className="h1">Delivery Zones</h1>
      <ZonesAdminClient />
    </div>
  );
}
