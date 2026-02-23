import { redirect } from "next/navigation";

import { CmsAdminClient } from "@/components/admin/cms-admin-client";
import { requireBackofficeSession } from "@/lib/security/admin";

export default async function AdminCmsPage() {
  const access = await requireBackofficeSession("admin").catch(() => null);
  if (!access) {
    redirect("/admin");
  }

  return (
    <div className="space-y-5">
      <h1 className="h1">CMS Pages</h1>
      <CmsAdminClient />
    </div>
  );
}
