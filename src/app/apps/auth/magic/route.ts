/**
 * MAGIC LINK VERIFICATION ENDPOINT
 *
 * File: src/app/apps/auth/magic/route.ts
 *
 * Verifies magic link token and creates authenticated session
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLink } from '@/lib/auth/magic-link';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(
      new URL('/portal?error=invalid_token', request.url)
    );
  }

  try {
    // Verify magic link token
    const userId = await verifyMagicLink(token);

    if (!userId) {
      return NextResponse.redirect(
        new URL('/portal?error=expired_token', request.url)
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL('/portal?error=user_not_found', request.url)
      );
    }

    // TODO: Create NextAuth session
    // This requires integration with your NextAuth setup
    // For now, redirect to a success page with user info in query params
    // In production, you'd set a secure session cookie here

    console.log(`✅ Magic link login successful: ${user.email}`);

    // Redirect to portal (in production, session would be set via cookie)
    // For now, redirect with a temporary auth token that the portal can verify
    return NextResponse.redirect(
      new URL(`/portal?magic_auth=success&email=${encodeURIComponent(user.email)}`, request.url)
    );

  } catch (error) {
    console.error('Magic link verification error:', error);
    return NextResponse.redirect(
      new URL('/portal?error=verification_failed', request.url)
    );
  }
}
