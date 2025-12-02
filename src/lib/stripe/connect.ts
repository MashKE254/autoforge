/**
 * Stripe Connect Helpers
 * 
 * File: src/lib/stripe/connect.ts
 * 
 * Functions for managing Stripe Connect Express accounts,
 * including onboarding, payouts, and transfers.
 */

import { stripe, calculateNetAmount } from './client';
import { prisma } from '../prisma';
import { getPlatformFeePercent } from './plans';
import type { PlanTier } from '@prisma/client';

// =============================================================================
// CONNECT ACCOUNT MANAGEMENT
// =============================================================================

/**
 * Create a Stripe Connect Express account for a creator
 */
export async function createConnectAccount(
  userId: string,
  email: string,
  country: string = 'US'
): Promise<{
  accountId: string;
  onboardingUrl: string;
}> {
  // Check if account already exists
  const existing = await prisma.stripeConnectedAccount.findUnique({
    where: { userId },
  });
  
  if (existing) {
    // Return refresh link if onboarding incomplete
    if (!existing.onboardingComplete) {
      const link = await createOnboardingLink(existing.stripeAccountId);
      return {
        accountId: existing.stripeAccountId,
        onboardingUrl: link.url,
      };
    }
    
    throw new Error('Connect account already exists and is complete');
  }
  
  // Create new Express account
  const account = await stripe.accounts.create({
    type: 'express',
    country,
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    metadata: {
      autoforge_user_id: userId,
    },
  });
  
  // Save to database
  await prisma.stripeConnectedAccount.create({
    data: {
      userId,
      stripeAccountId: account.id,
      country,
      accountType: 'express',
    },
  });
  
  // Create onboarding link
  const link = await createOnboardingLink(account.id);
  
  return {
    accountId: account.id,
    onboardingUrl: link.url,
  };
}

/**
 * Create an onboarding link for a Connect account
 */
export async function createOnboardingLink(
  accountId: string
): Promise<{ url: string }> {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connect/refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connect/complete`,
    type: 'account_onboarding',
  });
  
  return { url: accountLink.url };
}

/**
 * Create a login link for an existing Connect account
 */
export async function createDashboardLink(
  accountId: string
): Promise<{ url: string }> {
  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return { url: loginLink.url };
}

/**
 * Get Connect account status
 */
export async function getConnectAccountStatus(userId: string): Promise<{
  exists: boolean;
  accountId?: string;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
} | null> {
  const account = await prisma.stripeConnectedAccount.findUnique({
    where: { userId },
  });
  
  if (!account) {
    return {
      exists: false,
      onboardingComplete: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    };
  }
  
  // Fetch latest status from Stripe
  const stripeAccount = await stripe.accounts.retrieve(account.stripeAccountId);
  
  // Update local record
  await prisma.stripeConnectedAccount.update({
    where: { userId },
    data: {
      chargesEnabled: stripeAccount.charges_enabled,
      payoutsEnabled: stripeAccount.payouts_enabled,
      detailsSubmitted: stripeAccount.details_submitted,
      onboardingComplete: 
        stripeAccount.charges_enabled && 
        stripeAccount.payouts_enabled && 
        stripeAccount.details_submitted,
      businessName: stripeAccount.business_profile?.name || undefined,
    },
  });
  
  return {
    exists: true,
    accountId: account.stripeAccountId,
    onboardingComplete: 
      stripeAccount.charges_enabled && 
      stripeAccount.payouts_enabled && 
      stripeAccount.details_submitted,
    chargesEnabled: stripeAccount.charges_enabled,
    payoutsEnabled: stripeAccount.payouts_enabled,
    detailsSubmitted: stripeAccount.details_submitted,
  };
}

// =============================================================================
// PAYMENT PROCESSING (For published apps)
// =============================================================================

/**
 * Create a checkout session for a published app (on connected account)
 */
export async function createAppCheckoutSession(params: {
  publishedAppId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionId: string; url: string }> {
  const { publishedAppId, customerEmail, successUrl, cancelUrl } = params;
  
  // Get the published app with creator info
  const app = await prisma.publishedApp.findUnique({
    where: { id: publishedAppId },
    include: {
      user: {
        include: {
          connectedAccount: true,
          subscription: true,
        },
      },
    },
  });
  
  if (!app) {
    throw new Error('Published app not found');
  }
  
  if (!app.user.connectedAccount?.stripeAccountId) {
    throw new Error('Creator has not connected Stripe');
  }
  
  if (!app.user.connectedAccount.chargesEnabled) {
    throw new Error('Creator\'s Stripe account cannot accept charges');
  }
  
  // Determine price ID based on pricing model
  let priceId: string;
  let mode: 'subscription' | 'payment';
  
  if (app.pricingModel === 'SUBSCRIPTION') {
    if (!app.stripePriceMonthly) {
      throw new Error('Monthly price not configured');
    }
    priceId = app.stripePriceMonthly;
    mode = 'subscription';
  } else if (app.pricingModel === 'ONE_TIME') {
    if (!app.stripePriceOneTime) {
      throw new Error('One-time price not configured');
    }
    priceId = app.stripePriceOneTime;
    mode = 'payment';
  } else {
    throw new Error('Invalid pricing model');
  }
  
  // Get platform fee percentage based on creator's plan
  const creatorPlan = app.user.subscription?.plan || 'STARTER';
  const platformFeePercent = getPlatformFeePercent(creatorPlan as PlanTier);
  
  // Create checkout session on the connected account
  const session = await stripe.checkout.sessions.create({
    mode,
    customer_email: customerEmail,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    payment_intent_data: mode === 'payment' ? {
      application_fee_amount: calculateApplicationFee(
        app.oneTimePrice || 0,
        platformFeePercent
      ),
      transfer_data: {
        destination: app.user.connectedAccount.stripeAccountId,
      },
    } : undefined,
    subscription_data: mode === 'subscription' ? {
      application_fee_percent: platformFeePercent,
      transfer_data: {
        destination: app.user.connectedAccount.stripeAccountId,
      },
    } : undefined,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      published_app_id: publishedAppId,
      creator_user_id: app.userId,
      platform_fee_percent: platformFeePercent.toString(),
    },
  }, {
    stripeAccount: app.user.connectedAccount.stripeAccountId,
  });
  
  return {
    sessionId: session.id,
    url: session.url!,
  };
}

/**
 * Calculate application fee in cents
 */
function calculateApplicationFee(
  amountCents: number,
  feePercent: number
): number {
  return Math.round(amountCents * (feePercent / 100));
}

// =============================================================================
// PRODUCT/PRICE CREATION (For published apps)
// =============================================================================

/**
 * Create Stripe product and prices for a published app
 */
export async function createAppStripeProduct(params: {
  publishedAppId: string;
  name: string;
  description?: string;
  monthlyPrice?: number;  // In cents
  yearlyPrice?: number;   // In cents
  oneTimePrice?: number;  // In cents
  connectedAccountId: string;
}): Promise<{
  productId: string;
  priceMonthly?: string;
  priceYearly?: string;
  priceOneTime?: string;
}> {
  const { 
    publishedAppId, 
    name, 
    description, 
    monthlyPrice, 
    yearlyPrice, 
    oneTimePrice,
    connectedAccountId 
  } = params;
  
  // Create product on connected account
  const product = await stripe.products.create({
    name,
    description: description || `Access to ${name}`,
    metadata: {
      autoforge_app_id: publishedAppId,
    },
  }, {
    stripeAccount: connectedAccountId,
  });
  
  const result: {
    productId: string;
    priceMonthly?: string;
    priceYearly?: string;
    priceOneTime?: string;
  } = {
    productId: product.id,
  };
  
  // Create monthly subscription price
  if (monthlyPrice && monthlyPrice > 0) {
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: monthlyPrice,
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        autoforge_app_id: publishedAppId,
        interval: 'monthly',
      },
    }, {
      stripeAccount: connectedAccountId,
    });
    result.priceMonthly = price.id;
  }
  
  // Create yearly subscription price
  if (yearlyPrice && yearlyPrice > 0) {
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: yearlyPrice,
      currency: 'usd',
      recurring: {
        interval: 'year',
      },
      metadata: {
        autoforge_app_id: publishedAppId,
        interval: 'yearly',
      },
    }, {
      stripeAccount: connectedAccountId,
    });
    result.priceYearly = price.id;
  }
  
  // Create one-time price
  if (oneTimePrice && oneTimePrice > 0) {
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: oneTimePrice,
      currency: 'usd',
      metadata: {
        autoforge_app_id: publishedAppId,
        type: 'one_time',
      },
    }, {
      stripeAccount: connectedAccountId,
    });
    result.priceOneTime = price.id;
  }
  
  // Update published app with Stripe IDs
  await prisma.publishedApp.update({
    where: { id: publishedAppId },
    data: {
      stripeProductId: product.id,
      stripePriceMonthly: result.priceMonthly,
      stripePriceYearly: result.priceYearly,
      stripePriceOneTime: result.priceOneTime,
    },
  });
  
  return result;
}

// =============================================================================
// PAYOUT MANAGEMENT
// =============================================================================

/**
 * Get pending balance for a creator
 */
export async function getCreatorBalance(userId: string): Promise<{
  available: number;
  pending: number;
  currency: string;
}> {
  const account = await prisma.stripeConnectedAccount.findUnique({
    where: { userId },
  });
  
  if (!account) {
    return { available: 0, pending: 0, currency: 'usd' };
  }
  
  const balance = await stripe.balance.retrieve({
    stripeAccount: account.stripeAccountId,
  });
  
  // Get USD balance (or first available currency)
  const available = balance.available.find(b => b.currency === 'usd') || balance.available[0];
  const pending = balance.pending.find(b => b.currency === 'usd') || balance.pending[0];
  
  return {
    available: available?.amount || 0,
    pending: pending?.amount || 0,
    currency: available?.currency || 'usd',
  };
}

/**
 * Get payout history for a creator
 */
export async function getPayoutHistory(
  userId: string,
  limit: number = 10
): Promise<Array<{
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
  arrivedAt?: Date;
}>> {
  const payouts = await prisma.payout.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  
  return payouts.map(p => ({
    id: p.id,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    createdAt: p.createdAt,
    arrivedAt: p.arrivedAt || undefined,
  }));
}

// =============================================================================
// REVENUE ANALYTICS
// =============================================================================

/**
 * Get revenue summary for a creator
 */
export async function getCreatorRevenueSummary(userId: string): Promise<{
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  todayRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
}> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Get all apps for this creator
  const apps = await prisma.publishedApp.findMany({
    where: { userId },
    select: { id: true },
  });
  
  const appIds = apps.map(a => a.id);
  
  if (appIds.length === 0) {
    return {
      totalRevenue: 0,
      monthlyRevenue: 0,
      weeklyRevenue: 0,
      todayRevenue: 0,
      totalTransactions: 0,
      averageTransactionValue: 0,
    };
  }
  
  // Aggregate transactions
  const [total, monthly, weekly, today, count] = await Promise.all([
    prisma.transaction.aggregate({
      where: { 
        publishedAppId: { in: appIds },
        status: 'SUCCEEDED',
      },
      _sum: { netAmount: true },
    }),
    prisma.transaction.aggregate({
      where: { 
        publishedAppId: { in: appIds },
        status: 'SUCCEEDED',
        createdAt: { gte: startOfMonth },
      },
      _sum: { netAmount: true },
    }),
    prisma.transaction.aggregate({
      where: { 
        publishedAppId: { in: appIds },
        status: 'SUCCEEDED',
        createdAt: { gte: startOfWeek },
      },
      _sum: { netAmount: true },
    }),
    prisma.transaction.aggregate({
      where: { 
        publishedAppId: { in: appIds },
        status: 'SUCCEEDED',
        createdAt: { gte: startOfDay },
      },
      _sum: { netAmount: true },
    }),
    prisma.transaction.count({
      where: { 
        publishedAppId: { in: appIds },
        status: 'SUCCEEDED',
      },
    }),
  ]);
  
  const totalRevenue = total._sum.netAmount || 0;
  
  return {
    totalRevenue,
    monthlyRevenue: monthly._sum.netAmount || 0,
    weeklyRevenue: weekly._sum.netAmount || 0,
    todayRevenue: today._sum.netAmount || 0,
    totalTransactions: count,
    averageTransactionValue: count > 0 ? Math.round(totalRevenue / count) : 0,
  };
}
