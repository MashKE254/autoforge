/**
 * Integration Setup Wizard
 *
 * Guides users through setting up integrations after generation
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Play,
  X,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { IntegrationConfig } from '@/lib/integrations/types';

interface Integration {
  config: IntegrationConfig;
  status: 'pending' | 'connected' | 'skipped';
}

interface IntegrationSetupWizardProps {
  requiredIntegrations: IntegrationConfig[];
  onComplete: () => void;
  onSkip: () => void;
}

export default function IntegrationSetupWizard({
  requiredIntegrations,
  onComplete,
  onSkip,
}: IntegrationSetupWizardProps) {
  const [integrations, setIntegrations] = useState<Integration[]>(
    requiredIntegrations.map((config) => ({ config, status: 'pending' }))
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentIntegration = integrations[currentIndex];
  const totalSetupTime = requiredIntegrations.reduce((sum, i) => sum + i.estimatedSetupTime, 0);
  const completedCount = integrations.filter((i) => i.status === 'connected').length;
  const allConnected = completedCount === integrations.length;

  const handleOAuthConnect = async (integrationId: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        `/api/oauth/${integrationId}/authorize`,
        'oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for OAuth completion
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          // Check if connected
          checkConnectionStatus(integrationId);
        }
      }, 500);
    } catch (err) {
      setError('Failed to open OAuth window. Please allow popups.');
      setIsConnecting(false);
    }
  };

  const checkConnectionStatus = async (integrationId: string) => {
    try {
      const res = await fetch(`/api/integrations/${integrationId}/status`);
      const data = await res.json();

      if (data.connected) {
        markAsConnected(integrationId);
      } else {
        setError('Connection failed. Please try again.');
      }
    } catch (err) {
      setError('Failed to verify connection.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAPIKeySubmit = async (integrationId: string, apiKey: string, apiSecret?: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      const res = await fetch(`/api/integrations/${integrationId}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiSecret }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        markAsConnected(integrationId);
      } else {
        setError(data.error || 'Invalid API key. Please check and try again.');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const markAsConnected = (integrationId: string) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.config.id === integrationId ? { ...i, status: 'connected' } : i
      )
    );
    moveToNext();
  };

  const markAsSkipped = (integrationId: string) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.config.id === integrationId ? { ...i, status: 'skipped' } : i
      )
    );
    moveToNext();
  };

  const moveToNext = () => {
    if (currentIndex < integrations.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setError(null);
    }
  };

  if (allConnected) {
    return (
      <Card className="border-emerald-500/50 bg-emerald-500/10 backdrop-blur-xl">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">All Set! 🎉</h3>
          <p className="text-gray-400 mb-6">
            All integrations are connected. Your app is ready to use.
          </p>
          <Button
            size="lg"
            onClick={onComplete}
            className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
          >
            <Play className="w-5 h-5" />
            Launch App
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Setup Integrations</CardTitle>
              <CardDescription className="text-gray-400">
                Connect {integrations.length} integration{integrations.length > 1 ? 's' : ''} • Est. {Math.ceil(totalSetupTime)} min
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-gray-400 hover:text-white"
            >
              Skip for now
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {integrations.map((integration, index) => (
              <div
                key={integration.config.id}
                className={`flex-1 h-2 rounded-full ${index === currentIndex
                    ? 'bg-violet-500 animate-pulse'
                    : integration.status === 'connected'
                      ? 'bg-emerald-500'
                      : 'bg-white/10'
                  }`}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-400">
              Step {currentIndex + 1} of {integrations.length}
            </span>
            <span className="text-white font-medium">
              {completedCount}/{integrations.length} connected
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Current Integration Setup */}
      {currentIntegration && (
        <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{currentIntegration.config.icon}</div>
                <div>
                  <CardTitle className="text-white">{currentIntegration.config.name}</CardTitle>
                  <CardDescription className="text-gray-400">
                    {currentIntegration.config.description}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="border-white/10 text-gray-400">
                <Clock className="w-3 h-3 mr-1" />
                {currentIntegration.config.estimatedSetupTime} min
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            {/* OAuth Integration */}
            {currentIntegration.config.type === 'oauth' && (
              <OAuthSetup
                integration={currentIntegration.config}
                onConnect={handleOAuthConnect}
                onSkip={markAsSkipped}
                isConnecting={isConnecting}
              />
            )}

            {/* API Key Integration */}
            {currentIntegration.config.type === 'api-key' && (
              <APIKeySetup
                integration={currentIntegration.config}
                onSubmit={handleAPIKeySubmit}
                onSkip={markAsSkipped}
                isConnecting={isConnecting}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// OAuth Setup Component
// ============================================================================

function OAuthSetup({
  integration,
  onConnect,
  onSkip,
  isConnecting,
}: {
  integration: IntegrationConfig;
  onConnect: (id: string) => void;
  onSkip: (id: string) => void;
  isConnecting: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-white mb-1">Quick OAuth Setup</p>
            <p className="text-sm text-gray-400">
              Click the button below to authorize AutoForge. You'll be redirected to{' '}
              {integration.name} to approve access. This takes about 30 seconds.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          size="lg"
          onClick={() => onConnect(integration.id)}
          disabled={isConnecting}
          className="flex-1 gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <span className="text-lg">{integration.icon}</span>
              Connect {integration.name}
            </>
          )}
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => onSkip(integration.id)}
          disabled={isConnecting}
          className="border-white/10 hover:bg-white/[0.05] text-white"
        >
          Skip
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// API Key Setup Component
// ============================================================================

function APIKeySetup({
  integration,
  onSubmit,
  onSkip,
  isConnecting,
}: {
  integration: IntegrationConfig;
  onSubmit: (id: string, apiKey: string, apiSecret?: string) => void;
  onSkip: (id: string) => void;
  isConnecting: boolean;
}) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showVideo, setShowVideo] = useState(false);

  const handleSubmit = () => {
    onSubmit(integration.id, apiKey, apiSecret || undefined);
  };

  return (
    <div className="space-y-4">
      {/* Video Tutorial */}
      {integration.setupVideoUrl && (
        <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-white">Need help?</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVideo(!showVideo)}
              className="text-violet-400 hover:text-violet-300"
            >
              <Play className="w-4 h-4 mr-1" />
              Watch 3-min tutorial
            </Button>
          </div>
          {showVideo && (
            <div className="mt-3 aspect-video rounded-lg bg-black/50">
              <iframe
                src={integration.setupVideoUrl}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      )}

      {/* Quick Steps */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-white">Quick Steps:</Label>
        <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
          <li>
            Go to{' '}
            <a
              href={integration.apiKeyConfig?.signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 inline-flex items-center gap-1"
            >
              {integration.apiKeyConfig?.provider}
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>Sign up (free tier available)</li>
          <li>Create an API key</li>
          <li>Paste it below</li>
        </ol>
      </div>

      {/* API Key Input */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="apiKey" className="text-white">
            API Key
          </Label>
          <Input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={integration.apiKeyConfig?.exampleKey}
            className="mt-1.5 bg-white/[0.05] border-white/10 text-white"
          />
        </div>

        {/* Optional API Secret */}
        {integration.id === 'stripe' && (
          <div>
            <Label htmlFor="apiSecret" className="text-white">
              API Secret (optional)
            </Label>
            <Input
              id="apiSecret"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="sk_live_..."
              className="mt-1.5 bg-white/[0.05] border-white/10 text-white"
            />
          </div>
        )}

        <p className="text-xs text-gray-500">
          🔒 Encrypted and stored securely. Never shared with anyone.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={!apiKey.trim() || isConnecting}
          className="flex-1 gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Testing connection...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Connect
            </>
          )}
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => onSkip(integration.id)}
          disabled={isConnecting}
          className="border-white/10 hover:bg-white/[0.05] text-white"
        >
          Skip
        </Button>
      </div>
    </div>
  );
}
