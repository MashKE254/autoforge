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
  // Use the PrismaAdapter and pass in the shared, global client
  adapter: PrismaAdapter(prisma) as Adapter,

  // Configure one or more authentication providers
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // We can add EmailProvider back later if needed
    // EmailProvider({
    //   server: process.env.EMAIL_SERVER,
    //   from: process.env.EMAIL_FROM,
    // }),
  ],
  session: {
    // Use JSON Web Tokens for session strategy
    strategy: "jwt",
  },
  callbacks: {
    // This callback is crucial for adding the user's ID to the session
    // so we can access it in our Server Components and API routes.
    async session({ session, token }) {
      if (token && session.user) {
        // Add the user ID (which is in `token.sub`) to the session object
        session.user.id = token.sub as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      // On the initial sign-in, 'user' object is available
      if (user) {
        // Persist the user's ID (from the database) into the JWT
        token.sub = user.id;
      }
      return token;
    },
  },
  // We can add a custom sign-in page later
  // pages: {
  //   signIn: '/auth/signin',
  // },

  // A secret is required for JWTs
  secret: process.env.NEXTAUTH_SECRET,
};

// The handler that creates the API routes (e.g., /api/auth/signin, /api/auth/signout)
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

