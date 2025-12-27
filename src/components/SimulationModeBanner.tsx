/**
 * Simulation Mode Banner
 *
 * Shows a banner when SIMULATE_ANTHROPIC=true
 * Helps developers know they're in test mode
 */

'use client';

import { AlertCircle, Zap } from 'lucide-react';

export default function SimulationModeBanner() {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  // Check if simulation mode is enabled
  const isSimulation = process.env.NEXT_PUBLIC_SIMULATE_ANTHROPIC === 'true';

  if (!isSimulation) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white py-2 px-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-sm font-medium">
        <Zap className="w-4 h-4 animate-pulse" />
        <span>
          🎭 <strong>SIMULATION MODE</strong> - No real API calls being made. Perfect for testing monetization!
        </span>
        <Zap className="w-4 h-4 animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Compact version for dashboard
 */
export function SimulationModeIndicator() {
  const isSimulation = process.env.NEXT_PUBLIC_SIMULATE_ANTHROPIC === 'true';

  if (!isSimulation) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-medium">
      <Zap className="w-3 h-3" />
      <span>Simulation Mode</span>
    </div>
  );
}
