import Link from "next/link";

import { ProductCard } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { listActiveProducts } from "@/server/store/catalog";

export default async function HomePage() {
  const products = await listActiveProducts();
  const featured = products.slice(0, 4);

  return (
    <div>
      <section className="section-shell">
        <div className="overflow-hidden rounded-3xl border border-primary/10 bg-white shadow-premium">
          <div className="grid gap-8 p-8 md:grid-cols-[1.2fr_0.8fr] md:p-12">
            <div className="space-y-5">
              <p className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                Premium Lagos Delivery
              </p>
              <h1 className="h1">Every taste is a thrill</h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                Order premium shawarma, smoothies, juices, and curated combos with fast delivery across Lagos.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/shop">
                  <Button size="lg">Start ordering</Button>
                </Link>
                <Link href="/events-catering">
                  <Button size="lg" variant="outline">
                    Book catering
                  </Button>
                </Link>
              </div>
            </div>
            <div className="gradient-brand rounded-2xl p-6 text-white">
              <h2 className="font-heading text-2xl">Guest checkout first</h2>
              <p className="mt-3 text-sm text-white/90">
                No account required. Checkout quickly, then optionally sign in to track and reorder.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-white/90">
                <li>Secure payment processing</li>
                <li>Server-validated prices and delivery fees</li>
                <li>Lagos zones with ETA visibility</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="h2">Featured picks</h2>
            <p className="mt-2 text-sm text-muted-foreground">Handpicked favorites from the AT Thrill menu.</p>
          </div>
          <Link href="/shop" className="text-sm font-semibold text-primary">
            See all
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {featured.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              slug={product.slug}
              description={product.description}
              basePrice={product.basePrice}
              imageUrl={product.imageUrl}
              categoryName={product.categoryName}
              inStock={product.inStock}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
