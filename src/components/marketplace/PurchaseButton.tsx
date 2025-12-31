'use client';

/**
 * ONE-CLICK PURCHASE BUTTON - GUEST CHECKOUT ENABLED
 *
 * File: src/components/marketplace/PurchaseButton.tsx
 *
 * Handles entire purchase flow for ANYONE (no account required):
 * - Free app → Collect email → Instant activation → Magic link
 * - Paid app → Stripe Checkout (collects email) → Auto-account creation
 *
 * NO JARGON. Just: "Get Access Now"
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, Zap, Mail, X } from 'lucide-react';
import { Button } from '../ui/button';

interface PurchaseButtonProps {
  appId: string;
  appName: string;
  price: number;
  pricingModel: 'FREE' | 'SUBSCRIPTION' | 'ONE_TIME';
  isAuthenticated: boolean;
  size?: 'default' | 'lg';
}

export default function PurchaseButton({
  appId,
  appName,
  price,
  pricingModel,
  isAuthenticated,
  size = 'default',
}: PurchaseButtonProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');

  const handlePurchase = async () => {
    setError(null);

    // FREE APP + NOT AUTHENTICATED → Show email modal
    if (pricingModel === 'FREE' && !isAuthenticated) {
      setShowEmailModal(true);
      return;
    }

    setIsProcessing(true);

    try {
      if (pricingModel === 'FREE') {
        // FREE APP: Instant activation (authenticated user)
        const response = await fetch('/api/marketplace/purchase/free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to activate app');
        }

        // Redirect to customer portal
        router.push('/portal');
      } else {
        // PAID APP: Stripe Checkout (works for both authenticated and guest)
        const response = await fetch('/api/marketplace/purchase/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appId,
            pricingModel,
            // No auth required - Stripe will collect email
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to start checkout');
        }

        const { checkoutUrl } = await response.json();

        // Redirect to Stripe Checkout (collects email automatically)
        window.location.href = checkoutUrl;
      }
    } catch (err) {
      console.error('Purchase error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsProcessing(false);
    }
  };

  const handleGuestFreeActivation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestEmail.trim() || !guestEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Activate free app for guest user
      const response = await fetch('/api/marketplace/purchase/free-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId,
          email: guestEmail.trim().toLowerCase(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to activate app');
      }

      const data = await response.json();

      // Show success message
      setShowEmailModal(false);
      router.push(`/apps/check-email?email=${encodeURIComponent(guestEmail)}&app=${appName}`);
    } catch (err) {
      console.error('Guest activation error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsProcessing(false);
    }
  };

  const buttonText = pricingModel === 'FREE'
    ? 'Get Access Now'
    : pricingModel === 'SUBSCRIPTION'
    ? `Subscribe for $${price}/mo`
    : `Buy Now for $${price}`;

  const buttonIcon = pricingModel === 'FREE' ? (
    <Zap className="w-5 h-5" />
  ) : (
    <Check className="w-5 h-5" />
  );

  return (
    <>
      <div>
        <Button
          onClick={handlePurchase}
          disabled={isProcessing}
          size={size}
          className={`w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-violet-500/25 ${
            size === 'lg' ? 'text-lg px-12 py-6' : ''
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {buttonIcon}
              <span className="ml-2">{buttonText}</span>
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 mt-3 text-center">
          {pricingModel === 'FREE'
            ? 'No credit card required'
            : 'Instant access after payment'}
        </p>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400 text-center">{error}</p>
          </div>
        )}
      </div>

      {/* Email Modal for Free Apps (Guest Users) */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-md w-full relative">
            {/* Close button */}
            <button
              onClick={() => {
                setShowEmailModal(false);
                setError(null);
              }}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-white" />
            </div>

            {/* Content */}
            <h3 className="text-2xl font-bold text-center mb-3">
              Get Instant Access
            </h3>
            <p className="text-gray-400 text-center mb-6">
              Enter your email to access <span className="text-white font-semibold">{appName}</span>
            </p>

            {/* Form */}
            <form onSubmit={handleGuestFreeActivation}>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent mb-4"
                autoFocus
                disabled={isProcessing}
              />

              <Button
                type="submit"
                disabled={isProcessing || !guestEmail.trim()}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Get Access
                  </>
                )}
              </Button>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400 text-center">{error}</p>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-4 text-center">
                We'll email you a link to access your app instantly
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
