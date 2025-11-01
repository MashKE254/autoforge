/**
 * This is the global Prisma Client instance.
 *
 * In a serverless environment like Next.js, we want to prevent creating too many
 * new Prisma Client instances. This "singleton" pattern ensures that we re-use
 * a single, global instance of the client across our entire application.
 *
 * In development, "globalThis" is used to cache the client across hot reloads.
 * In production, it simply creates one client and exports it.
 */
import { PrismaClient } from "@prisma/client";

// Add prisma to the NodeJS global type
// This is necessary to avoid TypeScript errors during development
declare global {
  var prisma: PrismaClient | undefined;
}

// Check if we are in production or development
const isProduction = process.env.NODE_ENV === "production";

// Create the global prisma client with improved connection settings
export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    // Log database queries in development
    log: isProduction ? ["error"] : ["query", "info", "warn", "error"],
    // Add connection pooling configuration to prevent "connection closed" errors
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Cache the prisma client in development
if (!isProduction) {
  globalThis.prisma = prisma;
}

// Graceful shutdown: disconnect Prisma when the process exits
// This prevents "connection closed" errors during hot reloads
if (!isProduction) {
  const cleanup = async () => {
    await prisma.$disconnect();
  };

  // Handle various exit scenarios
  process.on("beforeExit", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}