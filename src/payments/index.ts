import { getEnv } from "@/lib/env";
import flutterwaveProvider from "@/payments/providers/flutterwave";
import paystackProvider from "@/payments/providers/paystack";
import paypalProvider from "@/payments/providers/paypal";
import stripeProvider from "@/payments/providers/stripe";
import type { PaymentProvider, PaymentProviderName } from "@/payments/types";

const providerMap: Record<PaymentProviderName, PaymentProvider> = {
  paystack: paystackProvider,
  flutterwave: flutterwaveProvider,
  stripe: stripeProvider,
  paypal: paypalProvider
};

export function getPaymentProvider(providerName: PaymentProviderName) {
  return providerMap[providerName];
}

export function getEnabledPaymentProviders() {
  const env = getEnv();
  const names = env.ENABLED_PAYMENT_PROVIDERS.split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter((provider): provider is PaymentProviderName =>
      ["paystack", "flutterwave", "stripe", "paypal"].includes(provider)
    );

  return names.length ? names : [env.PRIMARY_PAYMENT_PROVIDER as PaymentProviderName];
}
