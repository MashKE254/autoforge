/**
 * Stripe Connect Webhook Handler
 * 
 * File: src/app/api/stripe/connect-webhook/route.ts
 * 
 * Handles Stripe Connect webhooks for:
 * - Account updates (onboarding completion)
 * - Payments (on connected accounts)
 * - Payouts
 * - Charges/refunds
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe, calculateNetAmount } from '@/lib/stripe/client';
import { prisma } from '@/lib/prisma';
import { getPlatformFeePercent } from '@/lib/stripe/plans';
import type Stripe from 'stripe';
import { PlanTier } from '@prisma/client';

// =============================================================================
// WEBHOOK CONFIGURATION
// =============================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// =============================================================================
// POST: Handle Connect webhook events
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Get raw body and signature
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // 2. Verify webhook signature (Connect webhook secret)
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_CONNECT_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Connect webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log(`📨 Connect webhook: ${event.type}`);

    // 3. Get connected account ID
    const connectedAccountId = event.account;

    // 4. Handle event types
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(
          event.data.object as Stripe.PaymentIntent
        );
        break;

      case 'charge.succeeded':
        await handleChargeSucceeded(
          event.data.object as Stripe.Charge,
          connectedAccountId
        );
        break;

      case 'charge.refunded':
        await handleChargeRefunded(
          event.data.object as Stripe.Charge
        );
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(
          event.data.object as Stripe.Dispute
        );
        break;

      case 'payout.paid':
        await handlePayoutPaid(
          event.data.object as Stripe.Payout,
          connectedAccountId
        );
        break;

      case 'payout.failed':
        await handlePayoutFailed(
          event.data.object as Stripe.Payout
        );
        break;

      default:
        console.log(`Unhandled Connect event: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Connect webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

async function handleAccountUpdated(account: Stripe.Account) {
  console.log(`Processing account.updated for ${account.id}`);

  // Update local record
  await prisma.stripeConnectedAccount.updateMany({
    where: { stripeAccountId: account.id },
    data: {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      onboardingComplete: 
        account.charges_enabled && 
        account.payouts_enabled && 
        account.details_submitted,
      businessName: account.business_profile?.name || undefined,
      businessUrl: account.business_profile?.url || undefined,
    },
  });

  console.log(`✅ Account updated: ${account.id}`);
}

async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  console.log(`Processing payment_intent.succeeded: ${paymentIntent.id}`);

  const appId = paymentIntent.metadata?.published_app_id;
  if (!appId) {
    console.log('No app ID in payment intent metadata');
    return;
  }

  // Get the published app
  const app = await prisma.publishedApp.findUnique({
    where: { id: appId },
    include: {
      user: {
        include: { subscription: true },
      },
    },
  });

  if (!app) {
    console.error(`App not found: ${appId}`);
    return;
  }

  // Calculate fees
  const platformFeePercent = app.user.subscription?.plan 
    ? getPlatformFeePercent(app.user.subscription.plan as PlanTier)
    : 8;

  const fees = calculateNetAmount(paymentIntent.amount, platformFeePercent);

  // Create transaction record
  await prisma.transaction.create({
    data: {
      publishedAppId: appId,
      stripePaymentIntentId: paymentIntent.id,
      grossAmount: fees.grossAmount,
      stripeFee: fees.stripeFee,
      platformFee: fees.platformFee,
      netAmount: fees.netAmount,
      platformFeePercent,
      currency: paymentIntent.currency,
      type: 'ONE_TIME_PAYMENT',
      status: 'SUCCEEDED',
      customerEmail: paymentIntent.receipt_email || undefined,
    },
  });

  // Update app revenue stats
  await prisma.publishedApp.update({
    where: { id: appId },
    data: {
      totalRevenue: { increment: fees.netAmount },
      totalCustomers: { increment: 1 },
    },
  });

  console.log(`✅ Payment recorded: $${(fees.grossAmount / 100).toFixed(2)} (net: $${(fees.netAmount / 100).toFixed(2)})`);
}

async function handleChargeSucceeded(
  charge: Stripe.Charge,
  connectedAccountId?: string
) {
  console.log(`Processing charge.succeeded: ${charge.id}`);

  // If this charge is from a subscription invoice
  // Note: TypeScript types may not include all Stripe properties
  const invoiceId = 'invoice' in charge ? (charge as Record<string, unknown>).invoice : null;
  if (invoiceId && typeof invoiceId === 'string') {
    const invoice = await stripe.invoices.retrieve(
      invoiceId,
      { stripeAccount: connectedAccountId }
    );

    // Access subscription_details metadata if available
    const invoiceData = invoice as unknown as Record<string, unknown>;
    const subscriptionDetails = invoiceData.subscription_details as { metadata?: Record<string, string> } | undefined;
    const appId = subscriptionDetails?.metadata?.autoforge_app_id ||
                  invoice.metadata?.autoforge_app_id;

    if (!appId) {
      console.log('No app ID in invoice metadata');
      return;
    }

    // Get the published app
    const app = await prisma.publishedApp.findUnique({
      where: { id: appId },
      include: {
        user: {
          include: { subscription: true },
        },
      },
    });

    if (!app) {
      console.error(`App not found: ${appId}`);
      return;
    }

    // Calculate fees
    const platformFeePercent = app.user.subscription?.plan 
      ? getPlatformFeePercent(app.user.subscription.plan as PlanTier)
      : 8;

    const fees = calculateNetAmount(charge.amount, platformFeePercent);

    // Create transaction record
    await prisma.transaction.create({
      data: {
        publishedAppId: appId,
        stripeChargeId: charge.id,
        stripeInvoiceId: invoice.id,
        grossAmount: fees.grossAmount,
        stripeFee: fees.stripeFee,
        platformFee: fees.platformFee,
        netAmount: fees.netAmount,
        platformFeePercent,
        currency: charge.currency,
        type: 'SUBSCRIPTION_PAYMENT',
        status: 'SUCCEEDED',
        customerEmail: charge.billing_details?.email || undefined,
      },
    });

    // Update app revenue stats
    await prisma.publishedApp.update({
      where: { id: appId },
      data: {
        totalRevenue: { increment: fees.netAmount },
        monthlyRecurring: app.monthlyPrice || 0, // Update MRR
      },
    });

    console.log(`✅ Subscription payment recorded: $${(fees.grossAmount / 100).toFixed(2)}`);
  }
}

async function handleChargeRefunded(
  charge: Stripe.Charge
) {
  console.log(`Processing charge.refunded: ${charge.id}`);

  // Find the original transaction
  const originalTx = await prisma.transaction.findFirst({
    where: { stripeChargeId: charge.id },
    include: { publishedApp: true },
  });

  if (!originalTx) {
    console.log('Original transaction not found');
    return;
  }

  // Calculate refund amount
  const refundAmount = charge.amount_refunded;

  // Create refund transaction
  await prisma.transaction.create({
    data: {
      publishedAppId: originalTx.publishedAppId,
      stripeChargeId: charge.id,
      grossAmount: -refundAmount,
      stripeFee: 0, // Stripe doesn't refund their fee
      platformFee: -Math.round(refundAmount * (originalTx.platformFeePercent / 100)),
      netAmount: -refundAmount,
      platformFeePercent: originalTx.platformFeePercent,
      currency: charge.currency,
      type: 'REFUND',
      status: 'SUCCEEDED',
    },
  });

  // Update app revenue stats
  await prisma.publishedApp.update({
    where: { id: originalTx.publishedAppId },
    data: {
      totalRevenue: { decrement: refundAmount },
    },
  });

  console.log(`✅ Refund recorded: -$${(refundAmount / 100).toFixed(2)}`);
}

async function handleDisputeCreated(
  dispute: Stripe.Dispute
) {
  console.log(`Processing charge.dispute.created: ${dispute.id}`);

  // Find the original transaction
  const originalTx = await prisma.transaction.findFirst({
    where: { stripeChargeId: dispute.charge as string },
  });

  if (!originalTx) {
    console.log('Original transaction not found for dispute');
    return;
  }

  // Create dispute transaction
  await prisma.transaction.create({
    data: {
      publishedAppId: originalTx.publishedAppId,
      stripeChargeId: dispute.charge as string,
      grossAmount: -dispute.amount,
      stripeFee: -1500, // $15 dispute fee
      platformFee: 0,
      netAmount: -(dispute.amount + 1500),
      platformFeePercent: 0,
      currency: dispute.currency,
      type: 'CHARGEBACK',
      status: 'DISPUTED',
    },
  });

  console.log(`⚠️ Dispute created: -$${(dispute.amount / 100).toFixed(2)}`);
  
  // TODO: Send notification to creator
}

async function handlePayoutPaid(
  payout: Stripe.Payout,
  connectedAccountId?: string
) {
  console.log(`Processing payout.paid: ${payout.id}`);

  if (!connectedAccountId) return;

  // Find the creator by connected account
  const connectedAccount = await prisma.stripeConnectedAccount.findUnique({
    where: { stripeAccountId: connectedAccountId },
  });

  if (!connectedAccount) {
    console.error(`Connected account not found: ${connectedAccountId}`);
    return;
  }

  // Update or create payout record
  await prisma.payout.upsert({
    where: { stripePayoutId: payout.id },
    create: {
      userId: connectedAccount.userId,
      stripePayoutId: payout.id,
      amount: payout.amount,
      currency: payout.currency,
      status: 'PAID',
      periodStart: new Date(payout.created * 1000 - 7 * 24 * 60 * 60 * 1000), // ~week ago
      periodEnd: new Date(payout.created * 1000),
      arrivedAt: payout.arrival_date ? new Date(payout.arrival_date * 1000) : null,
    },
    update: {
      status: 'PAID',
      arrivedAt: payout.arrival_date ? new Date(payout.arrival_date * 1000) : null,
    },
  });

  console.log(`✅ Payout completed: $${(payout.amount / 100).toFixed(2)}`);
}

async function handlePayoutFailed(
  payout: Stripe.Payout
) {
  console.log(`Processing payout.failed: ${payout.id}`);

  await prisma.payout.updateMany({
    where: { stripePayoutId: payout.id },
    data: {
      status: 'FAILED',
      failureCode: payout.failure_code || undefined,
      failureMessage: payout.failure_message || undefined,
    },
  });

  console.log(`❌ Payout failed: ${payout.failure_message}`);
  
  // TODO: Send notification to creator
}
