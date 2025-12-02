/**
 * Platform Pricing Page
 * 
 * File: src/app/pricing/page.tsx
 * 
 * Shows AutoForge subscription plans for creators.
 */

'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Check, 
  Zap, 
  Sparkles, 
  ArrowRight,
  Loader2 
} from 'lucide-react';

// Plan data
const plans = [
  {
    id: 'STARTER',
    name: 'Starter',
    description: 'Perfect for getting started with your first SaaS',
    monthlyPrice: 49,
    yearlyPrice: 470,
    platformFee: 8,
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
  {
    id: 'PRO',
    name: 'Pro',
    description: 'For creators scaling their SaaS portfolio',
    monthlyPrice: 99,
    yearlyPrice: 950,
    platformFee: 6,
    popular: true,
    features: [
      'Up to 20 published apps',
      'Everything in Starter',
      'Custom domains',
      'Priority code generation',
      'Advanced analytics',
      '6% platform fee on revenue',
      'Priority support',
    ],
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    description: 'For agencies and power users',
    monthlyPrice: 249,
    yearlyPrice: 2390,
    platformFee: 4,
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
];

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    if (!session) {
      // Redirect to login with return URL
      router.push(`/login?callbackUrl=/pricing&plan=${planId}`);
      return;
    }

    setLoadingPlan(planId);

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingInterval: isYearly ? 'yearly' : 'monthly',
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Header */}
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            <span>14-day free trial on all plans</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Start free, then pay as you grow. No hidden fees. Cancel anytime.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <span className={isYearly ? 'text-gray-400' : 'text-white font-medium'}>
              Monthly
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                isYearly ? 'bg-violet-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${
                  isYearly ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={!isYearly ? 'text-gray-400' : 'text-white font-medium'}>
              Yearly
              <span className="ml-2 text-xs text-green-400">Save 20%</span>
            </span>
          </div>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="max-w-7xl mx-auto px-4 pb-24">
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 ${
                plan.popular
                  ? 'bg-gradient-to-b from-violet-600/20 to-transparent border-2 border-violet-500/50'
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-violet-600 text-white text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-gray-400 text-sm">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    ${isYearly ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice}
                  </span>
                  <span className="text-gray-400">/month</span>
                </div>
                {isYearly && (
                  <p className="text-sm text-gray-400 mt-1">
                    ${plan.yearlyPrice} billed annually
                  </p>
                )}
                <div className="mt-2 inline-flex items-center gap-1 text-sm text-violet-400">
                  <Zap className="w-3 h-3" />
                  <span>{plan.platformFee}% platform fee</span>
                </div>
              </div>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loadingPlan !== null}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  plan.popular
                    ? 'bg-violet-600 hover:bg-violet-700 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loadingPlan === plan.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <ul className="mt-8 space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Enterprise */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 mb-4">
            Need more? Looking for custom solutions?
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300"
          >
            Contact us for Enterprise pricing
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* FAQ teaser */}
        <div className="mt-24 text-center">
          <h2 className="text-2xl font-bold mb-4">Questions?</h2>
          <p className="text-gray-400 mb-6">
            Check out our FAQ or reach out to our support team.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/faq"
              className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              View FAQ
            </Link>
            <Link
              href="/contact"
              className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
