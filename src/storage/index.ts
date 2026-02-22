import { getEnv } from "@/lib/env";
import localStorageProvider from "@/storage/providers/local";
import supabaseStorageProvider from "@/storage/providers/supabase";

export function getStorageProvider() {
  const env = getEnv();

  if (
    env.NEXT_PUBLIC_SUPABASE_URL &&
    env.SUPABASE_SERVICE_ROLE_KEY &&
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return supabaseStorageProvider;
  }

  return localStorageProvider;
}
