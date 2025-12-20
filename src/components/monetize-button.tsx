/**
 * Monetize Button Component
 *
 * File: src/components/monetize-button.tsx
 *
 * Upgrades a personal tool to a full SaaS application
 */

'use client';

import { useState } from 'react';
import { DollarSign, Loader2, Sparkles, ArrowRight, Lock, Database, CreditCard } from 'lucide-react';

interface MonetizeButtonProps {
  jobId: string;
  className?: string;
}

export function MonetizeButton({ jobId, className = '' }: MonetizeButtonProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    try {
      setIsUpgrading(true);
      setError(null);

      const response = await fetch('/api/generate/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personalJobId: jobId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upgrade');
      }

      if (data.success) {
        // Redirect to new SaaS job page
        window.location.href = `/job/${data.saasJobId}`;
      } else {
        throw new Error('Upgrade failed');
      }
    } catch (err) {
      console.error('Upgrade error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsUpgrading(false);
    }
  };

  return (
    <div className={`${className}`}>
      <div className="bg-gradient-to-br from-violet-900/30 to-indigo-900/30 border border-violet-500/30 rounded-2xl p-8 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-violet-400" />
              <h3 className="text-2xl font-bold text-white">
                Ready to Monetize?
              </h3>
            </div>
            <p className="text-gray-300 text-sm">
              Transform this personal tool into a full SaaS application with authentication, database, and payments
            </p>
          </div>
        </div>

        {/* What You'll Get */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
            What you'll get:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <Lock className="w-5 h-5 text-green-400 mb-2" />
              <div className="text-sm font-semibold text-white mb-1">Authentication</div>
              <div className="text-xs text-gray-400">Clerk auth with sign-up/sign-in pages</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <Database className="w-5 h-5 text-blue-400 mb-2" />
              <div className="text-sm font-semibold text-white mb-1">Multi-Tenant Database</div>
              <div className="text-xs text-gray-400">Supabase PostgreSQL with RLS</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <CreditCard className="w-5 h-5 text-purple-400 mb-2" />
              <div className="text-sm font-semibold text-white mb-1">Subscription Billing</div>
              <div className="text-xs text-gray-400">Stripe checkout & webhooks</div>
            </div>
          </div>
        </div>

        {/* Additional Features */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4 mb-6">
          <p className="text-xs font-semibold text-gray-400 mb-2">Also includes:</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-300">
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 bg-violet-400 rounded-full" />
              Landing page with hero & features
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 bg-violet-400 rounded-full" />
              Pricing page with subscription tiers
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 bg-violet-400 rounded-full" />
              User dashboard & settings
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 bg-violet-400 rounded-full" />
              Billing management page
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 bg-violet-400 rounded-full" />
              Row-level security (RLS) policies
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 bg-violet-400 rounded-full" />
              Migration guide & setup docs
            </li>
          </ul>
        </div>

        {/* Stats & CTA */}
        <div className="flex items-center justify-between pt-6 border-t border-zinc-800">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-gray-500 mb-1">Generation Cost</div>
              <div className="text-lg font-bold text-white">~$0.65</div>
            </div>
            <div className="w-px h-10 bg-zinc-800" />
            <div>
              <div className="text-xs text-gray-500 mb-1">Generation Time</div>
              <div className="text-lg font-bold text-white">~2 minutes</div>
            </div>
            <div className="w-px h-10 bg-zinc-800" />
            <div>
              <div className="text-xs text-gray-500 mb-1">Files Generated</div>
              <div className="text-lg font-bold text-white">40-50</div>
            </div>
          </div>

          <button
            onClick={handleUpgrade}
            disabled={isUpgrading}
            className="group relative px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all font-semibold text-lg shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpgrading ? (
              <span className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                Upgrading to SaaS...
              </span>
            ) : (
              <span className="flex items-center gap-3">
                <DollarSign className="w-5 h-5" />
                Monetize This Tool
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
