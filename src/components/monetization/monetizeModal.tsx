/**
 * Monetize Modal Component
 * 
 * File: src/components/monetization/MonetizeModal.tsx
 * 
 * The "Turn this into a Business" modal that appears when
 * a creator wants to monetize their generated app.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  DollarSign,
  Zap,
  CreditCard,
  ArrowRight,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface MonetizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  generationJobId: string;
  appName?: string;
}

type PricingModel = 'FREE' | 'SUBSCRIPTION' | 'ONE_TIME';

interface FormData {
  name: string;
  slug: string;
  description: string;
  pricingModel: PricingModel;
  monthlyPrice: string;
  yearlyPrice: string;
  oneTimePrice: string;
  trialDays: string;
}

export default function MonetizeModal({
  isOpen,
  onClose,
  generationJobId,
  appName = 'My App',
}: MonetizeModalProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectStatus, setConnectStatus] = useState<{
    connected: boolean;
    onboardingComplete: boolean;
  } | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    name: appName,
    slug: appName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    description: '',
    pricingModel: 'SUBSCRIPTION',
    monthlyPrice: '9',
    yearlyPrice: '90',
    oneTimePrice: '29',
    trialDays: '7',
  });

  // Check Connect status on mount
  useEffect(() => {
    if (isOpen) {
      checkConnectStatus();
    }
  }, [isOpen]);

  const checkConnectStatus = async () => {
    try {
      const res = await fetch('/api/stripe/create-connect-account');
      if (res.ok) {
        const data = await res.json();
        setConnectStatus({
          connected: data.connected,
          onboardingComplete: data.onboardingComplete,
        });
      }
    } catch (error) {
      console.error('Failed to check Connect status:', error);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData((prev) => ({ ...prev, slug: value }));
    setError(null);
  };

  const handleConnectStripe = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/create-connect-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: 'US' }),
      });
      const data = await res.json();
      
      if (data.onboardingUrl) {
        // Store current state in sessionStorage to resume after onboarding
        sessionStorage.setItem('monetize_pending', JSON.stringify({
          generationJobId,
          formData,
          step,
        }));
        window.location.href = data.onboardingUrl;
      }
    } catch (error) {
      setError('Failed to start Stripe setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/apps/monetize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationJobId,
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          pricingModel: formData.pricingModel,
          monthlyPrice: formData.pricingModel === 'SUBSCRIPTION' 
            ? parseFloat(formData.monthlyPrice) 
            : undefined,
          yearlyPrice: formData.pricingModel === 'SUBSCRIPTION' 
            ? parseFloat(formData.yearlyPrice) 
            : undefined,
          oneTimePrice: formData.pricingModel === 'ONE_TIME' 
            ? parseFloat(formData.oneTimePrice) 
            : undefined,
          trialDays: formData.pricingModel === 'SUBSCRIPTION' 
            ? parseInt(formData.trialDays) 
            : 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish app');
      }

      // Success! Show step 3
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#1A1A1C] border border-white/10 rounded-2xl shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {step === 3 ? '🎉 Published!' : 'Turn this into a Business'}
            </h2>
          </div>
          <p className="text-gray-400 text-sm">
            {step === 1 && 'Set up pricing and start earning from your app'}
            {step === 2 && 'Connect Stripe to receive payments'}
            {step === 3 && 'Your app is now live and accepting payments'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Pricing Configuration */}
          {step === 1 && (
            <div className="space-y-4">
              {/* App Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  App Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                  placeholder="My Awesome App"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  URL Slug
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-white/5 border border-r-0 border-white/10 rounded-l-lg text-gray-500 text-sm">
                    https://
                  </span>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleSlugChange}
                    className="flex-1 px-3 py-2 bg-white/5 border-y border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                    placeholder="my-app"
                  />
                  <span className="px-3 py-2 bg-white/5 border border-l-0 border-white/10 rounded-r-lg text-gray-500 text-sm">
                    .autoforge.app
                  </span>
                </div>
              </div>

              {/* Pricing Model */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pricing Model
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['FREE', 'SUBSCRIPTION', 'ONE_TIME'] as PricingModel[]).map((model) => (
                    <button
                      key={model}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, pricingModel: model }))}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        formData.pricingModel === model
                          ? 'bg-violet-500/20 border-violet-500 text-white'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-sm font-medium">
                        {model === 'FREE' && 'Free'}
                        {model === 'SUBSCRIPTION' && 'Subscription'}
                        {model === 'ONE_TIME' && 'One-time'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subscription Pricing */}
              {formData.pricingModel === 'SUBSCRIPTION' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Monthly Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        name="monthlyPrice"
                        value={formData.monthlyPrice}
                        onChange={handleChange}
                        min="1"
                        className="w-full pl-7 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Free Trial
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="trialDays"
                        value={formData.trialDays}
                        onChange={handleChange}
                        min="0"
                        max="30"
                        className="w-full pr-12 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-violet-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">days</span>
                    </div>
                  </div>
                </div>
              )}

              {/* One-time Pricing */}
              {formData.pricingModel === 'ONE_TIME' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      name="oneTimePrice"
                      value={formData.oneTimePrice}
                      onChange={handleChange}
                      min="1"
                      className="w-full pl-7 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              )}

              {/* Revenue preview */}
              {formData.pricingModel !== 'FREE' && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-medium text-violet-400">Revenue Preview</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    {formData.pricingModel === 'SUBSCRIPTION' && (
                      <>At ${formData.monthlyPrice}/mo with 100 customers, you&#39;d earn ~$
                      {Math.round(parseFloat(formData.monthlyPrice) * 100 * 0.92)}/month</>
                    )}
                    {formData.pricingModel === 'ONE_TIME' && (
                      <>At ${formData.oneTimePrice} with 100 sales, you&#39;d earn ~$
                      {Math.round(parseFloat(formData.oneTimePrice) * 100 * 0.92)}</>
                    )}
                    <span className="text-gray-500"> (after 8% platform fee)</span>
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Connect Stripe */}
          {step === 2 && (
            <div className="space-y-4">
              {connectStatus?.onboardingComplete ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Check className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="font-medium text-green-400">Stripe Connected!</p>
                    <p className="text-sm text-gray-400">You&#39;re ready to accept payments</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <CreditCard className="w-5 h-5 text-violet-400" />
                      <span className="font-medium">Connect Stripe to receive payments</span>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-400">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-400" />
                        Secure payment processing
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-400" />
                        Weekly payouts to your bank
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-400" />
                        Accept cards from 135+ countries
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={handleConnectStripe}
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-lg bg-[#635BFF] hover:bg-[#5851DB] transition-colors font-medium flex items-center justify-center gap-2 text-white"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Connect with Stripe
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Your app is live! 🚀
              </h3>
              <p className="text-gray-400 mb-6">
                Share this link with your audience:
              </p>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-6">
                <code className="text-violet-400 text-sm">
                  https://{formData.slug}.autoforge.app
                </code>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://${formData.slug}.autoforge.app`);
                  }}
                  className="flex-1 py-2 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
                >
                  Copy Link
                </button>
                <button
                  onClick={() => router.push('/dashboard/apps')}
                  className="flex-1 py-2 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 transition-colors text-sm"
                >
                  View Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 3 && (
          <div className="p-6 pt-0 flex gap-3">
            {step === 1 && (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (formData.pricingModel === 'FREE') {
                      handlePublish();
                    } else if (!connectStatus?.onboardingComplete) {
                      setStep(2);
                    } else {
                      handlePublish();
                    }
                  }}
                  disabled={loading || !formData.name || !formData.slug}
                  className="flex-1 py-3 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {formData.pricingModel === 'FREE' ? 'Publish App' : 'Continue'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </>
            )}

            {step === 2 && connectStatus?.onboardingComplete && (
              <button
                onClick={handlePublish}
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Publish App
                    <Zap className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Progress indicator */}
        {step !== 3 && (
          <div className="px-6 pb-6">
            <div className="flex gap-2">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    s <= step ? 'bg-violet-500' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
