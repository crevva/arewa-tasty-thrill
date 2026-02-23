import { redirect } from "next/navigation";

import { BackofficeAdminClient } from "@/components/admin/backoffice-admin-client";
import { requireBackofficeSession } from "@/lib/security/admin";

export default async function BackofficeAdminPage() {
  const access = await requireBackofficeSession("superadmin").catch(() => null);
  if (!access) {
    redirect("/admin");
  }

  return <BackofficeAdminClient />;
}
