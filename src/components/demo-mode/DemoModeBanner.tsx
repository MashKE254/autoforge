/**
 * Demo Mode Banner
 *
 * Displays at the top of apps running in demo mode
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, ArrowRight, X } from 'lucide-react';

interface DemoModeBannerProps {
  integrations: string[]; // IDs of integrations being simulated
  onGoLive: () => void;
  onDismiss?: () => void;
}

export default function DemoModeBanner({
  integrations,
  onGoLive,
  onDismiss,
}: DemoModeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <Card className="border-amber-500/50 bg-amber-500/10 backdrop-blur-xl">
      <div className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white flex items-center gap-2">
              🎭 Demo Mode Active
            </h3>
            <p className="text-sm text-gray-400 mt-0.5">
              All features are working with simulated data.{' '}
              {integrations.length > 0 && (
                <span className="text-amber-400">
                  {integrations.length} integration{integrations.length > 1 ? 's' : ''} simulated
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={onGoLive}
            className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
          >
            Go Live with Real Data
            <ArrowRight className="w-4 h-4" />
          </Button>
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
