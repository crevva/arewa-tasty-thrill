import nextAuthAdapter from "@/auth/adapters/nextauth";
import supabaseAdapter from "@/auth/adapters/supabase";
import { getEnv } from "@/lib/env";

const adapterMap = {
  supabase: supabaseAdapter,
  nextauth: nextAuthAdapter
} as const;

export function getAuthAdapter() {
  const env = getEnv();
  return adapterMap[env.AUTH_PROVIDER];
}

export async function getSession(request?: Request) {
  return getAuthAdapter().getSession(request);
}

export async function requireSession(request?: Request) {
  return getAuthAdapter().requireSession(request);
}

export function signInUrl(returnTo?: string) {
  return getAuthAdapter().signInUrl(returnTo);
}

export function signOutUrl(returnTo?: string) {
  return getAuthAdapter().signOutUrl(returnTo);
}
