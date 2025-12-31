'use client';

/**
 * PARTNER SIGNUP BUTTON
 *
 * File: src/components/partners/PartnerSignupButton.tsx
 *
 * Handles partner program signup
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';

interface PartnerSignupButtonProps {
  tier: 'affiliate' | 'agency' | 'reseller';
  tierName: string;
  isAuthenticated: boolean;
}

export default function PartnerSignupButton({
  tier,
  tierName,
  isAuthenticated,
}: PartnerSignupButtonProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    // Not authenticated → redirect to login
    if (!isAuthenticated) {
      router.push(`/login?from=/partners/signup?tier=${tier}`);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Call partner signup API
      const response = await fetch('/api/partners/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to join partner program');
      }

      const data = await response.json();

      // Redirect to partner dashboard
      router.push('/partners/dashboard');
    } catch (err) {
      console.error('Partner signup error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <Button
        onClick={handleSignup}
        disabled={isProcessing}
        className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Join as {tierName}
            <ArrowRight className="w-5 h-5 ml-2" />
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
