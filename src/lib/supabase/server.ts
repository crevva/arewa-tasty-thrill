import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getEnv } from "@/lib/env";

export function createSupabaseServerClient() {
  const env = getEnv();
  const cookieStore = cookies();

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase URL and anon key are required when AUTH_PROVIDER=supabase");
  }

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string) {
        cookieStore.set(name, value);
      },
      remove(name: string) {
        cookieStore.set(name, "");
      }
    }
  });
}
