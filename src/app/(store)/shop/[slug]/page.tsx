import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_BLUR_DATA_URL } from "@/lib/constants/images";
import { formatCurrency } from "@/lib/utils/cn";
import { getProductBySlug } from "@/server/store/catalog";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) {
    return { title: "Product" };
  }

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.imageUrl]
    }
  };
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) {
    notFound();
  }

  return (
    <section className="section-shell">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="premium-card relative aspect-square overflow-hidden">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            placeholder="blur"
            blurDataURL={DEFAULT_BLUR_DATA_URL}
          />
        </div>
        <div className="premium-card space-y-4 p-6">
          <Badge variant="outline">{product.categoryName}</Badge>
          <h1 className="h1 text-3xl md:text-4xl">{product.name}</h1>
          <p className="text-muted-foreground">{product.description}</p>
          <p className="text-2xl font-semibold text-primary">{formatCurrency(product.basePrice)}</p>
          {!product.inStock ? <Badge variant="accent">Out of stock</Badge> : null}
          <AddToCartButton
            productId={product.id}
            name={product.name}
            slug={product.slug}
            unitPrice={product.basePrice}
            imageUrl={product.imageUrl}
          />
        </div>
      </div>
    </section>
  );
}
