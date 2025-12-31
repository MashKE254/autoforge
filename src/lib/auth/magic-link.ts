/**
 * MAGIC LINK AUTHENTICATION
 *
 * File: src/lib/auth/magic-link.ts
 *
 * Passwordless authentication for CUSTOMER accounts
 * - Generate secure one-time tokens
 * - Store in database with expiration
 * - Verify and create session
 */

import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

const MAGIC_LINK_EXPIRY = 15 * 60 * 1000; // 15 minutes

/**
 * Generate a magic link for a user
 */
export async function generateMagicLink(userId: string): Promise<string> {
  // Generate secure token
  const token = randomBytes(32).toString('hex');

  // Store token in database
  await prisma.magicLink.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + MAGIC_LINK_EXPIRY),
    },
  });

  // Create magic link URL
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const magicLink = `${baseUrl}/apps/auth/magic?token=${token}`;

  console.log(`🔗 Magic link generated for user ${userId}`);

  return magicLink;
}

/**
 * Verify a magic link token and return user ID
 */
export async function verifyMagicLink(token: string): Promise<string | null> {
  if (!token) {
    return null;
  }

  // Find valid magic link
  const magicLink = await prisma.magicLink.findFirst({
    where: {
      token,
      expiresAt: {
        gt: new Date(), // Not expired
      },
      usedAt: null, // Not already used
    },
  });

  if (!magicLink) {
    return null; // Invalid or expired
  }

  // Mark as used
  await prisma.magicLink.update({
    where: { id: magicLink.id },
    data: { usedAt: new Date() },
  });

  console.log(`✅ Magic link verified for user ${magicLink.userId}`);

  return magicLink.userId;
}

/**
 * Clean up expired magic links (call periodically)
 */
export async function cleanupExpiredMagicLinks(): Promise<number> {
  const result = await prisma.magicLink.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  if (result.count > 0) {
    console.log(`🧹 Cleaned up ${result.count} expired magic links`);
  }

  return result.count;
}
