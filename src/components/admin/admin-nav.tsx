import Link from "next/link";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/delivery-zones", label: "Delivery Zones" },
  { href: "/admin/events", label: "Event Requests" },
  { href: "/admin/cms", label: "CMS Pages" }
];

export function AdminNav() {
  return (
    <nav className="space-y-1" aria-label="Admin navigation">
      {links.map((link) => (
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
