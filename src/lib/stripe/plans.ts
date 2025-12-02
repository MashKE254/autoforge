/**
 * Platform Pricing Plans
 * 
 * File: src/lib/stripe/plans.ts
 * 
 * Defines the pricing tiers for AutoForge creators.
 * These prices should be created in Stripe Dashboard first.
 */

import { PlanTier } from '@prisma/client';

// =============================================================================
// PLAN CONFIGURATION
// =============================================================================

export interface PlanConfig {
  id: PlanTier;
  name: string;
  description: string;
  
  // Pricing
  monthlyPrice: number;  // In dollars
  yearlyPrice: number;   // In dollars (with discount)
  
  // Stripe Price IDs (set via environment variables)
  stripePriceMonthly: string;
  stripePriceYearly: string;
  
  // Limits
  maxPublishedApps: number;
  platformFeePercent: number;
  
  // Features
  features: string[];
  
  // UI
  popular?: boolean;
  badge?: string;
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    description: 'Perfect for getting started with your first SaaS',
    
    monthlyPrice: 49,
    yearlyPrice: 470,  // ~20% off
    
    stripePriceMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    stripePriceYearly: process.env.STRIPE_PRICE_STARTER_YEARLY || '',
    
    maxPublishedApps: 5,
    platformFeePercent: 8,
    
    features: [
      'Up to 5 published apps',
      'Unlimited generations',
      'Live preview & code editor',
      'One-click Vercel deployment',
      'Stripe payment integration',
      '8% platform fee on revenue',
      'Email support',
    ],
  },
  
  PRO: {
    id: 'PRO',
    name: 'Pro',
    description: 'For creators scaling their SaaS portfolio',
    
    monthlyPrice: 99,
    yearlyPrice: 950,  // ~20% off
    
    stripePriceMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    stripePriceYearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
    
    maxPublishedApps: 20,
    platformFeePercent: 6,
    
    features: [
      'Up to 20 published apps',
      'Everything in Starter',
      'Custom domains',
      'Priority code generation',
      'Advanced analytics',
      '6% platform fee on revenue',
      'Priority support',
    ],
    
    popular: true,
    badge: 'Most Popular',
  },
  
  BUSINESS: {
    id: 'BUSINESS',
    name: 'Business',
    description: 'For agencies and power users',
    
    monthlyPrice: 249,
    yearlyPrice: 2390,  // ~20% off
    
    stripePriceMonthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '',
    stripePriceYearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY || '',
    
    maxPublishedApps: -1,  // Unlimited
    platformFeePercent: 4,
    
    features: [
      'Unlimited published apps',
      'Everything in Pro',
      'White-label options',
      'Team collaboration (coming soon)',
      'API access',
      '4% platform fee on revenue',
      'Dedicated support',
    ],
  },
  
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Custom solutions for large organizations',
    
    monthlyPrice: 0,  // Custom pricing
    yearlyPrice: 0,
    
    stripePriceMonthly: '',  // Custom
    stripePriceYearly: '',
    
    maxPublishedApps: -1,
    platformFeePercent: 2,  // Negotiable
    
    features: [
      'Everything in Business',
      'Custom platform fee',
      'SLA guarantee',
      'Custom integrations',
      'Dedicated account manager',
      'On-premise options',
      'Custom contracts',
    ],
    
    badge: 'Contact Sales',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get plan by ID
 */
export function getPlan(planId: PlanTier): PlanConfig {
  return PLANS[planId];
}

/**
 * Get platform fee percentage for a plan
 */
export function getPlatformFeePercent(planId: PlanTier): number {
  return PLANS[planId].platformFeePercent;
}

/**
 * Check if user can publish more apps
 */
export function canPublishMoreApps(
  planId: PlanTier, 
  currentAppCount: number
): boolean {
  const maxApps = PLANS[planId].maxPublishedApps;
  if (maxApps === -1) return true;  // Unlimited
  return currentAppCount < maxApps;
}

/**
 * Get all plans as array (for rendering)
 */
export function getAllPlans(): PlanConfig[] {
  return Object.values(PLANS);
}

/**
 * Get displayable plans (exclude Enterprise from regular pricing page)
 */
export function getDisplayablePlans(): PlanConfig[] {
  return [PLANS.STARTER, PLANS.PRO, PLANS.BUSINESS];
}

/**
 * Format price for display
 */
export function formatPlanPrice(plan: PlanConfig, yearly: boolean = false): string {
  if (plan.id === 'ENTERPRISE') return 'Custom';
  
  const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
  const period = yearly ? '/year' : '/month';
  
  return `$${price}${period}`;
}

/**
 * Calculate yearly savings
 */
export function calculateYearlySavings(plan: PlanConfig): number {
  if (plan.id === 'ENTERPRISE') return 0;
  return (plan.monthlyPrice * 12) - plan.yearlyPrice;
}
