'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  TrendingUp,
  Users,
  DollarSign,
  Zap,
  ExternalLink,
  Edit3,
  BarChart3,
  Settings,
  Rocket,
  Copy,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Package,
} from 'lucide-react';

interface DashboardData {
  overview: {
    totalRevenue: number;
    totalCustomers: number;
    monthlyRecurring: number;
    totalApps: number;
    completedApps: number;
    publishedCount: number;
    draftCount: number;
    activeApps: number;
    recentRevenue: number;
    recentCustomers: number;
  };
  creations: Array<{
    id: string;
    prompt: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    generationMode: string;
    filesCount: number;
    deploymentUrl: string | null;
    deploymentType: string | null;
    publishedApp: {
      id: string;
      name: string;
      slug: string;
      status: string;
      totalRevenue: number;
      totalCustomers: number;
      monthlyRecurring: number;
      pricingModel: string;
    } | null;
    managedApp: {
      id: string;
      name: string;
      subdomain: string;
      status: string;
      deploymentUrl: string;
      marketplaceViews: number;
      marketplaceInstalls: number;
    } | null;
    managedProject: {
      id: string;
      status: string;
      vercelUrl: string | null;
    } | null;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    amount: number;
    createdAt: string;
    appName: string;
    appSlug: string;
  }>;
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
    limits: {
      maxPublishedApps: number;
      platformFeePercent: number;
      features: string[];
    };
    usage: {
      publishedApps: number;
      maxPublishedApps: number;
    };
  };
  stats: {
    totalJobs: number;
    completedJobs: number;
    publishedApps: number;
    activeApps: number;
    totalRevenue: number;
    totalCustomers: number;
  };
}

export default function CreatorDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/creator/dashboard');

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Dashboard error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
      case 'COMPLETED':
      case 'LIVE':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'RUNNING':
      case 'PROVISIONING':
        return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
      case 'DRAFT':
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'FAILED':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Package className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
      case 'COMPLETED':
      case 'LIVE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'RUNNING':
      case 'PROVISIONING':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'DRAFT':
      case 'PENDING':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'FAILED':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-300 mb-4">{error || 'Failed to load dashboard'}</p>
          <button
            onClick={fetchDashboardData}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Creator Dashboard</h1>
          <p className="text-gray-400">
            Manage your apps, track earnings, and grow your creator business
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Revenue</span>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {formatCurrency(data.overview.totalRevenue)}
            </p>
            <p className="text-sm text-emerald-400">
              +{formatCurrency(data.overview.recentRevenue)} this month
            </p>
          </div>

          {/* Total Customers */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Customers</span>
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {data.overview.totalCustomers}
            </p>
            <p className="text-sm text-cyan-400">
              +{data.overview.recentCustomers} this month
            </p>
          </div>

          {/* MRR */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Monthly Recurring</span>
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {formatCurrency(data.overview.monthlyRecurring)}
            </p>
            <p className="text-sm text-purple-400">MRR</p>
          </div>

          {/* Active Apps */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Active Apps</span>
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {data.overview.activeApps}
            </p>
            <p className="text-sm text-gray-400">
              {data.overview.publishedCount} published
            </p>
          </div>
        </div>

        {/* Subscription Info */}
        <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">
                {data.subscription.plan} Plan
              </h3>
              <p className="text-gray-400 text-sm">
                {data.subscription.usage.publishedApps} /{' '}
                {data.subscription.limits.maxPublishedApps === -1
                  ? 'Unlimited'
                  : data.subscription.limits.maxPublishedApps}{' '}
                published apps • {data.subscription.limits.platformFeePercent}% platform fee
              </p>
            </div>
            <Link
              href="/settings/billing"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
            >
              Manage Plan
            </Link>
          </div>
        </div>

        {/* Creations Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Your Creations</h2>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition flex items-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              Create New App
            </Link>
          </div>

          {data.creations.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
              <Package className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No apps yet</h3>
              <p className="text-gray-400 mb-6">
                Start creating your first app to see it here
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
              >
                <Rocket className="w-5 h-5" />
                Create Your First App
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.creations.map((creation) => (
                <div
                  key={creation.id}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-cyan-500/30 transition group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(creation.status)}
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                            creation.status
                          )}`}
                        >
                          {creation.status}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {creation.publishedApp?.name ||
                          creation.managedApp?.name ||
                          creation.prompt.slice(0, 60) + '...'}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {formatDate(creation.createdAt)} • {creation.filesCount} files
                      </p>
                    </div>
                  </div>

                  {/* Metrics for Published Apps */}
                  {creation.publishedApp && (
                    <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-white/5 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Revenue</p>
                        <p className="text-sm font-semibold text-emerald-400">
                          {formatCurrency(creation.publishedApp.totalRevenue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Customers</p>
                        <p className="text-sm font-semibold text-cyan-400">
                          {creation.publishedApp.totalCustomers}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">MRR</p>
                        <p className="text-sm font-semibold text-purple-400">
                          {formatCurrency(creation.publishedApp.monthlyRecurring)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Metrics for Managed Apps */}
                  {creation.managedApp && !creation.publishedApp && (
                    <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-white/5 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Views</p>
                        <p className="text-sm font-semibold text-cyan-400">
                          {creation.managedApp.marketplaceViews}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Installs</p>
                        <p className="text-sm font-semibold text-purple-400">
                          {creation.managedApp.marketplaceInstalls}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Deployment URL */}
                  {creation.deploymentUrl && (
                    <div className="mb-4 p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Eye className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <a
                            href={creation.deploymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-cyan-400 hover:text-cyan-300 truncate"
                          >
                            {creation.deploymentUrl}
                          </a>
                        </div>
                        <button
                          onClick={() => copyToClipboard(creation.deploymentUrl!)}
                          className="ml-2 p-1 hover:bg-white/10 rounded transition"
                        >
                          {copiedUrl === creation.deploymentUrl ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/creations/${creation.id}`}
                      className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition flex items-center justify-center gap-2 text-sm"
                    >
                      <Edit3 className="w-4 h-4" />
                      Manage
                    </Link>

                    {creation.publishedApp && (
                      <Link
                        href={`/dashboard/creations/${creation.id}/analytics`}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition flex items-center gap-2 text-sm"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Analytics
                      </Link>
                    )}

                    {creation.deploymentUrl && (
                      <a
                        href={creation.deploymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition flex items-center gap-2 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {data.recentActivity.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
              <div className="divide-y divide-white/10">
                {data.recentActivity.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-white/5 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-white font-medium">{activity.description}</p>
                        <p className="text-sm text-gray-400">
                          {formatDate(activity.createdAt)}
                        </p>
                      </div>
                      <p className="text-emerald-400 font-semibold">
                        +{formatCurrency(activity.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
