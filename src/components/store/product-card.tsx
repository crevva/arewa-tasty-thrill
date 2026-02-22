import Image from "next/image";
import Link from "next/link";

import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_BLUR_DATA_URL } from "@/lib/constants/images";
import { formatCurrency } from "@/lib/utils/cn";

export function ProductCard(props: {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  imageUrl: string;
  categoryName: string;
  inStock: boolean;
}) {
  return (
    <Card className="overflow-hidden border-primary/10">
      <Link href={`/shop/${props.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={props.imageUrl}
            alt={props.name}
            fill
            className="object-cover transition-transform duration-500 hover:scale-105"
            placeholder="blur"
            blurDataURL={DEFAULT_BLUR_DATA_URL}
          />
        </div>
      </Link>
      <CardHeader className="space-y-3">
        <Badge variant="outline">{props.categoryName}</Badge>
        <CardTitle className="text-xl">{props.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{props.description}</p>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <span className="font-semibold text-primary">{formatCurrency(props.basePrice)}</span>
        {!props.inStock ? <Badge variant="accent">Out of stock</Badge> : null}
      </CardContent>
      <CardFooter>
        <AddToCartButton
          productId={props.id}
          name={props.name}
          slug={props.slug}
          unitPrice={props.basePrice}
          imageUrl={props.imageUrl}
        />
      </CardFooter>
    </Card>
  );
}
