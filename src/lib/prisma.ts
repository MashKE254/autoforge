import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  
  // Test connection on startup
  prisma.$connect()
    .then(() => {
      console.log('✅ Database connected successfully');
    })
    // FIX: Add proper type annotation for 'err' parameter
    .catch((err: Error) => {
      console.error('❌ Database connection failed:', err.message);
      console.log('💡 Check your database at: https://console.neon.tech');
    });
}