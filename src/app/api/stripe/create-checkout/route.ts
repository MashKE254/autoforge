/**
 * Platform Subscription Checkout
 * 
 * File: src/app/api/stripe/create-checkout/route.ts
 * 
 * Creates a Stripe checkout session for creators to subscribe
 * to AutoForge platform plans ($49/mo, $99/mo, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { stripe } from '@/lib/stripe/client';
import { prisma } from '@/lib/prisma';
import { PLANS, PlanConfig } from '@/lib/stripe/plans';
import { PlanTier } from '@prisma/client';

// =============================================================================
// POST: Create checkout session
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

    // 2. Parse request
    const body = await request.json();
    const { planId, billingInterval = 'monthly' } = body as {
      planId: PlanTier;
      billingInterval: 'monthly' | 'yearly';
    };

    // 3. Validate plan
    const plan = PLANS[planId] as PlanConfig | undefined;
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    if (planId === 'ENTERPRISE') {
      return NextResponse.json(
        { error: 'Enterprise requires contacting sales' },
        { status: 400 }
      );
    }

    // 4. Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already subscribed
    if (user.subscription?.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Already subscribed. Use billing portal to change plans.' },
        { status: 400 }
      );
    }

    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email!,
        name: user.name || undefined,
        metadata: {
          autoforge_user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      // Save customer ID
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

    // 5. Get the appropriate price ID
    const priceId = billingInterval === 'yearly' 
      ? plan.stripePriceYearly 
      : plan.stripePriceMonthly;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price not configured for this plan' },
        { status: 500 }
      );
    }

    // 6. Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      subscription_data: {
        trial_period_days: 14, // 14-day free trial
        metadata: {
          autoforge_user_id: user.id,
          plan_tier: planId,
        },
      },
      metadata: {
        autoforge_user_id: user.id,
        plan_tier: planId,
        billing_interval: billingInterval,
      },
    });

    // 7. Return checkout URL
    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
