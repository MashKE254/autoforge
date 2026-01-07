import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma client with optimized connection pooling for Neon
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // CRITICAL: Aggressive connection pool settings for dev mode
    // Prevents connection exhaustion during hot reloads
    __internal: {
      engine: {
        connection_limit: 5, // Reduce from default 17 to force recycling
        pool_timeout: 5, // 5 seconds instead of 10
      },
    },
  } as any); // Type assertion needed for internal options
};

// Use global singleton in development to prevent multiple instances during hot-reloads
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Store on global object in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown - disconnect on process termination
if (process.env.NODE_ENV !== 'production') {
  const cleanup = async () => {
    await prisma.$disconnect();
  };

  process.on('beforeExit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGQUIT', cleanup);
  process.on('exit', cleanup);
}

// CRITICAL: Export helper to manually clean stale connections in dev mode
export async function cleanupStaleConnections() {
  if (process.env.NODE_ENV === 'development') {
    try {
      await prisma.$disconnect();
      console.log('🔄 Cleaned up stale Prisma connections');
    } catch (error) {
      console.warn('⚠️  Failed to cleanup connections:', error);
    }
  }
}