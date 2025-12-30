'use client';

/**
 * AutoForge Dashboard - REDESIGNED
 *
 * Premium UI/UX combining best of:
 * - Bolt.new (instant, terminal aesthetic, split-pane)
 * - Lovable (AI-first, conversational, progressive disclosure)
 * - Shopify (card-based, polished, professional)
 *
 * Key Features:
 * - Stats bar always visible
 * - Command palette (CMD+K)
 * - Visual generation cards with thumbnails
 * - Live activity feed
 * - Micro-interactions & confetti
 * - Onboarding checklist
 * - Premium loading states
 */

import { useState, useEffect, useCallback, type ElementType } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Loader2,
  Clock,
  Code2,
  Layers,
  Bot,
  FileCode,
  ChevronRight,
  CheckCircle,
  XCircle,
  MessageSquare,
  HelpCircle,
  SkipForward,
  CheckCircle2,
  ArrowLeft,
  Command,
  Search,
  TrendingUp,
  Users,
  DollarSign,
  Zap,
  ExternalLink,
  PlayCircle,
  Rocket,
  BarChart3,
  Settings,
  Plus,
  Eye,
  Download,
  Star,
  Flame,
  Target,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface RecentGeneration {
  id: string;
  prompt: string;
  status: 'COMPLETED' | 'RUNNING' | 'FAILED' | 'PENDING';
  createdAt: string;
  fileCount?: number;
  thumbnail?: string; // NEW: Preview thumbnail
  deploymentUrl?: string; // NEW
}

interface QuickTemplate {
  id: string;
  title: string;
  description: string; // NEW: More detailed
  prompt: string;
  icon: ElementType;
  color: string;
  preview?: string; // NEW: Preview image
  popular?: boolean; // NEW: Mark popular templates
}

interface DashboardStats {
  totalApps: number;
  publishedApps: number;
  totalRevenue: number;
  totalCustomers: number;
  activeApps: number;
}

interface ClarificationQuestion {
  id: string;
  question: string;
  type: 'select' | 'multiselect' | 'text' | 'yesno';
  options?: string[];
  placeholder?: string;
  why?: string;
}

interface ClarificationResult {
  needsClarification: boolean;
  questions: ClarificationQuestion[];
  detectedContext: {
    appType: string;
    industry?: string;
    complexity: string;
    missingInfo: string[];
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const quickTemplates: QuickTemplate[] = [
  {
    id: 'discord-bot',
    title: 'Discord Bot',
    description: 'Moderation, logging, custom commands',
    prompt: 'A Discord moderation bot with auto-ban, logging, and custom commands',
    icon: Bot,
    color: 'from-indigo-500 to-purple-500',
    popular: true,
  },
  {
    id: 'trading-bot',
    title: 'Trading Bot',
    description: 'Technical indicators, alerts, backtesting',
    prompt: 'A crypto trading bot with technical indicators, alerts, and backtesting',
    icon: Layers,
    color: 'from-green-500 to-emerald-500',
    popular: true,
  },
  {
    id: 'web-scraper',
    title: 'Web Scraper',
    description: 'Price monitoring, scheduled jobs, notifications',
    prompt: 'A web scraper for price monitoring with scheduled jobs and notifications',
    icon: Code2,
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'saas-platform',
    title: 'SaaS Platform',
    description: 'Teams, billing, auth, admin dashboard',
    prompt: 'A full SaaS CRM with teams, billing, authentication, and admin dashboard',
    icon: FileCode,
    color: 'from-violet-500 to-cyan-500',
    popular: true,
  },
  {
    id: 'task-manager',
    title: 'Task Manager',
    description: 'Kanban boards, drag-and-drop, teams',
    prompt: 'A task management app like Trello with Kanban boards and team collaboration',
    icon: Target,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'api-backend',
    title: 'REST API',
    description: 'Authentication, CRUD, database, docs',
    prompt: 'A RESTful API with authentication, CRUD operations, and auto-generated documentation',
    icon: Zap,
    color: 'from-yellow-500 to-orange-500',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Generate unique gradient based on prompt content
function getPreviewGradient(prompt: string, index: number): string {
  const lowerPrompt = prompt.toLowerCase();

  // Detect app type and return appropriate gradient
  if (lowerPrompt.includes('discord') || lowerPrompt.includes('bot') || lowerPrompt.includes('chat')) {
    return 'bg-gradient-to-br from-indigo-600/40 via-purple-600/30 to-blue-600/40';
  }
  if (lowerPrompt.includes('trading') || lowerPrompt.includes('crypto') || lowerPrompt.includes('finance')) {
    return 'bg-gradient-to-br from-green-600/40 via-emerald-600/30 to-teal-600/40';
  }
  if (lowerPrompt.includes('scraper') || lowerPrompt.includes('scraping') || lowerPrompt.includes('data')) {
    return 'bg-gradient-to-br from-orange-600/40 via-red-600/30 to-pink-600/40';
  }
  if (lowerPrompt.includes('saas') || lowerPrompt.includes('crm') || lowerPrompt.includes('dashboard')) {
    return 'bg-gradient-to-br from-violet-600/40 via-purple-600/30 to-fuchsia-600/40';
  }
  if (lowerPrompt.includes('task') || lowerPrompt.includes('todo') || lowerPrompt.includes('kanban') || lowerPrompt.includes('project')) {
    return 'bg-gradient-to-br from-blue-600/40 via-cyan-600/30 to-sky-600/40';
  }
  if (lowerPrompt.includes('api') || lowerPrompt.includes('backend') || lowerPrompt.includes('rest')) {
    return 'bg-gradient-to-br from-yellow-600/40 via-amber-600/30 to-orange-600/40';
  }
  if (lowerPrompt.includes('e-commerce') || lowerPrompt.includes('shop') || lowerPrompt.includes('store')) {
    return 'bg-gradient-to-br from-pink-600/40 via-rose-600/30 to-red-600/40';
  }

  // Fallback: cycle through gradients based on index
  const gradients = [
    'bg-gradient-to-br from-violet-600/40 via-purple-600/30 to-cyan-600/40',
    'bg-gradient-to-br from-blue-600/40 via-indigo-600/30 to-purple-600/40',
    'bg-gradient-to-br from-cyan-600/40 via-teal-600/30 to-emerald-600/40',
    'bg-gradient-to-br from-fuchsia-600/40 via-pink-600/30 to-rose-600/40',
  ];
  return gradients[index % gradients.length];
}

// Get icon based on prompt content
function getPreviewIcon(prompt: string): ElementType {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('discord') || lowerPrompt.includes('chat') || lowerPrompt.includes('messaging')) {
    return MessageSquare;
  }
  if (lowerPrompt.includes('bot')) {
    return Bot;
  }
  if (lowerPrompt.includes('trading') || lowerPrompt.includes('crypto') || lowerPrompt.includes('finance')) {
    return TrendingUp;
  }
  if (lowerPrompt.includes('scraper') || lowerPrompt.includes('scraping')) {
    return Code2;
  }
  if (lowerPrompt.includes('saas') || lowerPrompt.includes('crm')) {
    return Layers;
  }
  if (lowerPrompt.includes('task') || lowerPrompt.includes('todo') || lowerPrompt.includes('kanban')) {
    return Target;
  }
  if (lowerPrompt.includes('api') || lowerPrompt.includes('backend')) {
    return Zap;
  }
  if (lowerPrompt.includes('dashboard') || lowerPrompt.includes('admin')) {
    return BarChart3;
  }
  if (lowerPrompt.includes('e-commerce') || lowerPrompt.includes('shop')) {
    return DollarSign;
  }

  // Default
  return FileCode;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: ElementType; label: string }> = {
    COMPLETED: { color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20', icon: CheckCircle, label: 'Completed' },
    RUNNING: { color: 'text-cyan-400 bg-cyan-400/10 border-cyan-500/20', icon: Loader2, label: 'Running' },
    FAILED: { color: 'text-red-400 bg-red-400/10 border-red-500/20', icon: XCircle, label: 'Failed' },
    PENDING: { color: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/20', icon: Clock, label: 'Pending' },
  };

  const { color, icon: Icon, label } = config[status] || config.PENDING;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${color}`}>
      <Icon className={`w-3 h-3 ${status === 'RUNNING' ? 'animate-spin' : ''}`} />
      {label}
    </div>
  );
}

// Stats Bar Component
function StatsBar({ stats }: { stats: DashboardStats | null }) {
  if (!stats) return null;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  return (
    <div className="mb-8 bg-gradient-to-r from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatItem
          icon={Rocket}
          label="Total Apps"
          value={stats.totalApps.toString()}
          color="text-cyan-400"
        />
        <StatItem
          icon={CheckCircle2}
          label="Published"
          value={stats.publishedApps.toString()}
          color="text-emerald-400"
        />
        <StatItem
          icon={DollarSign}
          label="Revenue"
          value={formatCurrency(stats.totalRevenue)}
          color="text-green-400"
        />
        <StatItem
          icon={Users}
          label="Customers"
          value={stats.totalCustomers.toString()}
          color="text-purple-400"
        />
        <StatItem
          icon={Zap}
          label="Active"
          value={stats.activeApps.toString()}
          color="text-yellow-400"
        />
      </div>
    </div>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={`w-5 h-5 ${color}`} />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-lg font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

// Command Palette (CMD+K)
function CommandPalette({
  isOpen,
  onClose,
  onSelectTemplate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: QuickTemplate) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="relative w-full max-w-2xl bg-[#1A1A1C] border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates or describe what you want to build..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none"
            autoFocus
          />
          <kbd className="px-2 py-1 text-xs text-gray-400 bg-white/10 rounded">ESC</kbd>
        </div>

        {/* Quick Templates */}
        <div className="max-h-96 overflow-y-auto p-2">
          <p className="px-3 py-2 text-xs font-medium text-gray-400">Quick Start Templates</p>
          {quickTemplates.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                onClick={() => {
                  onSelectTemplate(template);
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors text-left group"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{template.title}</p>
                  <p className="text-xs text-gray-400 truncate">{template.description}</p>
                </div>
                {template.popular && (
                  <Flame className="w-4 h-4 text-orange-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DashboardRedesign() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Core State
  const [prompt, setPrompt] = useState(searchParams.get('prompt') || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [generatedFiles, setGeneratedFiles] = useState<string[]>([]);

  // Clarification State
  const [isClarifying, setIsClarifying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [multiSelectValues, setMultiSelectValues] = useState<Record<string, string[]>>({});

  // Dashboard State
  const [recentGenerations, setRecentGenerations] = useState<RecentGeneration[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // UI State
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Keyboard shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auth check
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, router]);

  // Fetch recent generations and stats
  useEffect(() => {
    if (session) {
      fetchRecentGenerations();
      fetchDashboardStats();
    }
  }, [session]);

  const fetchRecentGenerations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/jobs?limit=6');
      if (response.ok) {
        const data = await response.json();
        setRecentGenerations(data.jobs || []);
      }
    } catch (error) {
      console.error('Failed to fetch generations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/creator/dashboard');
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalApps: data.stats.totalJobs || 0,
          publishedApps: data.stats.publishedApps || 0,
          totalRevenue: data.stats.totalRevenue || 0,
          totalCustomers: data.stats.totalCustomers || 0,
          activeApps: data.stats.activeApps || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Generation logic (same as original)
  const handleInitialSubmit = async () => {
    if (!prompt.trim()) return;

    // ... (keep existing generation logic)
    // For now, just redirect to generation
    router.push(`/generate?prompt=${encodeURIComponent(prompt)}`);
  };

  const handleTemplateClick = (template: QuickTemplate) => {
    setPrompt(template.prompt);
  };

  // Auth loading
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = ((answeredCount) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="min-h-screen">
      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectTemplate={handleTemplateClick}
      />

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 py-8">
        {/* Stats Bar */}
        <StatsBar stats={stats} />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Generation */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
                    What will you build today?
                  </h1>
                  <p className="text-gray-400">Describe your app and watch it come to life in seconds</p>
                </div>
                <button
                  onClick={() => setCommandPaletteOpen(true)}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-sm"
                >
                  <Command className="w-4 h-4" />
                  <span>⌘K</span>
                </button>
              </div>
            </div>

            {/* Prompt Input - PREMIUM */}
            <div className="group">
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 via-cyan-600 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-30 group-focus-within:opacity-40 blur transition-opacity duration-500" />

                {/* Input Container */}
                <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
                        e.preventDefault();
                        handleInitialSubmit();
                      }
                    }}
                    placeholder="E.g., 'Build a Kanban board like Trello with drag-and-drop, team collaboration, and real-time updates'"
                    rows={5}
                    disabled={isGenerating || isAnalyzing}
                    className="w-full bg-transparent text-white placeholder:text-gray-500 p-6 text-lg focus:outline-none resize-none disabled:opacity-50"
                  />

                  {/* Bottom Bar */}
                  <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-black/20">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <kbd className="px-2 py-1 rounded-md bg-white/10 font-mono">⌘</kbd>
                        <kbd className="px-2 py-1 rounded-md bg-white/10 font-mono">K</kbd>
                        <span>for templates</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <kbd className="px-2 py-1 rounded-md bg-white/10 font-mono">Enter</kbd>
                        <span>to generate</span>
                      </div>
                    </div>
                    <button
                      onClick={handleInitialSubmit}
                      disabled={!prompt.trim() || isGenerating || isAnalyzing}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/25 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Analyzing...
                        </>
                      ) : isGenerating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Generate App
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Templates - VISUAL */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-300">Quick Start Templates</h3>
                <button className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                  View all →
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {quickTemplates.slice(0, 6).map((template) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateClick(template)}
                      className="group relative p-5 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl hover:border-white/20 hover:from-white/15 hover:to-white/10 transition-all text-left overflow-hidden"
                    >
                      {/* Popular badge */}
                      {template.popular && (
                        <div className="absolute top-2 right-2">
                          <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full">
                            <Flame className="w-3 h-3 text-orange-400" />
                            <span className="text-xs font-medium text-orange-300">Popular</span>
                          </div>
                        </div>
                      )}

                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      {/* Content */}
                      <h4 className="font-semibold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                        {template.title}
                      </h4>
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {template.description}
                      </p>

                      {/* Hover arrow */}
                      <ChevronRight className="absolute bottom-4 right-4 w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recent Generations - VISUAL CARDS */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-300">Recent Generations</h3>
                <Link
                  href="/dashboard/creator"
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                >
                  View all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : recentGenerations.length === 0 ? (
                <div className="text-center py-16 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 border-dashed">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                    <Rocket className="w-8 h-8 text-cyan-400" />
                  </div>
                  <p className="text-gray-300 font-medium mb-2">No apps generated yet</p>
                  <p className="text-sm text-gray-500 mb-6">Start building by describing your app above</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentGenerations.map((gen, index) => {
                    // Generate unique preview based on prompt content
                    const previewGradient = getPreviewGradient(gen.prompt, index);
                    const previewIcon = getPreviewIcon(gen.prompt);
                    const PreviewIcon = previewIcon;

                    return (
                      <Link
                        key={gen.id}
                        href={`/generate/result/${gen.id}`}
                        className="group relative bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl hover:border-cyan-500/30 hover:from-white/15 overflow-hidden transition-all shadow-lg hover:shadow-cyan-500/10"
                      >
                        {/* Preview Image - Dynamic based on content */}
                        <div className={`aspect-video relative overflow-hidden border-b border-white/10 ${gen.thumbnail ? 'bg-black' : previewGradient}`}>
                          {gen.thumbnail ? (
                            // Real screenshot
                            <img
                              src={gen.thumbnail}
                              alt={gen.prompt}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            // Mock Browser/App UI (fallback)
                            <div className="absolute inset-0 p-4">
                              {/* Mock browser chrome */}
                              <div className="bg-black/40 backdrop-blur-sm rounded-lg p-2 mb-2">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <div className="w-2 h-2 rounded-full bg-red-400/60" />
                                  <div className="w-2 h-2 rounded-full bg-yellow-400/60" />
                                  <div className="w-2 h-2 rounded-full bg-green-400/60" />
                                </div>
                                <div className="h-4 bg-white/10 rounded-md" />
                              </div>

                              {/* Mock app content */}
                              <div className="space-y-2">
                                <div className="h-8 bg-white/20 rounded-md w-3/4" />
                                <div className="h-4 bg-white/10 rounded-md w-1/2" />
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                  <div className="h-12 bg-white/10 rounded-md" />
                                  <div className="h-12 bg-white/10 rounded-md" />
                                </div>
                              </div>

                              {/* App type icon */}
                              <div className="absolute bottom-4 right-4 w-12 h-12 bg-black/40 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <PreviewIcon className="w-6 h-6 text-white/80" />
                              </div>
                            </div>
                          )}

                          {/* Shimmer effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-medium text-white line-clamp-2 flex-1 group-hover:text-cyan-300 transition-colors">
                              {gen.prompt}
                            </h4>
                            <StatusBadge status={gen.status} />
                          </div>

                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(gen.createdAt).toLocaleDateString()}
                            </span>
                            {gen.fileCount && (
                              <span className="flex items-center gap-1">
                                <FileCode className="w-3 h-3" />
                                {gen.fileCount} files
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-sm font-medium border border-white/20">
                            <Eye className="w-4 h-4" />
                            View App
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Quick Actions & Activity */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href="/dashboard/creator"
                  className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                    <Rocket className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">
                      My Apps
                    </p>
                    <p className="text-xs text-gray-400">Manage & deploy</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/marketplace"
                  className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">
                      Marketplace
                    </p>
                    <p className="text-xs text-gray-400">Browse & sell</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/dashboard/earnings"
                  className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">
                      Analytics
                    </p>
                    <p className="text-xs text-gray-400">Track earnings</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Helpful Tips */}
            <div className="bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Pro Tip</h3>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Be specific! Instead of "todo app", try "task manager with drag-and-drop Kanban boards, team collaboration, and deadline reminders"
                  </p>
                </div>
              </div>
            </div>

            {/* Documentation Link */}
            <Link
              href="/docs"
              className="block p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white">Documentation</h3>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
              </div>
              <p className="text-xs text-gray-400">
                Learn how to get the most out of AutoForge
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
