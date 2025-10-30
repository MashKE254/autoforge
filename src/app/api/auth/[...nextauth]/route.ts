import NextAuth, { type NextAuthOptions } from "next-auth"; // Import NextAuthOptions
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

// Import your providers
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";

// Initialize Prisma client
const prisma = new PrismaClient();

// These are your core auth options
// We're exporting this object now so we can use it on other pages
export const authOptions: NextAuthOptions = { // Add type NextAuthOptions
  // Use the Prisma adapter to store users, sessions, etc. in your DB
  adapter: PrismaAdapter(prisma),

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
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],

  // Use Database Sessions
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Callbacks are used to control what happens during actions
  callbacks: {
    async session({ session, user }: { session: import("next-auth").Session; user: import("next-auth").User }) {
      if (session.user) {
        (session.user as { id?: string }).id = user.id;
      }
      return session;
    },
  },
};

// Initialize NextAuth
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

