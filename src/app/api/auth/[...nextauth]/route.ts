import NextAuth from "next-auth/next";

import { getNextAuthOptions } from "@/auth/nextauth-options";

const handler = NextAuth(getNextAuthOptions());

export { handler as GET, handler as POST };
