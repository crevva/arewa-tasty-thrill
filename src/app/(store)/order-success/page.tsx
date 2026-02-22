import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function OrderSuccessPage({
  searchParams
}: {
  searchParams: { orderCode?: string; provider?: string; mock?: string };
}) {
  const orderCode = searchParams.orderCode ?? "Pending";
  const provider = searchParams.provider ?? "payment";

  return (
    <section className="section-shell">
      <div className="mx-auto max-w-2xl premium-card p-8 text-center">
        <h1 className="h1 text-3xl">Thank you for your order</h1>
        <p className="mt-3 text-muted-foreground">
          Your order <strong>{orderCode}</strong> has been submitted. Payment provider: {provider}.
        </p>
        {searchParams.mock ? (
          <p className="mt-2 text-sm text-amber-700">
            Mock payment mode detected. Trigger webhook or switch to live keys for full confirmation flow.
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/order-lookup">
            <Button>Track this order</Button>
          </Link>
          <Link href="/shop">
            <Button variant="outline">Continue shopping</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
