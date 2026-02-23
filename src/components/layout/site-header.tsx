import Image from "next/image";
import Link from "next/link";

import { CartBadge } from "@/components/store/cart-badge";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { APP_SHORT_NAME } from "@/lib/constants/branding";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/events-catering", label: "Events" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="focus-ring inline-flex items-center gap-3 rounded-md" aria-label="AT Thrill home">
          <Image src="/brand/logo.jpg" alt="AT Thrill logo" width={36} height={36} className="rounded-full" priority />
          <span className="font-heading text-base font-semibold text-primary md:text-lg">{APP_SHORT_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="focus-ring rounded-md text-sm font-medium text-muted-foreground hover:text-primary">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/order-lookup" className="focus-ring rounded-md text-sm font-medium text-muted-foreground hover:text-primary">
            Track Order
          </Link>
          <Link href="/cart" className="focus-ring rounded-md" aria-label="Go to cart">
            <CartBadge />
          </Link>
        </div>
      </div>
    </header>
  );
}
