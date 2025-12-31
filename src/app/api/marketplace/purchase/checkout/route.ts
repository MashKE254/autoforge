/**
 * STRIPE CHECKOUT API - One-Click Purchase
 *
 * File: src/app/api/marketplace/purchase/checkout/route.ts
 *
 * Creates Stripe Checkout session for paid apps
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    // 2. Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 3. Parse request
    const body = await request.json();
    const { appId, pricingModel } = body;

    if (!appId || !pricingModel) {
      return NextResponse.json(
        { error: 'App ID and pricing model are required' },
        { status: 400 }
      );
    }

    // 4. Get app
    const app = await prisma.publishedApp.findUnique({
      where: { id: appId },
      include: {
        user: true,
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
        { error: 'App is not available' },
        { status: 400 }
      );
    }

    if (app.pricingModel === 'FREE') {
      return NextResponse.json(
        { error: 'This app is free, use the free activation endpoint' },
        { status: 400 }
      );
    }

    // 5. Check if user already owns this app
    const existingSubscription = await prisma.appSubscription.findFirst({
      where: {
        userId: user.id,
        publishedAppId: app.id,
        status: 'ACTIVE',
      },
    });

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'You already have access to this app' },
        { status: 400 }
      );
    }

    // 6. Create or get Stripe customer
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      });

      stripeCustomerId = customer.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

    // 7. Determine price and mode
    const price = pricingModel === 'SUBSCRIPTION' ? app.monthlyPrice : app.oneTimePrice;
    const mode = pricingModel === 'SUBSCRIPTION' ? 'subscription' : 'payment';

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Invalid pricing configuration' },
        { status: 400 }
      );
    }

    // 8. Create Stripe Checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: app.name,
              description: app.description || undefined,
              images: app.logoUrl ? [app.logoUrl] : undefined,
            },
            unit_amount: Math.round(price * 100), // Convert to cents
            ...(pricingModel === 'SUBSCRIPTION' && {
              recurring: {
                interval: 'month',
              },
            }),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/portal?purchase=success&app=${app.id}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/marketplace/${app.slug}?purchase=cancelled`,
      metadata: {
        userId: user.id,
        appId: app.id,
        pricingModel: app.pricingModel,
        creatorId: app.userId,
      },
      // Enable automatic tax collection if configured
      automatic_tax: {
        enabled: false, // Set to true when Stripe Tax is configured
      },
      // Collect billing address
      billing_address_collection: 'auto',
      // Customer can update email
      customer_update: {
        address: 'auto',
      },
    });

    console.log(`💳 Checkout created: ${app.name} for ${user.email}`);
    console.log(`   Session: ${checkoutSession.id}`);
    console.log(`   Price: $${price} (${pricingModel})`);

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });

  } catch (error) {
    console.error('Checkout creation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create checkout',
      },
      { status: 500 }
    );
  }
}
