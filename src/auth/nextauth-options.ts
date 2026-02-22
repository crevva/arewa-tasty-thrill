import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { getEnv } from "@/lib/env";
import { ensureUserProfileFromIdentity } from "@/server/users/identity";
import { validateCredentials } from "@/server/users/credentials";

export function getNextAuthOptions(): NextAuthOptions {
  const env = getEnv();

  const providers: NextAuthOptions["providers"] = [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        return validateCredentials(credentials.email, credentials.password);
      }
    })
  ];

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET
      })
    );
  }

  return {
    secret: env.NEXTAUTH_SECRET,
    session: {
      strategy: "jwt"
    },
    providers,
    callbacks: {
      async signIn({ user, account }) {
        if (!account) {
          return false;
        }

        const profile = await ensureUserProfileFromIdentity({
          provider: "nextauth",
          providerUserId: account.providerAccountId ?? user.email ?? user.id,
          email: user.email,
          name: user.name
        });

        user.id = profile.id;
        user.email = profile.email;
        user.name = profile.name;

        return true;
      },
      async jwt({ token, user }) {
        if (user) {
          token.appUserId = user.id;
          token.email = user.email;
          token.name = user.name;
          token.emailVerified = Boolean(user.email);
        }

        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.appUserId ?? "";
          session.user.email = token.email;
          session.user.name = token.name;
          session.user.emailVerified = Boolean(token.emailVerified);
        }

        return session;
      }
    },
    pages: {
      signIn: "/auth/sign-in"
    }
  };
}
