/**
 * Platform Stripe Webhook Handler
 * 
 * File: src/app/api/stripe/webhook/route.ts
 * 
 * Handles Stripe webhooks for platform subscriptions:
 * - checkout.session.completed
 * - customer.subscription.created/updated/deleted
 * - invoice.paid/payment_failed
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe/client';
import { prisma } from '@/lib/prisma';
import { SubscriptionStatus, PlanTier } from '@prisma/client';
import type Stripe from 'stripe';

// =============================================================================
// WEBHOOK CONFIGURATION
// =============================================================================

// Disable body parsing - we need raw body for signature verification
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// =============================================================================
// POST: Handle webhook events
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Get raw body and signature
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // 2. Verify webhook signature
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log(`📨 Received webhook: ${event.type}`);

    // 3. Handle event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
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

// =============================================================================
// EVENT HANDLERS
// =============================================================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout.session.completed');

  // Only handle subscription checkouts
  if (session.mode !== 'subscription') {
    return;
  }

  const userId = session.metadata?.autoforge_user_id;
  const planTier = session.metadata?.plan_tier as PlanTier;

  if (!userId || !planTier) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  // Extract period end - handle API property name
  const subData = subscription as unknown as Record<string, unknown>;
  const periodEnd = (subData.current_period_end || subData.currentPeriodEnd) as number;
  const trialEnd = (subData.trial_end || subData.trialEnd) as number | undefined;

  // Create or update subscription record
  await prisma.creatorSubscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      stripeCurrentPeriodEnd: new Date(periodEnd * 1000),
      status: mapStripeStatus(subscription.status),
      plan: planTier,
      trialEndsAt: trialEnd ? new Date(trialEnd * 1000) : null,
    },
    update: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      stripeCurrentPeriodEnd: new Date(periodEnd * 1000),
      status: mapStripeStatus(subscription.status),
      plan: planTier,
      trialEndsAt: trialEnd ? new Date(trialEnd * 1000) : null,
    },
  });

  console.log(`✅ Subscription created for user ${userId}: ${planTier}`);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Processing customer.subscription.created');
  
  // Get user from customer
  const customer = await stripe.customers.retrieve(
    subscription.customer as string
  );
  
  if (customer.deleted) return;

  const userId = customer.metadata?.autoforge_user_id;
  if (!userId) {
    console.error('No user ID in customer metadata');
    return;
  }

  const planTier = (subscription.metadata?.plan_tier as PlanTier) || 'STARTER';

  // Extract period end - handle API property name
  const subData = subscription as unknown as Record<string, unknown>;
  const periodEnd = (subData.current_period_end || subData.currentPeriodEnd) as number;
  const trialEnd = (subData.trial_end || subData.trialEnd) as number | undefined;

  await prisma.creatorSubscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      stripeCurrentPeriodEnd: new Date(periodEnd * 1000),
      status: mapStripeStatus(subscription.status),
      plan: planTier,
      trialEndsAt: trialEnd ? new Date(trialEnd * 1000) : null,
    },
    update: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      stripeCurrentPeriodEnd: new Date(periodEnd * 1000),
      status: mapStripeStatus(subscription.status),
      plan: planTier,
    },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Processing customer.subscription.updated');

  // Find subscription by Stripe ID
  const existingSub = await prisma.creatorSubscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!existingSub) {
    console.error(`Subscription not found: ${subscription.id}`);
    return;
  }

  // Extract properties - handle API property names
  const subData = subscription as unknown as Record<string, unknown>;
  const periodEnd = (subData.current_period_end || subData.currentPeriodEnd) as number;
  const cancelAtPeriodEnd = (subData.cancel_at_period_end || subData.cancelAtPeriodEnd) as boolean;
  const canceledAt = (subData.canceled_at || subData.canceledAt) as number | undefined;

  await prisma.creatorSubscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      stripePriceId: subscription.items.data[0].price.id,
      stripeCurrentPeriodEnd: new Date(periodEnd * 1000),
      status: mapStripeStatus(subscription.status),
      cancelAtPeriodEnd,
      canceledAt: canceledAt ? new Date(canceledAt * 1000) : null,
    },
  });

  console.log(`✅ Subscription updated: ${subscription.id}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Processing customer.subscription.deleted');

  await prisma.creatorSubscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: 'CANCELED',
      canceledAt: new Date(),
    },
  });

  console.log(`✅ Subscription canceled: ${subscription.id}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log('Processing invoice.paid');

  // Extract subscription ID - handle API property name
  const invoiceData = invoice as unknown as Record<string, unknown>;
  const subscriptionId = invoiceData.subscription as string | undefined;

  if (!subscriptionId) return;

  // Update subscription period end
  await prisma.creatorSubscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status: 'ACTIVE',
      stripeCurrentPeriodEnd: new Date(invoice.period_end * 1000),
    },
  });

  console.log(`✅ Invoice paid for subscription: ${subscriptionId}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing invoice.payment_failed');

  // Extract subscription ID - handle API property name
  const invoiceData = invoice as unknown as Record<string, unknown>;
  const subscriptionId = invoiceData.subscription as string | undefined;

  if (!subscriptionId) return;

  await prisma.creatorSubscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status: 'PAST_DUE',
    },
  });

  console.log(`⚠️ Payment failed for subscription: ${subscriptionId}`);

  // TODO: Send email notification to user
}

// =============================================================================
// HELPERS
// =============================================================================

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    incomplete: 'INCOMPLETE',
    incomplete_expired: 'INCOMPLETE_EXPIRED',
    trialing: 'TRIALING',
    unpaid: 'UNPAID',
    paused: 'PAUSED',
  };

  return statusMap[status] || 'ACTIVE';
}
