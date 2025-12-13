// src/components/GoLiveModal.tsx

'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Rocket,
  Database,
  Shield,
  CreditCard,
  Globe,
  Check,
  Loader2,
  AlertCircle,
  ExternalLink,
  Copy,
  Sparkles,
} from 'lucide-react';

interface GoLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  generationJobId: string;
  appName: string;
}

type ProvisioningStep = 'database' | 'auth' | 'payments' | 'preview';
type StepStatus = 'pending' | 'active' | 'complete' | 'error';

interface StepInfo {
  id: ProvisioningStep;
  label: string;
  description: string;
  icon: React.ElementType;
}

const STEPS: StepInfo[] = [
  {
    id: 'database',
    label: 'Database',
    description: 'Provisioning PostgreSQL database',
    icon: Database,
  },
  {
    id: 'auth',
    label: 'Authentication',
    description: 'Setting up user authentication',
    icon: Shield,
  },
  {
    id: 'payments',
    label: 'Payments',
    description: 'Configuring Stripe integration',
    icon: CreditCard,
  },
  {
    id: 'preview',
    label: 'Deployment',
    description: 'Deploying your application',
    icon: Globe,
  },
];

export default function GoLiveModal({
  isOpen,
  onClose,
  generationJobId,
  appName,
}: GoLiveModalProps) {
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [currentStep, setCurrentStep] = useState<ProvisioningStep | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<ProvisioningStep>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [managedProjectId, setManagedProjectId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsProvisioning(false);
      setCurrentStep(null);
      setCompletedSteps(new Set());
      setError(null);
      setLiveUrl(null);
    }
  }, [isOpen]);

  // Poll for status updates
  useEffect(() => {
    if (!managedProjectId || !isProvisioning) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/go-live?id=${managedProjectId}`);
        const data = await response.json();

        if (data.status === 'PREVIEW_READY' || data.status === 'DEPLOYED') {
          setLiveUrl(data.url);
          setIsProvisioning(false);
          setCompletedSteps(new Set(['database', 'auth', 'payments', 'preview']));
          clearInterval(pollInterval);
        } else if (data.status === 'ERROR') {
          setError(data.error);
          setIsProvisioning(false);
          clearInterval(pollInterval);
        } else {
          // Update current step
          const stepMap: Record<string, ProvisioningStep> = {
            'database': 'database',
            'auth': 'auth',
            'payments': 'payments',
            'preview': 'preview',
          };
          
          if (data.step && stepMap[data.step]) {
            setCurrentStep(stepMap[data.step]);
            
            // Mark previous steps as complete
            const stepOrder: ProvisioningStep[] = ['database', 'auth', 'payments', 'preview'];
            const currentIndex = stepOrder.indexOf(stepMap[data.step]);
            const completed = new Set(stepOrder.slice(0, currentIndex));
            setCompletedSteps(completed);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [managedProjectId, isProvisioning]);

  const handleGoLive = async () => {
    setIsProvisioning(true);
    setError(null);
    setCurrentStep('database');

    try {
      const response = await fetch('/api/go-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generationJobId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start provisioning');
      }

      setManagedProjectId(data.managedProjectId);

      if (data.previewUrl) {
        // Already provisioned
        setLiveUrl(data.previewUrl);
        setIsProvisioning(false);
        setCompletedSteps(new Set(['database', 'auth', 'payments', 'preview']));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsProvisioning(false);
    }
  };

  const handleCopyUrl = () => {
    if (liveUrl) {
      navigator.clipboard.writeText(liveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStepStatus = (stepId: ProvisioningStep): StepStatus => {
    if (completedSteps.has(stepId)) return 'complete';
    if (currentStep === stepId) return 'active';
    return 'pending';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Go Live</h2>
              <p className="text-sm text-gray-400">{appName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isProvisioning && !liveUrl && !error && (
            <>
              {/* What happens */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  We&#39;ll automatically set up:
                </h3>
                <div className="space-y-3">
                  {STEPS.map((step) => (
                    <div key={step.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                        <step.icon className="w-4 h-4 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{step.label}</p>
                        <p className="text-xs text-gray-500">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time estimate */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 mb-6">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span className="text-sm text-violet-300">
                  Takes about 2-3 minutes. No configuration needed.
                </span>
              </div>

              {/* Go Live Button */}
              <button
                onClick={handleGoLive}
                className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-xl hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2"
              >
                <Rocket className="w-4 h-4" />
                Go Live Now
              </button>
            </>
          )}

          {isProvisioning && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 animate-spin" />
                  <Rocket className="absolute inset-0 m-auto w-6 h-6 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Setting Up Your App</h3>
                <p className="text-sm text-gray-400">This takes about 2-3 minutes</p>
              </div>

              {/* Progress Steps */}
              <div className="space-y-2">
                {STEPS.map((step, index) => {
                  const status = getStepStatus(step.id);
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        status === 'active'
                          ? 'bg-violet-500/10 border border-violet-500/20'
                          : status === 'complete'
                          ? 'bg-green-500/10 border border-green-500/20'
                          : 'bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        status === 'active'
                          ? 'bg-violet-500/20'
                          : status === 'complete'
                          ? 'bg-green-500/20'
                          : 'bg-white/5'
                      }`}>
                        {status === 'complete' ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : status === 'active' ? (
                          <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                        ) : (
                          <step.icon className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          status === 'active'
                            ? 'text-violet-300'
                            : status === 'complete'
                            ? 'text-green-300'
                            : 'text-gray-500'
                        }`}>
                          {step.label}
                        </p>
                        <p className={`text-xs ${
                          status === 'active' ? 'text-violet-400' : 'text-gray-600'
                        }`}>
                          {status === 'active' ? step.description : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {liveUrl && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Your App is Live! 🎉
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Everything is set up and ready to go.
              </p>

              {/* URL Display */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="flex-1 text-sm text-white truncate">{liveUrl}</span>
                <button
                  onClick={handleCopyUrl}
                  className="p-1.5 rounded hover:bg-white/10 transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open App
                </a>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Something Went Wrong
              </h3>
              <p className="text-red-400 text-sm mb-6">{error}</p>
              <button
                onClick={handleGoLive}
                className="py-2.5 px-6 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors"
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