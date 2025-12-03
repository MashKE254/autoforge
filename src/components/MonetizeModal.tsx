'use client';

/**
 * Monetize Modal - Add Monetization to Deployed Apps
 * 
 * File: src/components/MonetizeModal.tsx
 * 
 * Features:
 * - Convert personal apps to paid products
 * - Stripe Connect integration
 * - Pricing tier configuration
 * - Revenue split display
 */

import { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  Loader2,
  Check,
  ExternalLink,
  AlertCircle,
  Sparkles,
  ArrowRight,
  CreditCard,
  Percent,
  TrendingUp,
  Shield,
  Zap,
} from 'lucide-react';

interface MonetizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  generationJobId: string;
  appName: string;
  onSuccess?: () => void;
}

type PricingModel = 'free' | 'one-time' | 'subscription';
type Step = 'pricing' | 'stripe' | 'success';

interface PricingConfig {
  model: PricingModel;
  price: number;
  currency: string;
}

export default function MonetizeModal({
  isOpen,
  onClose,
  generationJobId,
  appName,
  onSuccess,
}: MonetizeModalProps) {
  const [step, setStep] = useState<Step>('pricing');
  const [pricingModel, setPricingModel] = useState<PricingModel>('subscription');
  const [price, setPrice] = useState(29);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');
  const [stripeConnected, setStripeConnected] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('pricing');
      setError('');
      checkStripeStatus();
    }
  }, [isOpen]);

  const checkStripeStatus = async () => {
    try {
      const response = await fetch('/api/stripe/connect/status');
      if (response.ok) {
        const data = await response.json();
        setStripeConnected(data.connected);
        if (data.connected) {
          // Skip to pricing if already connected
        }
      }
    } catch (err) {
      console.error('Error checking Stripe status:', err);
    }
  };

  const handleConnectStripe = async () => {
    setIsConnecting(true);
    setError('');

    try {
      const response = await fetch('/api/stripe/connect/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create Stripe account');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Stripe');
      setIsConnecting(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setError('');

    try {
      const response = await fetch('/api/apps/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationJobId,
          pricingModel,
          price: pricingModel === 'free' ? 0 : price * 100, // Convert to cents
          currency: 'usd',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to publish app');
      }

      setStep('success');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  };

  const calculateEarnings = () => {
    if (pricingModel === 'free') return { gross: 0, fee: 0, net: 0 };
    const gross = price;
    const platformFee = gross * 0.10; // 10% platform fee
    const stripeFee = (gross * 0.029) + 0.30; // Stripe's 2.9% + $0.30
    const net = gross - platformFee - stripeFee;
    return { gross, fee: platformFee + stripeFee, net };
  };

  const earnings = calculateEarnings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#1A1A1C] border border-white/10 rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Monetize Your App</h2>
              <p className="text-sm text-gray-400">{appName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Step: Pricing Selection */}
          {step === 'pricing' && (
            <>
              {/* Pricing Model Selection */}
              <div className="space-y-3 mb-6">
                <label className="text-sm font-medium text-gray-300">
                  Choose your pricing model
                </label>

                {/* Free Option */}
                <button
                  onClick={() => setPricingModel('free')}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    pricingModel === 'free'
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        pricingModel === 'free' ? 'bg-violet-500/20 text-violet-400' : 'bg-white/10 text-gray-400'
                      }`}>
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-white">Free</p>
                        <p className="text-xs text-gray-400">Open access for everyone</p>
                      </div>
                    </div>
                    {pricingModel === 'free' && <Check className="w-5 h-5 text-violet-400" />}
                  </div>
                </button>

                {/* One-time Payment Option */}
                <button
                  onClick={() => setPricingModel('one-time')}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    pricingModel === 'one-time'
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        pricingModel === 'one-time' ? 'bg-violet-500/20 text-violet-400' : 'bg-white/10 text-gray-400'
                      }`}>
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-white">One-time Payment</p>
                        <p className="text-xs text-gray-400">Single purchase, lifetime access</p>
                      </div>
                    </div>
                    {pricingModel === 'one-time' && <Check className="w-5 h-5 text-violet-400" />}
                  </div>
                </button>

                {/* Subscription Option */}
                <button
                  onClick={() => setPricingModel('subscription')}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    pricingModel === 'subscription'
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        pricingModel === 'subscription' ? 'bg-violet-500/20 text-violet-400' : 'bg-white/10 text-gray-400'
                      }`}>
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-white">Monthly Subscription</p>
                        <p className="text-xs text-gray-400">Recurring revenue, best for SaaS</p>
                      </div>
                    </div>
                    {pricingModel === 'subscription' && <Check className="w-5 h-5 text-violet-400" />}
                  </div>
                </button>
              </div>

              {/* Price Input (if not free) */}
              {pricingModel !== 'free' && (
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-300 block mb-2">
                    Set your price
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      min="1"
                      max="9999"
                      value={price}
                      onChange={(e) => setPrice(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-20 py-3 text-white text-lg font-medium focus:outline-none focus:border-violet-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      {pricingModel === 'subscription' ? '/ month' : 'one-time'}
                    </span>
                  </div>

                  {/* Earnings Preview */}
                  <div className="mt-4 p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-400">Your earnings per sale</span>
                      <span className="text-green-400 font-medium">${earnings.net.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Platform fee (10%) + Stripe fee</span>
                      <span>-${earnings.fee.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Continue Button */}
              <button
                onClick={() => {
                  if (pricingModel === 'free') {
                    handlePublish();
                  } else if (stripeConnected) {
                    handlePublish();
                  } else {
                    setStep('stripe');
                  }
                }}
                disabled={isPublishing}
                className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    {pricingModel === 'free' ? 'Publish as Free' : 'Continue'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}

          {/* Step: Stripe Connect */}
          {step === 'stripe' && (
            <>
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Connect Stripe to Get Paid
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                  Stripe handles payments securely. You&#39;ll receive payouts directly to your bank account.
                </p>

                {/* Benefits */}
                <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                  {[
                    { icon: Shield, text: 'Secure payments' },
                    { icon: Zap, text: 'Instant payouts' },
                    { icon: Percent, text: '90% revenue share' },
                    { icon: TrendingUp, text: 'Analytics & insights' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-white/5 rounded-lg">
                      <item.icon className="w-4 h-4 text-violet-400" />
                      <span className="text-sm text-gray-300">{item.text}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleConnectStripe}
                  disabled={isConnecting}
                  className="w-full py-3 px-4 bg-[#635BFF] text-white font-medium rounded-xl hover:bg-[#5851DB] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                      </svg>
                      Connect with Stripe
                    </>
                  )}
                </button>

                <button
                  onClick={() => setStep('pricing')}
                  className="mt-3 text-sm text-gray-500 hover:text-gray-400 transition-colors"
                >
                  ← Back to pricing
                </button>
              </div>
            </>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                App Published! 🎉
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                {pricingModel === 'free' 
                  ? 'Your app is now live and free for everyone.'
                  : `Your app is now live at $${price}${pricingModel === 'subscription' ? '/month' : ''}.`
                }
              </p>

              <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-white text-black font-medium rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                View Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}