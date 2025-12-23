/**
 * Publish to Managed Platform Modal
 *
 * Allows users to publish their previewed app to AutoForge managed platform
 * with one click - no configuration needed!
 */

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Check, ExternalLink, Rocket, Database, Cloud, Zap } from 'lucide-react';

interface PublishToManagedModalProps {
  isOpen: boolean;
  onClose: () => void;
  generationJobId: string;
  projectName: string;
}

type DeploymentStep = 'idle' | 'provisioning' | 'database' | 'deploying' | 'complete' | 'error';

export default function PublishToManagedModal({
  isOpen,
  onClose,
  generationJobId,
  projectName,
}: PublishToManagedModalProps) {
  const [subdomain, setSubdomain] = useState('');
  const [appName, setAppName] = useState(projectName);
  const [deploymentStep, setDeploymentStep] = useState<DeploymentStep>('idle');
  const [deploymentUrl, setDeploymentUrl] = useState('');
  const [error, setError] = useState('');

  // Auto-generate subdomain from project name
  const generateSubdomain = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
  };

  // Initialize subdomain when modal opens
  useState(() => {
    if (isOpen && !subdomain) {
      setSubdomain(generateSubdomain(projectName));
    }
  });

  const handlePublish = async () => {
    try {
      setDeploymentStep('provisioning');
      setError('');

      // Call managed provisioning API
      const response = await fetch('/api/managed/provision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generationJobId,
          appName,
          subdomain,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Provisioning failed');
      }

      const data = await response.json();

      // Simulate step progression (in reality, backend does this)
      setDeploymentStep('database');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setDeploymentStep('deploying');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Complete
      setDeploymentStep('complete');
      setDeploymentUrl(data.app.deploymentUrl);

    } catch (err) {
      setDeploymentStep('error');
      setError(err instanceof Error ? err.message : 'Failed to publish');
    }
  };

  const handleClose = () => {
    if (deploymentStep === 'complete' || deploymentStep === 'idle' || deploymentStep === 'error') {
      onClose();
      // Reset state
      setDeploymentStep('idle');
      setError('');
      setDeploymentUrl('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-blue-600" />
            Publish to AutoForge
          </DialogTitle>
          <DialogDescription>
            Deploy your app to production in 30 seconds - no configuration needed!
          </DialogDescription>
        </DialogHeader>

        {deploymentStep === 'idle' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="app-name">App Name</Label>
              <Input
                id="app-name"
                value={appName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAppName(e.target.value)}
                placeholder="My Awesome App"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="subdomain"
                  value={subdomain}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubdomain(e.target.value.toLowerCase())}
                  placeholder="my-app"
                  pattern="[a-z0-9-]+"
                  className="flex-1"
                />
                <span className="text-sm text-gray-500">.autoforge.app</span>
              </div>
              <p className="text-xs text-gray-500">
                Only lowercase letters, numbers, and hyphens
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm text-blue-900">
                What You Get (Included!)
              </h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600" />
                  <span>Multi-tenant PostgreSQL database (isolated schema)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600" />
                  <span>AI API proxy (no API keys needed)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600" />
                  <span>Automatic deployment to Vercel</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600" />
                  <span>Custom subdomain: {subdomain || 'your-app'}.autoforge.app</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600" />
                  <span>Usage tracking & analytics</span>
                </li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handlePublish}
                disabled={!subdomain || !appName}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Rocket className="w-4 h-4 mr-2" />
                Publish Now
              </Button>
            </div>
          </div>
        )}

        {(deploymentStep === 'provisioning' || deploymentStep === 'database' || deploymentStep === 'deploying') && (
          <div className="py-8">
            <div className="flex flex-col items-center justify-center space-y-6">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600" />

              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {deploymentStep === 'provisioning' && 'Setting up infrastructure...'}
                  {deploymentStep === 'database' && 'Provisioning database...'}
                  {deploymentStep === 'deploying' && 'Deploying to production...'}
                </h3>
                <p className="text-sm text-gray-600">
                  This usually takes 30-60 seconds
                </p>
              </div>

              <div className="w-full max-w-md space-y-3">
                <DeploymentStepIndicator
                  label="Create managed app"
                  icon={<Rocket className="w-4 h-4" />}
                  status={deploymentStep === 'provisioning' ? 'active' : 'complete'}
                />
                <DeploymentStepIndicator
                  label="Provision database schema"
                  icon={<Database className="w-4 h-4" />}
                  status={deploymentStep === 'database' ? 'active' : deploymentStep === 'deploying' ? 'complete' : 'pending'}
                />
                <DeploymentStepIndicator
                  label="Deploy to Vercel"
                  icon={<Cloud className="w-4 h-4" />}
                  status={deploymentStep === 'deploying' ? 'active' : 'pending'}
                />
              </div>
            </div>
          </div>
        )}

        {deploymentStep === 'complete' && (
          <div className="py-8">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>

              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  🎉 Your App is Live!
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your app has been deployed and is ready to use
                </p>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-xs text-gray-500 mb-2">Live URL:</p>
                  <a
                    href={deploymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-2"
                  >
                    {subdomain}.autoforge.app
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="w-full max-w-md space-y-2 text-sm">
                <div className="flex items-start gap-2 text-gray-600">
                  <Zap className="w-4 h-4 mt-0.5 text-yellow-600" />
                  <div>
                    <strong>What&apos;s included:</strong>
                    <ul className="mt-1 space-y-1 text-xs">
                      <li>• Database with isolated schema</li>
                      <li>• AI API access (no keys needed)</li>
                      <li>• Automatic SSL certificate</li>
                      <li>• Usage tracking dashboard</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button
                  onClick={() => window.open(deploymentUrl, '_blank')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Visit Your App
                </Button>
              </div>
            </div>
          </div>
        )}

        {deploymentStep === 'error' && (
          <div className="py-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-3xl">❌</span>
              </div>

              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Deployment Failed
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {error}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button onClick={handlePublish}>
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeploymentStepIndicator({
  label,
  icon,
  status,
}: {
  label: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'complete';
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          status === 'complete'
            ? 'bg-green-100 text-green-600'
            : status === 'active'
            ? 'bg-blue-100 text-blue-600'
            : 'bg-gray-100 text-gray-400'
        }`}
      >
        {status === 'complete' ? (
          <Check className="w-4 h-4" />
        ) : status === 'active' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          icon
        )}
      </div>
      <span
        className={`text-sm font-medium ${
          status === 'complete' || status === 'active'
            ? 'text-gray-900'
            : 'text-gray-500'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
