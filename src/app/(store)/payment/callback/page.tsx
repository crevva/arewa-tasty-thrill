import { PaymentCallbackState } from "@/components/store/payment-callback-state";

export default function PaymentCallbackPage({
  searchParams
}: {
  searchParams: {
    orderCode?: string;
    provider?: string;
    status?: string;
  };
}) {
  return (
    <section className="section-shell">
      <div className="mx-auto max-w-2xl premium-card p-8 text-center">
        <h1 className="h1 text-3xl">Payment update</h1>
        <p className="mt-3 text-muted-foreground">
          We’re confirming your payment status now.
        </p>
        <div className="mt-6">
          <PaymentCallbackState
            orderCode={searchParams.orderCode}
            provider={searchParams.provider}
            rawStatus={searchParams.status}
          />
        </div>
      </div>
    </section>
  );
}

