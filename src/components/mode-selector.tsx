/**
 * Mode Selector Component
 *
 * File: src/components/mode-selector.tsx
 *
 * Allows users to choose between:
 * - Personal Tool (simple, localStorage, no auth)
 * - Full SaaS (auth, database, payments)
 */

'use client';

import { useState } from 'react';
import { User, Users, Sparkles, Zap, Database, CreditCard, Lock, HardDrive } from 'lucide-react';

export type GenerationMode = 'PERSONAL' | 'SAAS';

interface ModeSelectorProps {
  onModeChange: (mode: GenerationMode) => void;
  defaultMode?: GenerationMode;
  className?: string;
}

export function ModeSelector({
  onModeChange,
  defaultMode = 'PERSONAL',
  className = '',
}: ModeSelectorProps) {
  const [mode, setMode] = useState<GenerationMode>(defaultMode);

  const handleChange = (newMode: GenerationMode) => {
    setMode(newMode);
    onModeChange(newMode);
  };

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-1">
          Choose Your Starting Point
        </h3>
        <p className="text-sm text-gray-400">
          Start simple and upgrade later, or go full SaaS from day one
        </p>
      </div>

      {/* Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal Tool */}
        <button
          onClick={() => handleChange('PERSONAL')}
          className={`relative p-6 rounded-xl border-2 transition-all text-left group ${
            mode === 'PERSONAL'
              ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/20'
              : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900'
          }`}
        >
          {/* Selected Badge */}
          {mode === 'PERSONAL' && (
            <div className="absolute top-4 right-4">
              <div className="bg-violet-500 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Selected
              </div>
            </div>
          )}

          {/* Icon */}
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all ${
              mode === 'PERSONAL'
                ? 'bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg'
                : 'bg-zinc-800 group-hover:bg-zinc-700'
            }`}
          >
            <User className="w-6 h-6 text-white" />
          </div>

          {/* Title & Description */}
          <div className="mb-4">
            <h4 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
              Personal Tool
              <span className="text-xs font-normal text-violet-400 bg-violet-500/20 px-2 py-0.5 rounded-full">
                Recommended
              </span>
            </h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              Build for yourself first. Simple, fast, and free to share. Perfect for validating ideas.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Zap className="w-4 h-4 text-green-400" />
              <span>Fast generation (~30 seconds)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span>localStorage (browser storage)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <User className="w-4 h-4 text-purple-400" />
              <span>Single user, no sign-up needed</span>
            </div>
          </div>

          {/* Stats */}
          <div className="pt-4 border-t border-zinc-800 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-white">10-15</div>
              <div className="text-xs text-gray-500">Files</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-400">~$0.20</div>
              <div className="text-xs text-gray-500">Cost</div>
            </div>
            <div>
              <div className="text-lg font-bold text-violet-400">30s</div>
              <div className="text-xs text-gray-500">Time</div>
            </div>
          </div>

          {/* Upgrade Note */}
          <div className="mt-4 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
            <p className="text-xs text-violet-200">
              💡 <strong>Upgrade anytime:</strong> Click "Monetize" later to add auth, database, and payments
            </p>
          </div>
        </button>

        {/* Full SaaS */}
        <button
          onClick={() => handleChange('SAAS')}
          className={`relative p-6 rounded-xl border-2 transition-all text-left group ${
            mode === 'SAAS'
              ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/20'
              : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900'
          }`}
        >
          {/* Selected Badge */}
          {mode === 'SAAS' && (
            <div className="absolute top-4 right-4">
              <div className="bg-violet-500 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Selected
              </div>
            </div>
          )}

          {/* Icon */}
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all ${
              mode === 'SAAS'
                ? 'bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg'
                : 'bg-zinc-800 group-hover:bg-zinc-700'
            }`}
          >
            <Users className="w-6 h-6 text-white" />
          </div>

          {/* Title & Description */}
          <div className="mb-4">
            <h4 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
              Full SaaS
              <span className="text-xs font-normal text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                Pro
              </span>
            </h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              Production-ready multi-tenant SaaS with authentication, database, and payments.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Lock className="w-4 h-4 text-green-400" />
              <span>Clerk authentication</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Database className="w-4 h-4 text-blue-400" />
              <span>Supabase PostgreSQL database</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <CreditCard className="w-4 h-4 text-purple-400" />
              <span>Stripe subscription payments</span>
            </div>
          </div>

          {/* Stats */}
          <div className="pt-4 border-t border-zinc-800 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-white">40-50</div>
              <div className="text-xs text-gray-500">Files</div>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-400">~$0.65</div>
              <div className="text-xs text-gray-500">Cost</div>
            </div>
            <div>
              <div className="text-lg font-bold text-violet-400">2min</div>
              <div className="text-xs text-gray-500">Time</div>
            </div>
          </div>

          {/* Pro Note */}
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-amber-200">
              ⚡ <strong>Skip validation:</strong> Go straight to production with landing page, pricing, and billing
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
