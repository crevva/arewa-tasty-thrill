import type { Metadata } from "next";

import { ProductCard } from "@/components/store/product-card";
import { listActiveProducts } from "@/server/store/catalog";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse shawarma, smoothies, juices, and combos from AT Thrill."
};

export default async function ShopPage() {
  const products = await listActiveProducts();

  return (
    <section className="section-shell">
      <header className="mb-8">
        <h1 className="h1">Shop</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Browse our premium menu and build your order with fast Lagos delivery.
        </p>
      </header>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
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
  );
}
