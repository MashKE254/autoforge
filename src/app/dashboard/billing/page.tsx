/**
 * Creator Billing Dashboard
 * 
 * File: src/app/dashboard/billing/page.tsx
 * 
 * Shows subscription status, allows managing billing,
 * and Connect account setup.
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  Zap,
  Building2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface SubscriptionData {
  plan: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  platformFee: number;
}

interface ConnectStatus {
  connected: boolean;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

export default function BillingPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (authStatus === 'authenticated') {
      fetchData();
    }
  }, [authStatus, router]);

  const fetchData = async () => {
    try {
      // Fetch subscription status
      const subRes = await fetch('/api/user/subscription');
      if (subRes.ok) {
        const data = await subRes.json();
        setSubscription(data.subscription);
      }

      // Fetch Connect status
      const connectRes = await fetch('/api/stripe/create-connect-account', {
        method: 'GET',
      });
      if (connectRes.ok) {
        const data = await connectRes.json();
        setConnectStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setActionLoading('billing');
    try {
      const res = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConnectStripe = async () => {
    setActionLoading('connect');
    try {
      const res = await fetch('/api/stripe/create-connect-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: 'US' }),
      });
      const data = await res.json();
      
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else if (data.dashboardUrl) {
        window.location.href = data.dashboardUrl;
      }
    } catch (error) {
      console.error('Failed to setup Connect:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Billing & Payments</h1>
        <p className="text-gray-400 mb-8">
          Manage your subscription and payment settings
        </p>

        <div className="space-y-6">
          {/* Subscription Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/20">
                  <CreditCard className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Platform Subscription</h2>
                  <p className="text-sm text-gray-400">Your AutoForge creator plan</p>
                </div>
              </div>
              
              {subscription?.status === 'ACTIVE' && (
                <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">
                  Active
                </span>
              )}
            </div>

            {subscription ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-white/5">
                    <p className="text-sm text-gray-400 mb-1">Current Plan</p>
                    <p className="text-lg font-semibold">{subscription.plan}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <p className="text-sm text-gray-400 mb-1">Platform Fee</p>
                    <p className="text-lg font-semibold">{subscription.platformFee}%</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-white/5">
                  <p className="text-sm text-gray-400 mb-1">
                    {subscription.cancelAtPeriodEnd ? 'Ends on' : 'Renews on'}
                  </p>
                  <p className="font-semibold">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  {subscription.cancelAtPeriodEnd && (
                    <p className="text-sm text-yellow-400 mt-2">
                      Your subscription will not renew
                    </p>
                  )}
                </div>

                <button
                  onClick={handleManageBilling}
                  disabled={actionLoading === 'billing'}
                  className="w-full py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {actionLoading === 'billing' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Manage Subscription
                      <ExternalLink className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">
                  You don&#39;t have an active subscription
                </p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-700 transition-colors font-medium"
                >
                  View Plans
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Stripe Connect Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Payout Account</h2>
                  <p className="text-sm text-gray-400">
                    Connect Stripe to receive earnings from your apps
                  </p>
                </div>
              </div>

              {connectStatus?.onboardingComplete && (
                <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">
                  Connected
                </span>
              )}
            </div>

            {connectStatus?.onboardingComplete ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="font-medium text-green-400">
                      Stripe Connected
                    </p>
                    <p className="text-sm text-gray-400">
                      You can receive payouts for your published apps
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      {connectStatus.chargesEnabled ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                      )}
                      <p className="text-sm text-gray-400">Charges</p>
                    </div>
                    <p className="font-medium">
                      {connectStatus.chargesEnabled ? 'Enabled' : 'Pending'}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      {connectStatus.payoutsEnabled ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                      )}
                      <p className="text-sm text-gray-400">Payouts</p>
                    </div>
                    <p className="font-medium">
                      {connectStatus.payoutsEnabled ? 'Enabled' : 'Pending'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleConnectStripe}
                  disabled={actionLoading === 'connect'}
                  className="w-full py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {actionLoading === 'connect' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Open Stripe Dashboard
                      <ExternalLink className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ) : connectStatus?.connected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="font-medium text-yellow-400">
                      Complete Setup Required
                    </p>
                    <p className="text-sm text-gray-400">
                      Finish Stripe onboarding to start receiving payouts
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleConnectStripe}
                  disabled={actionLoading === 'connect'}
                  className="w-full py-3 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {actionLoading === 'connect' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Complete Setup
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-white/5">
                  <p className="text-gray-400 text-sm mb-3">
                    Connect your Stripe account to:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <Zap className="w-4 h-4 text-violet-400" />
                      <span>Accept payments on your published apps</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Zap className="w-4 h-4 text-violet-400" />
                      <span>Receive weekly payouts to your bank</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Zap className="w-4 h-4 text-violet-400" />
                      <span>Track earnings in real-time</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={handleConnectStripe}
                  disabled={actionLoading === 'connect' || !subscription}
                  className="w-full py-3 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {actionLoading === 'connect' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Connect Stripe Account
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {!subscription && (
                  <p className="text-center text-sm text-gray-500">
                    Subscribe to a plan first to connect Stripe
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/dashboard/earnings"
              className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <p className="font-medium mb-1">View Earnings</p>
              <p className="text-sm text-gray-400">See your revenue analytics</p>
            </Link>
            <Link
              href="/dashboard/apps"
              className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <p className="font-medium mb-1">Published Apps</p>
              <p className="text-sm text-gray-400">Manage your monetized apps</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
