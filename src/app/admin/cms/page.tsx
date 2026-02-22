import { CmsAdminClient } from "@/components/admin/cms-admin-client";

export default function AdminCmsPage() {
  return (
    <div className="space-y-5">
      <h1 className="h1">CMS Pages</h1>
      <CmsAdminClient />
    </div>
  );
}
