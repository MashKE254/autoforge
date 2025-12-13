/**
 * Expanded Software Recommender Page
 * 
 * File: src/app/recommend/page.tsx
 * 
 * Now shows recommendations across ALL AutoForge capabilities:
 * - UI Apps, SaaS, Automations, AI Assistants, APIs
 * - Visual tabs to filter by solution type
 * - Clear badges showing what each solution IS
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Sparkles,
  ArrowRight,
  Clock,
  DollarSign,
  TrendingUp,
  Zap,
  Target,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  BarChart3,
  Users,
  Building2,
  Briefcase,
  Loader2,
  Copy,
  Check,
  Star,
  ArrowLeft,
  Rocket,
  Bot,
  Workflow,
  Code,
  LayoutDashboard,
  CreditCard,
  Server,
  Wrench,
  Filter,
  Gift,
  MessageSquare,
  Calendar,
  Mail,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type SolutionType = 'ui-app' | 'saas' | 'automation' | 'ai-assistant' | 'api-backend' | 'internal-tool';

interface SoftwareRecommendation {
  id: string;
  name: string;
  tagline: string;
  description: string;
  solutionType: SolutionType;
  category: string;
  complexity: 'simple' | 'moderate' | 'complex';
  buildTime: string;
  generator: string;
  prompt: string;
  roi: {
    monetary: {
      timeSavedPerWeek: string;
      estimatedHourlyValue: number;
      monthlyValueMin: number;
      monthlyValueMax: number;
      revenueModel?: string;
      costSavings?: string;
    };
    nonMonetary: {
      benefits: string[];
      impactAreas: string[];
      painPointsSolved: string[];
    };
    overallScore: number;
    quickWin: boolean;
  };
  techHighlights: string[];
  similarTools: string[];
  bestFor: string[];
  triggers?: string[];
  integrations?: string[];
  aiCapabilities?: string[];
}

interface RecommendationResponse {
  role: string;
  industry?: string;
  recommendations: SoftwareRecommendation[];
  byType: { [key in SolutionType]?: SoftwareRecommendation[] };
  topPick: SoftwareRecommendation;
  totalPotentialMonthlyValue: { min: number; max: number };
}

// ============================================================================
// SOLUTION TYPE CONFIG
// ============================================================================

const solutionTypeConfig: Record<SolutionType, {
  label: string;
  icon: typeof LayoutDashboard;
  color: string;
  bgColor: string;
  description: string;
}> = {
  'ui-app': {
    label: 'UI Apps',
    icon: LayoutDashboard,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    description: 'Dashboards, forms, trackers',
  },
  'saas': {
    label: 'SaaS Products',
    icon: CreditCard,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/20',
    description: 'Subscription services',
  },
  'automation': {
    label: 'Automations',
    icon: Workflow,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    description: 'Workflows & triggers',
  },
  'ai-assistant': {
    label: 'AI Assistants',
    icon: Bot,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    description: 'Chatbots & agents',
  },
  'api-backend': {
    label: 'APIs',
    icon: Server,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    description: 'Backend services',
  },
  'internal-tool': {
    label: 'Internal Tools',
    icon: Wrench,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    description: 'Operations & admin',
  },
};

// ============================================================================
// EXAMPLE ROLES
// ============================================================================

const exampleRoles = [
  { icon: Building2, label: 'Real Estate Agent', value: "I'm a real estate agent. I show properties, follow up with leads, schedule showings, and track commissions. I get lots of inquiries at night when I can't respond." },
  { icon: Briefcase, label: 'Freelancer', value: "I'm a freelance designer managing multiple client projects. I send proposals, track time, invoice clients, and chase payments. I spend too much time on admin." },
  { icon: Users, label: 'HR Manager', value: "I manage HR for a 50-person company. I handle recruiting, onboarding, time-off requests, and employee questions. Lots of repetitive questions and manual processes." },
  { icon: BarChart3, label: 'Marketing Manager', value: "I run marketing for a B2B SaaS. I manage campaigns across channels, track metrics, create reports, and coordinate with sales on leads. Reporting takes forever." },
  { icon: Target, label: 'Sales Rep', value: "I'm a B2B sales rep managing a pipeline of 50+ deals. I track activities, send follow-ups, update CRM, and forecast. I lose track of who to call next." },
  { icon: Calendar, label: 'Consultant', value: "I'm an independent consultant. I schedule calls, send proposals, track projects, and invoice monthly. I want to scale but I'm maxed out on time." },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RecommenderPage() {
  const router = useRouter();
  const { data: session } = useSession();
  
  // Input state
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Results state
  const [results, setResults] = useState<RecommendationResponse | null>(null);
  const [selectedRec, setSelectedRec] = useState<SoftwareRecommendation | null>(null);
  const [activeTypeFilter, setActiveTypeFilter] = useState<SolutionType | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Get recommendations
  const handleSubmit = async () => {
    if (!description.trim()) return;
    
    setIsLoading(true);
    setResults(null);
    
    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      });
      
      if (!response.ok) throw new Error('Failed to get recommendations');
      
      const data = await response.json();
      setResults(data);
      setSelectedRec(data.topPick);
      setActiveTypeFilter('all');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to get recommendations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter recommendations by type
  const filteredRecommendations = results?.recommendations.filter(
    rec => activeTypeFilter === 'all' || rec.solutionType === activeTypeFilter
  ) || [];
  
  // Get available types from results
  const availableTypes = results 
    ? [...new Set(results.recommendations.map(r => r.solutionType))]
    : [];
  
  // Copy prompt
  const copyPrompt = async (prompt: string, id: string) => {
    await navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  
  // Start building
  const startBuilding = (rec: SoftwareRecommendation) => {
    const url = session 
      ? `/dashboard?prompt=${encodeURIComponent(rec.prompt)}`
      : `/login?redirect=/dashboard&prompt=${encodeURIComponent(rec.prompt)}`;
    router.push(url);
  };
  
  // ============================================================================
  // INPUT SCREEN
  // ============================================================================
  
  if (!results) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white">
        {/* Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-16">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-sm mb-6">
              <Lightbulb className="w-4 h-4" />
              Software Discovery Tool
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              What should{' '}
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                you
              </span>{' '}
              build?
            </h1>
            
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Describe what you do, and we&apos;ll suggest apps, automations, AI assistants, 
              and more—with ROI analysis for each.
            </p>
          </div>
          
          {/* Solution Types Preview */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-8">
            {(Object.entries(solutionTypeConfig) as [SolutionType, typeof solutionTypeConfig[SolutionType]][]).map(([type, config]) => (
              <div 
                key={type}
                className="flex flex-col items-center p-3 bg-zinc-900/50 border border-white/5 rounded-xl"
              >
                <config.icon className={`w-5 h-5 ${config.color} mb-1`} />
                <span className="text-xs text-gray-400 text-center">{config.label}</span>
              </div>
            ))}
          </div>
          
          {/* Main Input */}
          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 mb-8">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              What do you do? Include your daily tasks and pain points.
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., I'm a real estate agent. I show properties, follow up with leads, schedule showings, and track my commissions. I get a lot of inquiries at night when I can't respond, and I often forget to follow up..."
              className="w-full h-32 bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
            />
            
            <button
              onClick={handleSubmit}
              disabled={!description.trim() || isLoading}
              className="w-full mt-4 px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing your work...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Get My Recommendations
                </>
              )}
            </button>
          </div>
          
          {/* Example Roles */}
          <div>
            <p className="text-sm text-gray-500 mb-4 text-center">Or try an example:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {exampleRoles.map((example) => (
                <button
                  key={example.label}
                  onClick={() => setDescription(example.value)}
                  className="flex items-center gap-3 p-4 bg-zinc-900/30 border border-white/5 rounded-xl hover:bg-zinc-800/50 hover:border-white/10 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                    <example.icon className="w-5 h-5 text-gray-400 group-hover:text-violet-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-300">{example.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // ============================================================================
  // RESULTS SCREEN
  // ============================================================================
  
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => setResults(null)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Start Over
        </button>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-1 bg-violet-500/20 text-violet-400 rounded-full text-sm font-medium">
                {results.role}
              </span>
              {results.industry && (
                <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm font-medium">
                  {results.industry}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold">
              {results.recommendations.length} Solutions Found
            </h1>
          </div>
          
          {/* Total Value */}
          <div className="bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border border-emerald-500/20 rounded-xl px-5 py-3">
            <p className="text-xs text-gray-400">Total Potential Monthly Value</p>
            <p className="text-2xl font-bold text-emerald-400">
              {formatCurrency(results.totalPotentialMonthlyValue.min)} - {formatCurrency(results.totalPotentialMonthlyValue.max)}
            </p>
          </div>
        </div>
        
        {/* Solution Type Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTypeFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTypeFilter === 'all'
                ? 'bg-white text-black'
                : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
            }`}
          >
            All ({results.recommendations.length})
          </button>
          {availableTypes.map(type => {
            const config = solutionTypeConfig[type];
            const count = results.byType[type]?.length || 0;
            return (
              <button
                key={type}
                onClick={() => setActiveTypeFilter(type)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTypeFilter === type
                    ? `${config.bgColor} ${config.color}`
                    : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                }`}
              >
                <config.icon className="w-4 h-4" />
                {config.label} ({count})
              </button>
            );
          })}
        </div>
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recommendations List */}
          <div className="lg:col-span-1 space-y-3">
            {filteredRecommendations.map((rec, index) => {
              const typeConfig = solutionTypeConfig[rec.solutionType];
              const isTopPick = rec.id === results.topPick.id;
              
              return (
                <button
                  key={rec.id}
                  onClick={() => setSelectedRec(rec)}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    selectedRec?.id === rec.id
                      ? 'bg-violet-600/20 border-violet-500/50'
                      : 'bg-zinc-900/50 border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${typeConfig.bgColor} ${typeConfig.color}`}>
                      <typeConfig.icon className="w-3 h-3" />
                      {typeConfig.label}
                    </span>
                    {isTopPick && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs font-medium">
                        Top Pick
                      </span>
                    )}
                    {rec.roi.quickWin && (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Quick
                      </span>
                    )}
                  </div>
                  
                  {/* Title & Tagline */}
                  <h3 className="font-semibold text-white">{rec.name}</h3>
                  <p className="text-sm text-gray-400 mb-3">{rec.tagline}</p>
                  
                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">
                        <Clock className="w-4 h-4 inline mr-1" />
                        {rec.buildTime}
                      </span>
                      <span className="flex items-center gap-1 text-amber-400">
                        <Star className="w-4 h-4 fill-current" />
                        {rec.roi.overallScore}
                      </span>
                    </div>
                    <span className="text-emerald-400 font-medium">
                      {formatCurrency(rec.roi.monetary.monthlyValueMin)}/mo
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Selected Detail */}
          <div className="lg:col-span-2">
            {selectedRec && (
              <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {(() => {
                        const config = solutionTypeConfig[selectedRec.solutionType];
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium ${config.bgColor} ${config.color}`}>
                            <config.icon className="w-4 h-4" />
                            {config.label}
                          </span>
                        );
                      })()}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedRec.complexity === 'simple' ? 'bg-emerald-500/20 text-emerald-400' :
                        selectedRec.complexity === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {selectedRec.complexity}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 rounded-lg">
                      <Star className="w-5 h-5 text-amber-400 fill-current" />
                      <span className="text-lg font-bold text-amber-400">{selectedRec.roi.overallScore}</span>
                    </div>
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-1">{selectedRec.name}</h2>
                  <p className="text-lg text-violet-400 mb-2">{selectedRec.tagline}</p>
                  <p className="text-gray-400">{selectedRec.description}</p>
                </div>
                
                {/* ROI Section */}
                <div className="p-6 border-b border-white/10">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    Return on Investment
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-zinc-800/50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Time Saved</p>
                      <p className="text-lg font-bold">{selectedRec.roi.monetary.timeSavedPerWeek}</p>
                      <p className="text-xs text-gray-500">per week</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Monthly Value</p>
                      <p className="text-lg font-bold text-emerald-400">
                        {formatCurrency(selectedRec.roi.monetary.monthlyValueMin)}-{formatCurrency(selectedRec.roi.monetary.monthlyValueMax)}
                      </p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Build Time</p>
                      <p className="text-lg font-bold">{selectedRec.buildTime}</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Yearly Value</p>
                      <p className="text-lg font-bold text-violet-400">
                        {formatCurrency(selectedRec.roi.monetary.monthlyValueMax * 12)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Revenue/Cost Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedRec.roi.monetary.revenueModel && (
                      <div className="flex items-start gap-3 p-3 bg-violet-500/10 rounded-lg">
                        <Gift className="w-5 h-5 text-violet-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-violet-400">Revenue Potential</p>
                          <p className="text-sm text-gray-400">{selectedRec.roi.monetary.revenueModel}</p>
                        </div>
                      </div>
                    )}
                    {selectedRec.roi.monetary.costSavings && (
                      <div className="flex items-start gap-3 p-3 bg-emerald-500/10 rounded-lg">
                        <DollarSign className="w-5 h-5 text-emerald-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-emerald-400">Cost Savings</p>
                          <p className="text-sm text-gray-400">{selectedRec.roi.monetary.costSavings}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Type-Specific Info */}
                {(selectedRec.triggers || selectedRec.aiCapabilities || selectedRec.integrations) && (
                  <div className="p-6 border-b border-white/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedRec.triggers && selectedRec.triggers.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Triggers
                          </h4>
                          <ul className="space-y-1">
                            {selectedRec.triggers.map((trigger, i) => (
                              <li key={i} className="text-sm text-gray-400 flex items-center gap-2">
                                <ChevronRight className="w-3 h-3 text-amber-400" />
                                {trigger}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedRec.aiCapabilities && selectedRec.aiCapabilities.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
                            <Bot className="w-4 h-4" />
                            AI Capabilities
                          </h4>
                          <ul className="space-y-1">
                            {selectedRec.aiCapabilities.map((cap, i) => (
                              <li key={i} className="text-sm text-gray-400 flex items-center gap-2">
                                <ChevronRight className="w-3 h-3 text-emerald-400" />
                                {cap}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedRec.integrations && selectedRec.integrations.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-cyan-400 mb-2 flex items-center gap-2">
                            <Server className="w-4 h-4" />
                            Integrations
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedRec.integrations.map((int, i) => (
                              <span key={i} className="px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded text-xs">
                                {int}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Benefits & Pain Points */}
                <div className="p-6 border-b border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Benefits
                      </h4>
                      <ul className="space-y-2">
                        {selectedRec.roi.nonMonetary.benefits.map((benefit, i) => (
                          <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                            <ChevronRight className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4 text-violet-400" />
                        Problems Solved
                      </h4>
                      <ul className="space-y-2">
                        {selectedRec.roi.nonMonetary.painPointsSolved.map((pain, i) => (
                          <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                            <ChevronRight className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                            {pain}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                
                {/* Tech & Similar */}
                <div className="p-6 border-b border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-sm text-gray-400 mb-2">Tech Highlights</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedRec.techHighlights.map((tech) => (
                          <span key={tech} className="px-2 py-1 bg-white/5 rounded text-xs">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm text-gray-400 mb-2">Similar To</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedRec.similarTools.map((tool) => (
                          <span key={tool} className="px-2 py-1 bg-white/5 rounded text-xs">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm text-gray-400 mb-2">Best For</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedRec.bestFor.map((use) => (
                          <span key={use} className="px-2 py-1 bg-violet-500/10 text-violet-400 rounded text-xs">
                            {use}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Prompt & Actions */}
                <div className="p-6">
                  <h4 className="font-medium mb-3">Generation Prompt</h4>
                  <div className="bg-zinc-800/50 rounded-xl p-4 mb-4">
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{selectedRec.prompt}</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => startBuilding(selectedRec)}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all flex items-center justify-center gap-2"
                    >
                      <Rocket className="w-5 h-5" />
                      Build This Now
                    </button>
                    <button
                      onClick={() => copyPrompt(selectedRec.prompt, selectedRec.id)}
                      className="px-6 py-3 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                    >
                      {copiedId === selectedRec.id ? (
                        <>
                          <Check className="w-5 h-5 text-emerald-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-5 h-5" />
                          Copy Prompt
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}