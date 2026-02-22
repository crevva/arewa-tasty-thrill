import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserProfileFromIdentity } from "@/server/users/identity";
import type { AppSession, AuthAdapter } from "@/auth/types";

const supabaseAdapter: AuthAdapter = {
  async getSession() {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return null;
    }

    const profile = await ensureUserProfileFromIdentity({
      provider: "supabase",
      providerUserId: user.id,
      email: user.email,
      name: (user.user_metadata?.full_name as string | undefined) ?? null,
      phone: user.phone ?? null
    });

    const appSession: AppSession = {
      userId: profile.id,
      email: profile.email ?? user.email,
      name: profile.name,
      emailVerified: Boolean(user.email_confirmed_at)
    };

    return appSession;
  },
  async requireSession() {
    const session = await supabaseAdapter.getSession();
    if (!session) {
      throw new Error("Authentication required");
    }
    return session;
  },
  signInUrl(returnTo = "/") {
    return `/auth/supabase/sign-in?returnTo=${encodeURIComponent(returnTo)}`;
  },
  signOutUrl(returnTo = "/") {
    return `/auth/supabase/sign-out?returnTo=${encodeURIComponent(returnTo)}`;
  }
};

export default supabaseAdapter;
