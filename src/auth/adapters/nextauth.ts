import { getServerSession } from "next-auth/next";

import { getNextAuthOptions } from "@/auth/nextauth-options";
import type { AppSession, AuthAdapter } from "@/auth/types";

const nextAuthAdapter: AuthAdapter = {
  async getSession() {
    const session = await getServerSession(getNextAuthOptions());
    if (!session?.user?.id || !session.user.email) {
      return null;
    }

    const appSession: AppSession = {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      emailVerified: Boolean(session.user.emailVerified)
    };

    return appSession;
  },
  async requireSession() {
    const session = await nextAuthAdapter.getSession();
    if (!session) {
      throw new Error("Authentication required");
    }
    return session;
  },
  signInUrl(returnTo = "/") {
    return `/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`;
  },
  signOutUrl(returnTo = "/") {
    return `/api/auth/signout?callbackUrl=${encodeURIComponent(returnTo)}`;
  }
};

export default nextAuthAdapter;
