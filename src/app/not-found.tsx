import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="section-shell">
      <div className="mx-auto max-w-lg premium-card p-8 text-center">
        <h1 className="h1 text-3xl">Page not found</h1>
        <p className="mt-3 text-muted-foreground">The page you requested does not exist.</p>
        <Link className="mt-5 inline-block" href="/">
          <Button>Go home</Button>
        </Link>
      </div>
    </section>
  );
}
