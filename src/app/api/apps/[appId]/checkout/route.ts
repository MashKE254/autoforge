/**
 * Published App Checkout
 * 
 * File: src/app/api/apps/[appId]/checkout/route.ts
 * 
 * Creates a checkout session for end-users to purchase
 * access to a published app.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAppCheckoutSession } from '@/lib/stripe/connect';

// =============================================================================
// POST: Create checkout session for published app
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;

    // 1. Parse request
    const body = await request.json();
    const { email, billingInterval = 'monthly' } = body as {
      email: string;
      billingInterval?: 'monthly' | 'yearly';
    };

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // 2. Get the published app
    const app = await prisma.publishedApp.findUnique({
      where: { id: appId },
      include: {
        user: {
          include: {
            connectedAccount: true,
          },
        },
      },
    });

    if (!app) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 404 }
      );
    }

    if (app.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'This app is not available for purchase' },
        { status: 400 }
      );
    }

    // 3. Handle free apps
    if (app.pricingModel === 'FREE') {
      // Create customer record without payment
      await prisma.appCustomer.upsert({
        where: {
          publishedAppId_email: {
            publishedAppId: appId,
            email,
          },
        },
        create: {
          publishedAppId: appId,
          email,
          stripeCustomerId: 'free',
          hasAccess: true,
        },
        update: {
          hasAccess: true,
        },
      });

      return NextResponse.json({
        success: true,
        free: true,
        redirectUrl: app.deploymentUrl || `https://${app.slug}.autoforge.app`,
      });
    }

    // 4. Validate Connect account
    if (!app.user.connectedAccount?.stripeAccountId) {
      return NextResponse.json(
        { error: 'This app is not configured for payments' },
        { status: 500 }
      );
    }

    if (!app.user.connectedAccount.chargesEnabled) {
      return NextResponse.json(
        { error: 'Payments are temporarily unavailable for this app' },
        { status: 500 }
      );
    }

    // 5. Create checkout session
    const baseUrl = app.deploymentUrl || `https://${app.slug}.autoforge.app`;
    
    const checkoutResult = await createAppCheckoutSession({
      publishedAppId: appId,
      customerEmail: email,
      successUrl: `${baseUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}?checkout=canceled`,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutResult.url,
      sessionId: checkoutResult.sessionId,
    });

  } catch (error) {
    console.error('App checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET: Check if user has access to app
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;

    // Get email from query string
    const email = request.nextUrl.searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check for customer record
    const customer = await prisma.appCustomer.findUnique({
      where: {
        publishedAppId_email: {
          publishedAppId: appId,
          email,
        },
      },
    });

    if (!customer) {
      return NextResponse.json({
        hasAccess: false,
      });
    }

    // Check access status
    const hasAccess = customer.hasAccess && 
      (!customer.accessExpiresAt || customer.accessExpiresAt > new Date());

    return NextResponse.json({
      hasAccess,
      subscriptionStatus: customer.subscriptionStatus,
      expiresAt: customer.accessExpiresAt,
    });

  } catch (error) {
    console.error('Check access error:', error);
    return NextResponse.json(
      { error: 'Failed to check access' },
      { status: 500 }
    );
  }
}
