/**
 * Stripe Connect Account Creation
 * 
 * File: src/app/api/stripe/create-connect-account/route.ts
 * 
 * Creates a Stripe Connect Express account for a creator
 * and returns the onboarding URL.
 * 
 * NOTE: The country must match or be supported by your platform's country.
 * If your Stripe platform is in UAE (AE), connected accounts should also be in AE.
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

// Set to true during development to bypass subscription check
const BYPASS_SUBSCRIPTION_CHECK = process.env.NODE_ENV === 'development';

// Default country for Connect accounts - should match your Stripe platform country
// Change this to match YOUR Stripe account's country
const DEFAULT_CONNECT_COUNTRY = process.env.STRIPE_CONNECT_COUNTRY || 'AE';

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

    // Must have active platform subscription to connect (unless bypassed in dev)
    if (!BYPASS_SUBSCRIPTION_CHECK) {
      if (user.subscription?.status !== 'ACTIVE' && user.subscription?.status !== 'TRIALING') {
        return NextResponse.json(
          { error: 'Active subscription required to connect Stripe' },
          { status: 403 }
        );
      }
    } else {
      console.log('⚠️ DEV MODE: Bypassing subscription check for Connect');
    }

    // 3. Parse request - use default country if not specified
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine, we'll use defaults
    }
    
    const { country = DEFAULT_CONNECT_COUNTRY } = body as { country?: string };
    
    console.log(`Creating Connect account for country: ${country}`);

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
    
    // Provide more helpful error messages
    const errorMessage = error instanceof Error ? error.message : 'Failed to create Connect account';
    
    // Check for country mismatch error
    if (errorMessage.includes('cannot be created by platforms in')) {
      return NextResponse.json({
        error: 'Country not supported. Your Stripe platform country must support the connected account country.',
        details: errorMessage,
        suggestion: `Try using country code that matches your Stripe platform (e.g., 'AE' for UAE)`,
      }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: errorMessage },
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