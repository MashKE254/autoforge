'use client';

/**
 * Deploy Modal - Personal & Public Deployment Options
 * 
 * File: src/components/DeployModal.tsx
 * 
 * Features:
 * - Deploy to Vercel without Stripe (Personal Use)
 * - Optional monetization (Turn into Business later)
 * - Personal vs Public toggle
 * - Real-time deployment status
 */

import { useState, useEffect } from 'react';
import {
  X,
  Rocket,
  Globe,
  Lock,
  DollarSign,
  Loader2,
  Check,
  ExternalLink,
  Copy,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
} from 'lucide-react';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  appName: string;
  onDeploySuccess?: (url: string) => void;
}

type DeploymentType = 'personal' | 'public';
type DeploymentStatus = 'idle' | 'deploying' | 'success' | 'error';

interface DeploymentResult {
  deploymentId: string;
  deploymentUrl: string;
  status: string;
}

export default function DeployModal({
  isOpen,
  onClose,
  jobId,
  appName,
  onDeploySuccess,
}: DeployModalProps) {
  const [deploymentType, setDeploymentType] = useState<DeploymentType>('personal');
  const [status, setStatus] = useState<DeploymentStatus>('idle');
  const [deploymentUrl, setDeploymentUrl] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setDeploymentUrl('');
      setError('');
      setDeploymentType('personal');
    }
  }, [isOpen]);

  const handleDeploy = async () => {
    setStatus('deploying');
    setError('');

    try {
      const response = await fetch('/api/deploy/vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          deploymentType,
          // Only include monetization flag if public
          enableMonetization: deploymentType === 'public',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Deployment failed');
      }

      const result: DeploymentResult = await response.json();
      
      // Poll for deployment status
      await pollDeploymentStatus(result.deploymentId, result.deploymentUrl);
      
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Deployment failed');
    }
  };

  const pollDeploymentStatus = async (deploymentId: string, url: string) => {
    const maxAttempts = 60; // 5 minutes max
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`/api/deploy/vercel?jobId=${jobId}`);
        const data = await response.json();

        if (data.status === 'READY') {
          setStatus('success');
          setDeploymentUrl(data.deploymentUrl || url);
          onDeploySuccess?.(data.deploymentUrl || url);
          return;
        }

        if (data.status === 'ERROR') {
          throw new Error(data.errorMessage || 'Deployment failed');
        }

        // Wait 5 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (err) {
        // Continue polling unless it's a fatal error
        if (i === maxAttempts - 1) {
          throw err;
        }
      }
    }

    throw new Error('Deployment timed out');
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(deploymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Deploy Your App</h2>
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
          {status === 'idle' && (
            <>
              {/* Deployment Type Selection */}
              <div className="space-y-3 mb-6">
                <label className="text-sm font-medium text-gray-300">
                  How do you want to deploy?
                </label>
                
                {/* Personal Option */}
                <button
                  onClick={() => setDeploymentType('personal')}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    deploymentType === 'personal'
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      deploymentType === 'personal' 
                        ? 'bg-violet-500/20 text-violet-400' 
                        : 'bg-white/10 text-gray-400'
                    }`}>
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">Personal Use</span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded-full">
                          Free
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        Deploy for yourself or your team. No Stripe needed. Add monetization later.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Check className="w-3 h-3 text-green-400" /> Live URL
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Check className="w-3 h-3 text-green-400" /> SSL Certificate
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Check className="w-3 h-3 text-green-400" /> Unlimited Visitors
                        </span>
                      </div>
                    </div>
                    {deploymentType === 'personal' && (
                      <Check className="w-5 h-5 text-violet-400" />
                    )}
                  </div>
                </button>

                {/* Public/Business Option */}
                <button
                  onClick={() => setDeploymentType('public')}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    deploymentType === 'public'
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      deploymentType === 'public' 
                        ? 'bg-violet-500/20 text-violet-400' 
                        : 'bg-white/10 text-gray-400'
                    }`}>
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">Public Business</span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-violet-500/20 text-violet-400 rounded-full">
                          Monetize
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        Deploy & monetize your app. Requires Stripe Connect to receive payments.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Check className="w-3 h-3 text-green-400" /> Everything in Personal
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <DollarSign className="w-3 h-3 text-yellow-400" /> Accept Payments
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Zap className="w-3 h-3 text-blue-400" /> Analytics
                        </span>
                      </div>
                    </div>
                    {deploymentType === 'public' && (
                      <Check className="w-5 h-5 text-violet-400" />
                    )}
                  </div>
                </button>
              </div>

              {/* Info Box */}
              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-violet-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-300">
                      {deploymentType === 'personal' ? (
                        <>
                          Your app will be deployed to Vercel with a unique URL. 
                          You can add monetization anytime from your dashboard.
                        </>
                      ) : (
                        <>
                          We&#39;ll guide you through Stripe Connect setup after deployment.
                          You&#39;ll be able to set pricing and receive payouts directly.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Deploy Button */}
              <button
                onClick={handleDeploy}
                className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-xl hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2"
              >
                <Rocket className="w-4 h-4" />
                Deploy to Vercel
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {status === 'deploying' && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 relative">
                <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 animate-spin" />
                <Rocket className="absolute inset-0 m-auto w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Deploying Your App
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Building and deploying to Vercel...
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                This usually takes 1-2 minutes
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Successfully Deployed! 🎉
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Your app is now live and accessible to the world.
              </p>

              {/* URL Display */}
              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <input
                    type="text"
                    readOnly
                    value={deploymentUrl}
                    className="flex-1 bg-transparent text-white text-sm outline-none"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <a
                  href={deploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 bg-white text-black font-medium rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Visit App
                </a>
                {deploymentType === 'personal' && (
                  <button
                    onClick={() => {
                      // Navigate to monetization page
                      window.location.href = `/dashboard/apps/${jobId}/monetize`;
                    }}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-xl hover:from-violet-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    Add Monetization
                  </button>
                )}
              </div>

              {/* Close hint */}
              <button
                onClick={onClose}
                className="mt-4 text-sm text-gray-500 hover:text-gray-400 transition-colors"
              >
                Close this dialog
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Deployment Failed
              </h3>
              <p className="text-gray-400 text-sm mb-2">
                {error || 'Something went wrong during deployment.'}
              </p>
              <p className="text-xs text-gray-500 mb-6">
                Please try again or contact support if the issue persists.
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="py-3 px-6 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}