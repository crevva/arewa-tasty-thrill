import type { Metadata } from "next";

import { getSession } from "@/auth";
import { CheckoutForm } from "@/components/store/checkout-form";
import { getDb } from "@/lib/db";
import { getEnabledPaymentProviders } from "@/payments";
import { listDeliveryZones } from "@/server/store/catalog";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Guest-first checkout with secure payment and Lagos delivery zones."
};

export default async function CheckoutPage() {
  const [zones, session] = await Promise.all([listDeliveryZones(), getSession()]);

  let profile: { name: string | null; email: string | null; phone: string | null } | null = null;
  if (session?.userId) {
    profile =
      (await getDb()
        .selectFrom("users_profile")
        .select(["name", "email", "phone"])
        .where("id", "=", session.userId)
        .executeTakeFirst()) ?? null;
  }

  return (
    <section className="section-shell space-y-6">
      <header>
        <h1 className="h1">Checkout</h1>
        <p className="mt-2 text-muted-foreground">
          Complete your order as a guest or signed-in customer. Prices are revalidated on server.
        </p>
      </header>

      <CheckoutForm
        zones={zones.map((zone) => ({
          id: zone.id,
          zone: zone.zone,
          fee: zone.fee,
          eta_text: zone.eta_text
        }))}
        enabledProviders={getEnabledPaymentProviders()}
        prefill={
          profile
            ? {
                name: profile.name,
                email: profile.email,
                phone: profile.phone
              }
            : undefined
        }
      />
    </section>
  );
}
