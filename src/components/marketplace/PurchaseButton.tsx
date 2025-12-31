'use client';

/**
 * ONE-CLICK PURCHASE BUTTON
 *
 * File: src/components/marketplace/PurchaseButton.tsx
 *
 * Handles entire purchase flow:
 * - Not logged in → Redirect to login
 * - Free app → Instant activation
 * - Paid app → Stripe Checkout
 *
 * NO JARGON. Just: "Get Access Now"
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, Lock, Zap } from 'lucide-react';
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

  const handlePurchase = async () => {
    // Not authenticated → redirect to login
    if (!isAuthenticated) {
      router.push(`/login?from=/marketplace/${appId}`);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      if (pricingModel === 'FREE') {
        // FREE APP: Instant activation
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
        // PAID APP: Stripe Checkout
        const response = await fetch('/api/marketplace/purchase/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appId,
            pricingModel,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to start checkout');
        }

        const { checkoutUrl } = await response.json();

        // Redirect to Stripe Checkout
        window.location.href = checkoutUrl;
      }
    } catch (err) {
      console.error('Purchase error:', err);
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
  ) : isAuthenticated ? (
    <Check className="w-5 h-5" />
  ) : (
    <Lock className="w-5 h-5" />
  );

  return (
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

      {!isAuthenticated && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          You'll be asked to sign in first
        </p>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400 text-center">{error}</p>
        </div>
      )}
    </div>
  );
}
