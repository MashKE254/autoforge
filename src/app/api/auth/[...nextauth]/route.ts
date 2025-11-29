import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Adapter } from "next-auth/adapters";

// CRITICAL FIX:
// Import the global prisma client using a relative path to avoid
// circular dependency errors with the '@/' alias.
// This file is at: src/app/api/auth/[...nextauth]/
// The client is at: src/lib/prisma.ts
import { prisma } from "../../../../lib/prisma";

// DO NOT DO THIS (This was the bug causing the "connection closed" error):
// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();

// These are your core auth options
// We're exporting this object now so we can use it on other pages (like the job page)
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  // ADD THIS SECTION
  pages: {
    signIn: '/login',
    error: '/login', // Error code passed in query string as ?error=
    newUser: '/dashboard' // If set, new users will be directed here on first sign in
  },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

