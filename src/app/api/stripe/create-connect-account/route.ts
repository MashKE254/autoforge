/**
 * Stripe Connect Account Creation
 * 
 * File: src/app/api/stripe/create-connect-account/route.ts
 * 
 * Creates a Stripe Connect Express account for a creator
 * and returns the onboarding URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { 
  createConnectAccount, 
  createOnboardingLink,
  createDashboardLink,
  getConnectAccountStatus 
} from '@/lib/stripe/connect';
import { prisma } from '@/lib/prisma';

// =============================================================================
// POST: Create or get Connect account
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Check if user has active subscription
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        subscription: true,
        connectedAccount: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Must have active platform subscription to connect
    if (user.subscription?.status !== 'ACTIVE' && user.subscription?.status !== 'TRIALING') {
      return NextResponse.json(
        { error: 'Active subscription required to connect Stripe' },
        { status: 403 }
      );
    }

    // 3. Parse request
    const body = await request.json();
    const { country = 'US' } = body as { country?: string };

    // 4. Create or get existing Connect account
    if (user.connectedAccount) {
      // Account exists - check status and return appropriate link
      if (user.connectedAccount.onboardingComplete) {
        // Already complete - return dashboard link
        const dashboardLink = await createDashboardLink(
          user.connectedAccount.stripeAccountId
        );
        
        return NextResponse.json({
          success: true,
          status: 'complete',
          dashboardUrl: dashboardLink.url,
          message: 'Connect account is already set up',
        });
      } else {
        // Onboarding incomplete - return new onboarding link
        const onboardingLink = await createOnboardingLink(
          user.connectedAccount.stripeAccountId
        );
        
        return NextResponse.json({
          success: true,
          status: 'onboarding_required',
          onboardingUrl: onboardingLink.url,
          message: 'Please complete Stripe onboarding',
        });
      }
    }

    // 5. Create new Connect account
    const result = await createConnectAccount(
      session.user.id,
      user.email!,
      country
    );

    return NextResponse.json({
      success: true,
      status: 'created',
      accountId: result.accountId,
      onboardingUrl: result.onboardingUrl,
      message: 'Connect account created. Complete onboarding to start receiving payouts.',
    });

  } catch (error) {
    console.error('Connect account error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create Connect account' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET: Check Connect account status
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get status
    const status = await getConnectAccountStatus(session.user.id);

    if (!status) {
      return NextResponse.json({
        connected: false,
        message: 'No Connect account found',
      });
    }

    return NextResponse.json({
      connected: status.exists,
      accountId: status.accountId,
      onboardingComplete: status.onboardingComplete,
      chargesEnabled: status.chargesEnabled,
      payoutsEnabled: status.payoutsEnabled,
      detailsSubmitted: status.detailsSubmitted,
    });

  } catch (error) {
    console.error('Get Connect status error:', error);
    return NextResponse.json(
      { error: 'Failed to get Connect status' },
      { status: 500 }
    );
  }
}
