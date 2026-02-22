import { OrderLookupForm } from "@/components/store/order-lookup-form";

export default function OrderLookupPage() {
  return (
    <section className="section-shell">
      <header className="mb-6">
        <h1 className="h1">Order Lookup</h1>
        <p className="mt-2 text-muted-foreground">
          Enter your order code and email or phone used during checkout.
        </p>
      </header>

      <OrderLookupForm />
    </section>
  );
}
