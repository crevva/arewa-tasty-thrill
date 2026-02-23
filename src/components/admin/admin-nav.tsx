import Link from "next/link";

import { hasRequiredBackofficeRole } from "@/lib/security/admin";
import type { BackofficeRole } from "@/server/backoffice/types";

const links: Array<{ href: string; label: string; minRole: BackofficeRole }> = [
  { href: "/admin", label: "Dashboard", minRole: "staff" },
  { href: "/admin/orders", label: "Orders", minRole: "staff" },
  { href: "/admin/events", label: "Event Requests", minRole: "staff" },
  { href: "/admin/products", label: "Products", minRole: "admin" },
  { href: "/admin/categories", label: "Categories", minRole: "admin" },
  { href: "/admin/delivery-zones", label: "Delivery Zones", minRole: "admin" },
  { href: "/admin/cms", label: "CMS Pages", minRole: "admin" },
  { href: "/admin/backoffice", label: "Backoffice", minRole: "superadmin" }
];

export function AdminNav({ role }: { role: BackofficeRole }) {
  const visibleLinks = links.filter((link) => hasRequiredBackofficeRole(role, link.minRole));

  return (
    <nav className="space-y-1" aria-label="Admin navigation">
      {visibleLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="block rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
