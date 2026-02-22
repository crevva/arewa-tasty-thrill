import Link from "next/link";

import { CartTable } from "@/components/store/cart-table";
import { Button } from "@/components/ui/button";

export default function CartPage() {
  return (
    <section className="section-shell space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="h1">Cart</h1>
        <Link href="/shop" className="text-sm font-semibold text-primary">
          Continue shopping
        </Link>
      </div>

      <CartTable />

      <div className="flex justify-end">
        <Link href="/checkout">
          <Button size="lg">Proceed to checkout</Button>
        </Link>
      </div>
    </section>
  );
}
