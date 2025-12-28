/**
 * Stripe Client Configuration
 * 
 * File: src/lib/stripe/client.ts
 * 
 * Initializes Stripe with proper configuration for both platform
 * operations and Connect operations.
 */

import Stripe from 'stripe';

// =============================================================================
// STRIPE CLIENT INSTANCE
// =============================================================================

const SIMULATION_MODE = process.env.SIMULATE_INFRASTRUCTURE === 'true';
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

if (!SIMULATION_MODE && !STRIPE_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables. Set SIMULATE_INFRASTRUCTURE=true to test without Stripe.');
}

export const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, {
  apiVersion: '2025-11-17.clover', // Use latest stable API version
  typescript: true,
  appInfo: {
    name: 'AutoForge',
    version: '1.0.0',
    url: 'https://autoforge.ai',
  },
}) : null as any; // Null in simulation mode

export const isSimulationMode = () => SIMULATION_MODE || !STRIPE_KEY;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format amount from cents to display string
 */
export function formatAmount(cents: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/**
 * Convert dollars to cents
 */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars
 */
export function toDollars(cents: number): number {
  return cents / 100;
}

/**
 * Calculate platform fee (8% by default)
 */
export function calculatePlatformFee(
  amount: number, 
  feePercent: number = 8
): number {
  return Math.round(amount * (feePercent / 100));
}

/**
 * Calculate net amount after Stripe fee (~2.9% + 30¢) and platform fee
 */
export function calculateNetAmount(
  grossAmount: number,
  platformFeePercent: number = 8
): {
  grossAmount: number;
  stripeFee: number;
  platformFee: number;
  netAmount: number;
} {
  // Stripe fee: 2.9% + 30¢
  const stripeFee = Math.round(grossAmount * 0.029) + 30;
  
  // Platform fee: 8% of gross
  const platformFee = calculatePlatformFee(grossAmount, platformFeePercent);
  
  // Net to creator
  const netAmount = grossAmount - stripeFee - platformFee;
  
  return {
    grossAmount,
    stripeFee,
    platformFee,
    netAmount,
  };
}

// =============================================================================
// STRIPE EVENT TYPES
// =============================================================================

export const PLATFORM_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
  'customer.created',
  'customer.updated',
] as const;

export const CONNECT_WEBHOOK_EVENTS = [
  'account.updated',
  'account.application.authorized',
  'account.application.deauthorized',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.succeeded',
  'charge.refunded',
  'charge.dispute.created',
  'payout.paid',
  'payout.failed',
] as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type { Stripe };
