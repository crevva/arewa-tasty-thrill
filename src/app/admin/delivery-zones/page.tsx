import { redirect } from "next/navigation";

import { ZonesAdminClient } from "@/components/admin/zones-admin-client";
import { requireBackofficeSession } from "@/lib/security/admin";

export default async function AdminDeliveryZonesPage() {
  const access = await requireBackofficeSession("admin").catch(() => null);
  if (!access) {
    redirect("/admin");
  }

  return <ZonesAdminClient />;
}
