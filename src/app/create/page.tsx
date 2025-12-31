'use client';

/**
 * NON-TECHNICAL WIZARD ONBOARDING
 *
 * File: src/app/create/page.tsx
 *
 * The Shopify-level simple wizard for non-technical users.
 * NO CODE. NO FILES. NO JARGON.
 *
 * Flow:
 * 1. "What do you want to build?" - AI-suggested templates
 * 2. "Who will use this?" - Auto-selects tier (Personal/Team/Sell)
 * 3. "Generating..." - Plain English progress
 * 4. "Your app is ready!" - Interactive preview
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Sparkles,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  User,
  Users,
  DollarSign,
  Zap,
  Rocket,
  MessageSquare,
  ShoppingBag,
  TrendingUp,
  Calendar,
  FileText,
  BarChart,
  Mail,
  Clock,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type WizardStep = 'idea' | 'purpose' | 'generating' | 'ready';

interface AppTemplate {
  id: string;
  icon: any;
  title: string;
  description: string;
  prompt: string;
  color: string;
}

interface AppPurpose {
  id: 'personal' | 'team' | 'sell';
  icon: any;
  title: string;
  description: string;
  badge?: string;
}

// ============================================================================
// DATA
// ============================================================================

const APP_TEMPLATES: AppTemplate[] = [
  {
    id: 'crm',
    icon: Users,
    title: 'Customer Manager',
    description: 'Track your customers, leads, and sales',
    prompt: 'Build a CRM to track customers, leads, and sales pipeline with contact management',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'inventory',
    icon: ShoppingBag,
    title: 'Inventory Tracker',
    description: 'Manage your products and stock levels',
    prompt: 'Build an inventory management system to track products, stock levels, and orders',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'booking',
    icon: Calendar,
    title: 'Booking System',
    description: 'Let customers book appointments with you',
    prompt: 'Build a booking and appointment scheduling system with calendar and notifications',
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'analytics',
    icon: BarChart,
    title: 'Analytics Dashboard',
    description: 'Visualize your business data',
    prompt: 'Build an analytics dashboard to visualize business metrics, charts, and reports',
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'email',
    icon: Mail,
    title: 'Email Campaign Tool',
    description: 'Send newsletters to your audience',
    prompt: 'Build an email campaign and newsletter tool with templates and subscriber management',
    color: 'from-indigo-500 to-blue-500',
  },
  {
    id: 'invoice',
    icon: FileText,
    title: 'Invoice Generator',
    description: 'Create and send professional invoices',
    prompt: 'Build an invoicing system to create, send, and track invoices with payment tracking',
    color: 'from-cyan-500 to-teal-500',
  },
  {
    id: 'ecommerce',
    icon: TrendingUp,
    title: 'Online Store',
    description: 'Sell products online with payments',
    prompt: 'Build an e-commerce store with product listings, shopping cart, and Stripe payments',
    color: 'from-pink-500 to-rose-500',
  },
  {
    id: 'custom',
    icon: Sparkles,
    title: 'Something Else',
    description: 'Describe your own idea',
    prompt: '',
    color: 'from-violet-500 to-purple-500',
  },
];

const APP_PURPOSES: AppPurpose[] = [
  {
    id: 'personal',
    icon: User,
    title: 'Just for me',
    description: 'Personal tool to help me work faster',
  },
  {
    id: 'team',
    icon: Users,
    title: 'For my team',
    description: 'Share with colleagues and team members',
    badge: 'Popular',
  },
  {
    id: 'sell',
    icon: DollarSign,
    title: 'To sell',
    description: 'Monetize and sell to customers',
    badge: 'Most Revenue',
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CreateWizard() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('idea');
  const [selectedTemplate, setSelectedTemplate] = useState<AppTemplate | null>(null);
  const [customIdea, setCustomIdea] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState<AppPurpose | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?from=/create');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleTemplateSelect = (template: AppTemplate) => {
    setSelectedTemplate(template);
    setError(null);

    // If custom, don't auto-advance
    if (template.id !== 'custom') {
      setTimeout(() => setStep('purpose'), 300);
    }
  };

  const handleCustomSubmit = () => {
    if (!customIdea.trim()) {
      setError('Please describe what you want to build');
      return;
    }

    setSelectedTemplate({
      id: 'custom',
      icon: Sparkles,
      title: customIdea.slice(0, 50),
      description: customIdea,
      prompt: customIdea,
      color: 'from-violet-500 to-purple-500',
    });

    setStep('purpose');
  };

  const handlePurposeSelect = (purpose: AppPurpose) => {
    setSelectedPurpose(purpose);
    setError(null);
    setTimeout(() => startGeneration(purpose), 500);
  };

  const startGeneration = async (purpose: AppPurpose) => {
    if (!selectedTemplate) return;

    setStep('generating');
    setIsGenerating(true);
    setGenerationProgress(0);
    setCurrentStep('Starting your project...');

    try {
      // Simulate progress updates
      const progressSteps = [
        { progress: 10, message: 'Understanding your idea...' },
        { progress: 25, message: 'Designing your app...' },
        { progress: 40, message: 'Building features...' },
        { progress: 60, message: 'Adding finishing touches...' },
        { progress: 80, message: 'Testing everything...' },
        { progress: 95, message: 'Almost ready...' },
      ];

      let stepIndex = 0;
      const progressInterval = setInterval(() => {
        if (stepIndex < progressSteps.length) {
          const { progress, message } = progressSteps[stepIndex];
          setGenerationProgress(progress);
          setCurrentStep(message);
          stepIndex++;
        }
      }, 3000);

      // Determine generation mode based on purpose
      const mode = purpose.id === 'personal'
        ? 'PERSONAL'
        : purpose.id === 'team'
        ? 'TEAM'
        : 'PREVIEW'; // For sell, start with preview

      // Call generation API
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: selectedTemplate.prompt,
          mode,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create your app');
      }

      const data = await response.json();
      setJobId(data.jobId);

      setGenerationProgress(100);
      setCurrentStep('Your app is ready!');

      // Move to ready step
      setTimeout(() => {
        setStep('ready');
      }, 1000);

    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsGenerating(false);

      // Go back to purpose selection
      setTimeout(() => setStep('purpose'), 2000);
    }
  };

  const goBack = () => {
    if (step === 'purpose') {
      setStep('idea');
      setSelectedTemplate(null);
      setCustomIdea('');
    } else if (step === 'generating' || step === 'ready') {
      // Can't go back during/after generation
      return;
    }
  };

  const viewApp = () => {
    if (jobId) {
      router.push(`/workspace/${jobId}`);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Create Your App</h1>
                <p className="text-xs text-gray-500">No code required</p>
              </div>
            </div>

            {/* Progress dots */}
            {step !== 'ready' && (
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full transition-all ${step === 'idea' ? 'bg-violet-500 w-6' : 'bg-white/20'}`} />
                <div className={`w-2 h-2 rounded-full transition-all ${step === 'purpose' ? 'bg-violet-500 w-6' : 'bg-white/20'}`} />
                <div className={`w-2 h-2 rounded-full transition-all ${step === 'generating' ? 'bg-violet-500 w-6' : 'bg-white/20'}`} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-16 max-w-6xl">

        {/* STEP 1: IDEA */}
        {step === 'idea' && (
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                What do you want to build?
              </h2>
              <p className="text-xl text-gray-400">
                Choose a template or describe your own idea
              </p>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {APP_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className={`group relative text-left p-6 rounded-2xl border-2 transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                    <template.icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Text */}
                  <h3 className="text-lg font-semibold mb-2">{template.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {template.description}
                  </p>

                  {/* Check mark */}
                  {selectedTemplate?.id === template.id && (
                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Custom idea input */}
            {selectedTemplate?.id === 'custom' && (
              <div className="max-w-2xl mx-auto mt-8 animate-fade-in-up">
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                  <label className="block text-sm font-medium text-gray-400 mb-3">
                    Describe what you want to build
                  </label>
                  <textarea
                    value={customIdea}
                    onChange={(e) => setCustomIdea(e.target.value)}
                    placeholder="e.g., A tool to manage my rental properties with tenant info, payment tracking, and maintenance requests..."
                    className="w-full h-32 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    autoFocus
                  />

                  <button
                    onClick={handleCustomSubmit}
                    disabled={!customIdea.trim()}
                    className="mt-4 w-full px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="max-w-2xl mx-auto mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: PURPOSE */}
        {step === 'purpose' && (
          <div className="max-w-4xl mx-auto">
            <button
              onClick={goBack}
              className="mb-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Who will use this?
              </h2>
              <p className="text-xl text-gray-400">
                This helps us set up the right features for you
              </p>
            </div>

            {/* Purpose options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {APP_PURPOSES.map((purpose) => (
                <button
                  key={purpose.id}
                  onClick={() => handlePurposeSelect(purpose)}
                  className={`group relative text-center p-8 rounded-2xl border-2 transition-all hover:scale-105 ${
                    selectedPurpose?.id === purpose.id
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]'
                  }`}
                >
                  {/* Badge */}
                  {purpose.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-semibold rounded-full">
                      {purpose.badge}
                    </div>
                  )}

                  {/* Icon */}
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 flex items-center justify-center mb-6 transition-all group-hover:scale-110">
                    <purpose.icon className="w-8 h-8 text-violet-400" />
                  </div>

                  {/* Text */}
                  <h3 className="text-xl font-semibold mb-3">{purpose.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {purpose.description}
                  </p>

                  {/* Check mark */}
                  {selectedPurpose?.id === purpose.id && (
                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Preview of selected */}
            {selectedTemplate && (
              <div className="mt-12 p-6 bg-white/[0.02] border border-white/10 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${selectedTemplate.color} flex items-center justify-center flex-shrink-0`}>
                    <selectedTemplate.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">You're building:</p>
                    <p className="text-lg font-semibold">{selectedTemplate.title}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: GENERATING */}
        {step === 'generating' && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-12">
              {/* Animated icon */}
              <div className="relative inline-flex items-center justify-center w-32 h-32 mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-violet-600 rounded-full blur-2xl opacity-50 animate-pulse" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center">
                  <Rocket className="w-12 h-12 text-white animate-bounce" />
                </div>
              </div>

              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Building your app
              </h2>
              <p className="text-xl text-gray-400 mb-8">
                {currentStep}
              </p>

              {/* Progress bar */}
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-1000 ease-out"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500">{generationProgress}% complete</p>
            </div>

            {/* What's happening */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="p-6 bg-white/[0.02] border border-white/10 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center mb-4">
                  <Zap className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="font-semibold mb-2">Smart Features</h3>
                <p className="text-sm text-gray-400">
                  Adding exactly what you need
                </p>
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/10 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="font-semibold mb-2">Clean Design</h3>
                <p className="text-sm text-gray-400">
                  Professional look and feel
                </p>
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/10 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5 text-pink-400" />
                </div>
                <h3 className="font-semibold mb-2">Ready to Use</h3>
                <p className="text-sm text-gray-400">
                  Works immediately after
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: READY */}
        {step === 'ready' && (
          <div className="max-w-3xl mx-auto text-center">
            {/* Success animation */}
            <div className="relative inline-flex items-center justify-center w-32 h-32 mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-2xl opacity-50" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                <Check className="w-12 h-12 text-white" />
              </div>
            </div>

            <h2 className="text-5xl md:text-6xl font-bold mb-4">
              Your app is ready!
            </h2>
            <p className="text-xl text-gray-400 mb-12">
              {selectedTemplate?.title} has been created and is ready to use
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={viewApp}
                className="px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-500 hover:to-purple-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
              >
                <Rocket className="w-5 h-5" />
                Open My App
              </button>

              <button
                onClick={() => router.push('/dashboard')}
                className="px-8 py-4 bg-white/[0.05] border border-white/10 text-white rounded-xl font-semibold hover:bg-white/[0.10] hover:border-white/20 transition-all"
              >
                Go to Dashboard
              </button>
            </div>

            {/* What's next */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="p-6 bg-white/[0.02] border border-white/10 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2">Customize It</h3>
                <p className="text-sm text-gray-400">
                  Chat with AI to add features and make changes
                </p>
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/10 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
                  <Rocket className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="font-semibold mb-2">Go Live</h3>
                <p className="text-sm text-gray-400">
                  Deploy to the web with one click
                </p>
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/10 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                  <DollarSign className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="font-semibold mb-2">Earn Money</h3>
                <p className="text-sm text-gray-400">
                  {selectedPurpose?.id === 'sell'
                    ? 'List in marketplace and start earning'
                    : 'Upgrade to sell in marketplace later'}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
