import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      emailVerified?: boolean;
    };
  }

  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    appUserId?: string;
    emailVerified?: boolean;
    email?: string | null;
    name?: string | null;
  }
}

export {};
