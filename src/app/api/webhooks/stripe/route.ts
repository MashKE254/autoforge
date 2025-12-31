/**
 * STRIPE WEBHOOK HANDLER - Auto-Account Creation
 *
 * File: src/app/api/webhooks/stripe/route.ts
 *
 * Listens for Stripe events and handles:
 * 1. checkout.session.completed → Create CUSTOMER account + Activate app
 * 2. invoice.payment_succeeded → Record payment
 * 3. customer.subscription.deleted → Cancel subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { generateMagicLink } from '@/lib/auth/magic-link';
import { sendMagicLinkEmail } from '@/lib/email/magic-link';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log(`📥 Webhook received: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log(`✅ Checkout completed: ${session.id}`);

  const metadata = session.metadata;
  if (!metadata) {
    console.error('No metadata in checkout session');
    return;
  }

  const { appId, appName, creatorId, isGuest } = metadata;
  const customerEmail = session.customer_details?.email;

  if (!customerEmail) {
    console.error('No customer email in checkout session');
    return;
  }

  const normalizedEmail = customerEmail.toLowerCase();

  console.log(`   Email: ${normalizedEmail}`);
  console.log(`   App: ${appName}`);
  console.log(`   Guest: ${isGuest}`);

  // 1. Find or create user (auto-create CUSTOMER account for guests)
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  let isNewUser = false;

  if (!user) {
    // Auto-create CUSTOMER account
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: session.customer_details?.name || normalizedEmail.split('@')[0],
        role: 'CUSTOMER', // Not a creator
        stripeCustomerId: session.customer as string,
      },
    });

    isNewUser = true;
    console.log(`   ✅ Auto-created CUSTOMER account: ${normalizedEmail}`);
  } else if (!user.stripeCustomerId && session.customer) {
    // Update existing user with Stripe customer ID
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: session.customer as string },
    });
  }

  // 2. Get app
  const app = await prisma.publishedApp.findUnique({
    where: { id: appId },
  });

  if (!app) {
    console.error(`App not found: ${appId}`);
    return;
  }

  // 3. Check if subscription already exists
  const existingSubscription = await prisma.appSubscription.findFirst({
    where: {
      userId: user.id,
      publishedAppId: app.id,
      status: 'ACTIVE',
    },
  });

  if (existingSubscription) {
    console.log(`   Subscription already exists, skipping`);
    return;
  }

  // 4. Create app subscription
  const subscription = await prisma.appSubscription.create({
    data: {
      userId: user.id,
      publishedAppId: app.id,
      status: 'ACTIVE',
      startedAt: new Date(),
      stripeSubscriptionId: session.subscription as string | null,
    },
  });

  console.log(`   ✅ App subscription created: ${subscription.id}`);

  // 5. Update app customer count
  await prisma.publishedApp.update({
    where: { id: app.id },
    data: {
      totalCustomers: { increment: 1 },
    },
  });

  // 6. Create transaction record
  const amount = session.amount_total || 0;
  await prisma.transaction.create({
    data: {
      userId: user.id,
      publishedAppId: app.id,
      amount,
      currency: session.currency?.toUpperCase() || 'USD',
      type: 'SUBSCRIPTION_PAYMENT',
      status: 'SUCCEEDED',
      description: `Purchase of ${app.name}`,
      stripePaymentIntentId: session.payment_intent as string,
    },
  });

  console.log(`   ✅ Transaction recorded: $${amount / 100}`);

  // 7. Calculate creator revenue (platform fee)
  const platformFeePercent = 8; // 8% platform fee
  const creatorAmount = Math.round(amount * (100 - platformFeePercent) / 100);

  await prisma.publishedApp.update({
    where: { id: app.id },
    data: {
      totalRevenue: { increment: creatorAmount },
      monthlyRecurring: {
        increment: app.pricingModel === 'SUBSCRIPTION' ? creatorAmount : 0,
      },
    },
  });

  console.log(`   ✅ Creator revenue: $${creatorAmount / 100} (${platformFeePercent}% fee)`);

  // 8. Generate magic link and send email
  const magicLink = await generateMagicLink(user.id);

  await sendMagicLinkEmail({
    to: normalizedEmail,
    appName: app.name,
    magicLink,
    isNewUser,
    isPurchase: true,
  });

  console.log(`   ✅ Magic link email sent to ${normalizedEmail}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`💰 Payment succeeded: ${invoice.id}`);

  // Find subscription and record recurring payment
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return; // One-time payment, already handled in checkout.session.completed
  }

  const subscription = await prisma.appSubscription.findFirst({
    where: {
      stripeSubscriptionId: subscriptionId,
    },
    include: {
      publishedApp: true,
      user: true,
    },
  });

  if (!subscription) {
    console.error(`Subscription not found for Stripe ID: ${subscriptionId}`);
    return;
  }

  // Record transaction
  const amount = invoice.amount_paid;
  await prisma.transaction.create({
    data: {
      userId: subscription.userId,
      publishedAppId: subscription.publishedAppId,
      amount,
      currency: invoice.currency.toUpperCase(),
      type: 'SUBSCRIPTION_PAYMENT',
      status: 'SUCCEEDED',
      description: `Recurring payment for ${subscription.publishedApp.name}`,
      stripePaymentIntentId: invoice.payment_intent as string,
    },
  });

  console.log(`   ✅ Recurring payment recorded: $${amount / 100}`);

  // Update creator revenue
  const platformFeePercent = 8;
  const creatorAmount = Math.round(amount * (100 - platformFeePercent) / 100);

  await prisma.publishedApp.update({
    where: { id: subscription.publishedAppId },
    data: {
      totalRevenue: { increment: creatorAmount },
    },
  });

  console.log(`   ✅ Creator revenue updated: +$${creatorAmount / 100}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`❌ Subscription cancelled: ${subscription.id}`);

  // Find and cancel app subscription
  const appSubscription = await prisma.appSubscription.findFirst({
    where: {
      stripeSubscriptionId: subscription.id,
    },
  });

  if (!appSubscription) {
    console.error(`App subscription not found for Stripe ID: ${subscription.id}`);
    return;
  }

  await prisma.appSubscription.update({
    where: { id: appSubscription.id },
    data: {
      status: 'CANCELLED',
      endedAt: new Date(),
    },
  });

  // Update app customer count
  await prisma.publishedApp.update({
    where: { id: appSubscription.publishedAppId },
    data: {
      totalCustomers: { decrement: 1 },
    },
  });

  console.log(`   ✅ App subscription cancelled`);
}
