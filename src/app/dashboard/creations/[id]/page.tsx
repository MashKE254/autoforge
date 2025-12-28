'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  ArrowLeft,
  ExternalLink,
  Edit3,
  Save,
  X,
  Sparkles,
  Code,
  Eye,
  Settings,
  BarChart3,
  DollarSign,
  Users,
  TrendingUp,
  Copy,
  CheckCircle2,
  AlertCircle,
  Rocket,
  RefreshCw,
} from 'lucide-react';

interface CreationDetails {
  id: string;
  prompt: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  generationMode: string;
  filesCount: number;
  deploymentUrl: string | null;
  files: Array<{
    id: string;
    path: string;
    language: string;
    size: number;
  }>;
  publishedApp?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    status: string;
    totalRevenue: number;
    totalCustomers: number;
    monthlyRecurring: number;
    pricingModel: string;
    monthlyPrice: number | null;
    yearlyPrice: number | null;
    oneTimePrice: number | null;
  };
  managedApp?: {
    id: string;
    name: string;
    subdomain: string;
    status: string;
    deploymentUrl: string;
    marketplaceViews: number;
    marketplaceInstalls: number;
  };
  managedProject?: {
    id: string;
    status: string;
    vercelUrl: string | null;
  };
}

export default function CreationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [creation, setCreation] = useState<CreationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // AI Update state
  const [showAIEditor, setShowAIEditor] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiUpdating, setAiUpdating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchCreationDetails();
    }
  }, [id]);

  const fetchCreationDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/creations/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Creation not found');
        }
        throw new Error('Failed to fetch creation details');
      }

      const data = await response.json();
      setCreation(data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load creation');
    } finally {
      setLoading(false);
    }
  };

  const handleAIUpdate = async () => {
    if (!aiPrompt.trim()) {
      setAiError('Please enter a prompt for the update');
      return;
    }

    try {
      setAiUpdating(true);
      setAiError(null);

      const response = await fetch(`/api/creations/${id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update creation');
      }

      const data = await response.json();

      // Refresh creation details
      await fetchCreationDetails();

      // Reset form
      setAiPrompt('');
      setShowAIEditor(false);

      // Show success message (you can add a toast notification here)
      alert('Successfully updated! Changes are being deployed...');
    } catch (err) {
      console.error('AI update error:', err);
      setAiError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setAiUpdating(false);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading creation details...</p>
        </div>
      </div>
    );
  }

  if (error || !creation) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-300 mb-4">{error || 'Creation not found'}</p>
          <Link
            href="/dashboard/creator"
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition inline-block"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Gradient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/creator"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {creation.publishedApp?.name ||
                  creation.managedApp?.name ||
                  'Untitled Creation'}
              </h1>
              <p className="text-gray-400">
                Created {formatDate(creation.createdAt)} •{' '}
                {creation.filesCount} files •{' '}
                <span className="capitalize">{creation.status.toLowerCase()}</span>
              </p>
            </div>

            <button
              onClick={() => setShowAIEditor(!showAIEditor)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white rounded-lg transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI Update
            </button>
          </div>
        </div>

        {/* AI Editor Modal */}
        {showAIEditor && (
          <div className="mb-8 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-1">
                  AI-Powered Update
                </h3>
                <p className="text-gray-400 text-sm">
                  Describe what you want to change, add, or improve
                </p>
              </div>
              <button
                onClick={() => setShowAIEditor(false)}
                className="p-1 hover:bg-white/10 rounded transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Example: Add a dark mode toggle to the settings page&#10;Example: Change the primary color to blue&#10;Example: Add a contact form with email validation"
              className="w-full h-32 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 resize-none mb-4"
              disabled={aiUpdating}
            />

            {aiError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{aiError}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleAIUpdate}
                disabled={aiUpdating || !aiPrompt.trim()}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white rounded-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Apply Update
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setShowAIEditor(false);
                  setAiPrompt('');
                  setAiError(null);
                }}
                disabled={aiUpdating}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            <div className="mt-4 p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-gray-400">
                💡 <strong>Tip:</strong> Be specific about what you want to change. The AI will
                update the relevant files and automatically redeploy your app.
              </p>
            </div>
          </div>
        )}

        {/* Deployment Info */}
        {creation.deploymentUrl && (
          <div className="mb-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Live Deployment</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 p-3 bg-white/5 rounded-lg flex items-center gap-2">
                <Eye className="w-5 h-5 text-cyan-400" />
                <a
                  href={creation.deploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 flex-1 truncate"
                >
                  {creation.deploymentUrl}
                </a>
              </div>
              <button
                onClick={() => copyToClipboard(creation.deploymentUrl!)}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition"
              >
                {copiedUrl ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-400" />
                )}
              </button>
              <a
                href={creation.deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition"
              >
                <ExternalLink className="w-5 h-5 text-white" />
              </a>
            </div>
          </div>
        )}

        {/* Published App Metrics */}
        {creation.publishedApp && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Total Revenue</span>
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {formatCurrency(creation.publishedApp.totalRevenue)}
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Total Customers</span>
                  <Users className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {creation.publishedApp.totalCustomers}
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Monthly Recurring</span>
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {formatCurrency(creation.publishedApp.monthlyRecurring)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Files List */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">
            Project Files ({creation.filesCount})
          </h3>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
            <div className="divide-y divide-white/10 max-h-96 overflow-y-auto">
              {creation.files.map((file) => (
                <div
                  key={file.id}
                  className="p-4 hover:bg-white/5 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Code className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-mono text-sm truncate">{file.path}</p>
                      <p className="text-xs text-gray-400">
                        {file.language} •{' '}
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/generate/result/${creation.id}?file=${encodeURIComponent(file.path)}`}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-sm transition"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {creation.publishedApp && (
            <Link
              href={`/dashboard/creations/${creation.id}/analytics`}
              className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:border-cyan-500/30 transition group"
            >
              <BarChart3 className="w-8 h-8 text-cyan-400 mb-3" />
              <h4 className="text-lg font-semibold text-white mb-1">Analytics</h4>
              <p className="text-sm text-gray-400">
                View detailed performance metrics and user insights
              </p>
            </Link>
          )}

          <Link
            href={`/generate/result/${creation.id}`}
            className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:border-cyan-500/30 transition group"
          >
            <Code className="w-8 h-8 text-purple-400 mb-3" />
            <h4 className="text-lg font-semibold text-white mb-1">View Code</h4>
            <p className="text-sm text-gray-400">
              Browse and download all generated files
            </p>
          </Link>

          <button
            onClick={() => setShowAIEditor(true)}
            className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:border-cyan-500/30 transition group text-left"
          >
            <Sparkles className="w-8 h-8 text-yellow-400 mb-3" />
            <h4 className="text-lg font-semibold text-white mb-1">AI Update</h4>
            <p className="text-sm text-gray-400">
              Use AI to make changes and improvements
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
