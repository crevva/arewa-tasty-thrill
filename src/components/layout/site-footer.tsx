import Link from "next/link";

import { APP_NAME, BRAND_INSTAGRAM } from "@/lib/constants/branding";

export function SiteFooter() {
  return (
    <footer className="border-t bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-3 md:px-6">
        <div>
          <h2 className="font-heading text-lg font-semibold text-primary">{APP_NAME}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Premium shawarma, smoothies, juices, and event catering delivered across Lagos.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/shop" className="hover:text-primary">
                Shop
              </Link>
            </li>
            <li>
              <Link href="/events-catering" className="hover:text-primary">
                Events & Catering
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-primary">
                FAQ
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Connect</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <a href={BRAND_INSTAGRAM} target="_blank" rel="noreferrer" className="hover:text-primary">
                Instagram
              </a>
            </li>
            <li>
              <Link href="/legal" className="hover:text-primary">
                Legal
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-primary">
                Contact
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
