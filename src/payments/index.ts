import { getEnv } from "@/lib/env";
import flutterwaveProvider from "@/payments/providers/flutterwave";
import paystackProvider from "@/payments/providers/paystack";
import paypalProvider from "@/payments/providers/paypal";
import stripeProvider from "@/payments/providers/stripe";
import type { PaymentProvider, PaymentProviderName } from "@/payments/types";

export const CARD_PAYMENT_PROVIDERS: PaymentProviderName[] = ["paystack", "flutterwave", "stripe"];

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

export function getEnabledCardPaymentProviders() {
  const enabled = getEnabledPaymentProviders();
  return enabled.filter((provider): provider is PaymentProviderName =>
    CARD_PAYMENT_PROVIDERS.includes(provider)
  );
}

export function resolveCardPaymentProvider() {
  const env = getEnv();
  const enabledCardProviders = getEnabledCardPaymentProviders();

  if (!enabledCardProviders.length) {
    throw new Error("No card payment provider is enabled");
  }

  const primaryProvider = env.PRIMARY_PAYMENT_PROVIDER.toLowerCase();
  if (
    CARD_PAYMENT_PROVIDERS.includes(primaryProvider as PaymentProviderName) &&
    enabledCardProviders.includes(primaryProvider as PaymentProviderName)
  ) {
    return primaryProvider as PaymentProviderName;
  }

  return enabledCardProviders[0];
}
