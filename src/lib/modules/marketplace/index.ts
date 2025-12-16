/**
 * Marketplace Module
 *
 * Provides revenue sharing, fee calculation, and marketplace logic
 * for monetizing generated applications
 */

export interface MarketplaceModuleConfig {
  platformFeePercent: number;
  stripeFeePercent: number;
  payoutSchedule: 'daily' | 'weekly' | 'monthly';
  minimumPayout: number; // in cents
}

export interface MarketplaceModuleOutput {
  files: Array<{ path: string; content: string }>;
  envVars: string[];
  dependencies: string[];
  instructions: string[];
}

const feeCalculator = `export interface FeeBreakdown {
  grossAmount: number;
  platformFee: number;
  stripeFee: number;
  netAmount: number;
}

export function calculateFees(
  grossAmount: number,
  platformFeePercent: number = 7,
  stripeFeePercent: number = 2.9,
  stripeFixedFee: number = 30
): FeeBreakdown {
  const stripeFee = Math.round((grossAmount * stripeFeePercent / 100) + stripeFixedFee);
  const platformFee = Math.round(grossAmount * platformFeePercent / 100);
  const netAmount = grossAmount - stripeFee - platformFee;

  return {
    grossAmount,
    platformFee,
    stripeFee,
    netAmount,
  };
}

export function calculateCreatorEarnings(transactions: Array<{ amount: number }>, fees: { platform: number; stripe: number }) {
  const grossRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
  return calculateFees(grossRevenue, fees.platform, fees.stripe);
}`;

const payoutScheduler = `import { inngest } from './client';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const processPayouts = inngest.createFunction(
  { id: 'process-payouts', name: 'Process Creator Payouts' },
  { cron: 'TZ=America/New_York 0 0 * * MON' }, // Every Monday at midnight
  async ({ step }) => {
    const creators = await step.run('fetch-creators', async () => {
      return await prisma.user.findMany({
        where: {
          stripeConnectedAccount: {
            isNot: null,
            onboardingComplete: true,
          },
        },
        include: {
          stripeConnectedAccount: true,
        },
      });
    });

    for (const creator of creators) {
      await step.run(\`payout-\${creator.id}\`, async () => {
        // Calculate pending balance
        const transactions = await prisma.transaction.findMany({
          where: {
            creatorId: creator.id,
            payoutId: null,
            status: 'completed',
          },
        });

        const totalAmount = transactions.reduce((sum, t) => sum + t.creatorAmount, 0);

        // Check minimum payout threshold ($50)
        if (totalAmount < 5000) {
          console.log(\`Creator \${creator.id} below minimum payout threshold\`);
          return;
        }

        // Create Stripe payout
        const payout = await stripe.payouts.create(
          {
            amount: totalAmount,
            currency: 'usd',
          },
          {
            stripeAccount: creator.stripeConnectedAccount!.accountId,
          }
        );

        // Record payout in database
        const payoutRecord = await prisma.payout.create({
          data: {
            userId: creator.id,
            amount: totalAmount,
            stripePayoutId: payout.id,
            status: 'processing',
          },
        });

        // Link transactions to payout
        await prisma.transaction.updateMany({
          where: {
            id: { in: transactions.map(t => t.id) },
          },
          data: {
            payoutId: payoutRecord.id,
          },
        });

        console.log(\`Created payout for creator \${creator.id}: \$\${totalAmount / 100}\`);
      });
    }

    return { processed: creators.length };
  }
);`;

const revenueAnalytics = `import { prisma } from '@/lib/prisma';

export async function getCreatorEarnings(userId: string) {
  const transactions = await prisma.transaction.findMany({
    where: { creatorId: userId },
    orderBy: { createdAt: 'desc' },
  });

  const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalFees = transactions.reduce((sum, t) => sum + t.platformFee + t.stripeFee, 0);
  const netEarnings = transactions.reduce((sum, t) => sum + t.creatorAmount, 0);

  const pendingBalance = transactions
    .filter(t => !t.payoutId && t.status === 'completed')
    .reduce((sum, t) => sum + t.creatorAmount, 0);

  const paidOut = await prisma.payout.aggregate({
    where: { userId, status: 'paid' },
    _sum: { amount: true },
  });

  return {
    totalRevenue,
    totalFees,
    netEarnings,
    pendingBalance,
    paidOut: paidOut._sum.amount || 0,
    transactions: transactions.length,
  };
}

export async function getMarketplaceAnalytics() {
  const totalRevenue = await prisma.transaction.aggregate({
    _sum: { amount: true },
  });

  const platformFees = await prisma.transaction.aggregate({
    _sum: { platformFee: true },
  });

  const creators = await prisma.user.count({
    where: {
      stripeConnectedAccount: { isNot: null },
    },
  });

  const apps = await prisma.publishedApp.count({
    where: { status: 'PUBLISHED' },
  });

  return {
    totalRevenue: totalRevenue._sum.amount || 0,
    platformRevenue: platformFees._sum.platformFee || 0,
    activeCreators: creators,
    publishedApps: apps,
  };
}`;

export function generateMarketplaceModule(config: MarketplaceModuleConfig): MarketplaceModuleOutput {
  const files: Array<{ path: string; content: string }> = [
    { path: 'lib/marketplace/fee-calculator.ts', content: feeCalculator },
    { path: 'lib/marketplace/analytics.ts', content: revenueAnalytics },
    { path: 'inngest/process-payouts.ts', content: payoutScheduler },
  ];

  const envVars = ['STRIPE_SECRET_KEY'];
  const dependencies = ['stripe'];
  const instructions = [
    'Platform fee: ' + config.platformFeePercent + '%',
    'Stripe fee: ' + config.stripeFeePercent + '% + $0.30',
    'Payout schedule: ' + config.payoutSchedule,
    'Minimum payout: $' + (config.minimumPayout / 100),
  ];

  return { files, envVars, dependencies, instructions };
}

export function getMarketplaceModulePrompt(config: MarketplaceModuleConfig): string {
  return \`## Marketplace Module\n\nPlatform Fee: \${config.platformFeePercent}%\nPayout Schedule: \${config.payoutSchedule}\nMinimum Payout: \$\${config.minimumPayout / 100}\n\nIncludes revenue sharing, automated payouts, and analytics.\`;
}
