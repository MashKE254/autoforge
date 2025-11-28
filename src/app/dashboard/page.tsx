'use client';

/**
 * AutoForge Dashboard - v0.dev/bolt.new Style
 * 
 * File: src/app/dashboard/page.tsx
 * 
 * Clean, minimal dashboard focused on the prompt input
 * with recent generations and quick examples
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Loader2,
  Clock,
  Code2,
  Layers,
  Bot,
  Workflow,
  Zap,
  FileCode,
  ChevronRight,
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface RecentGeneration {
  id: string;
  prompt: string;
  status: 'COMPLETED' | 'RUNNING' | 'FAILED' | 'PENDING';
  createdAt: string;
  fileCount?: number;
}

import type { ElementType } from 'react';

interface QuickTemplate {
  id: string;
  title: string;
  prompt: string;
  icon: ElementType;
  color: string;
}

const quickTemplates: QuickTemplate[] = [
  {
    id: 'dashboard',
    title: 'Analytics Dashboard',
    prompt: 'An analytics dashboard with charts, KPI cards, and data tables',
    icon: Layers,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'landing',
    title: 'Landing Page',
    prompt: 'A modern SaaS landing page with hero, features, pricing, and testimonials',
    icon: FileCode,
    color: 'from-violet-500 to-purple-500',
  },
  {
    id: 'todo',
    title: 'Todo App',
    prompt: 'A todo app with categories, priorities, due dates, and dark mode',
    icon: CheckCircle,
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'chat',
    title: 'Chat Interface',
    prompt: 'A real-time chat interface with message bubbles and typing indicators',
    icon: Bot,
    color: 'from-orange-500 to-amber-500',
  },
];

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: ElementType; label: string }> = {
    COMPLETED: { color: 'text-green-400 bg-green-400/10', icon: CheckCircle, label: 'Completed' },
    RUNNING: { color: 'text-blue-400 bg-blue-400/10', icon: Loader2, label: 'Running' },
    FAILED: { color: 'text-red-400 bg-red-400/10', icon: XCircle, label: 'Failed' },
    PENDING: { color: 'text-yellow-400 bg-yellow-400/10', icon: Clock, label: 'Pending' },
  };
  
  const { color, icon: Icon, label } = config[status] || config.PENDING;
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${color}`}>
      <Icon className={`w-3 h-3 ${status === 'RUNNING' ? 'animate-spin' : ''}`} />
      {label}
    </div>
  );
}

export default function Dashboard() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [prompt, setPrompt] = useState(searchParams.get('prompt') || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentGenerations, setRecentGenerations] = useState<RecentGeneration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [streamOutput, setStreamOutput] = useState('');
  const [generatedFiles, setGeneratedFiles] = useState<string[]>([]);

  // Fetch recent generations
  useEffect(() => {
    if (session?.user?.id) {
      fetchRecentGenerations();
    }
  }, [session?.user?.id]);

  const fetchRecentGenerations = async () => {
    try {
      const res = await fetch('/api/jobs/recent');
      if (res.ok) {
        const data = await res.json();
        setRecentGenerations(data.jobs || []);
      }
    } catch (error) {
      console.error('Failed to fetch recent generations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setStreamOutput('');
    setGeneratedFiles([]);

    try {
      const response = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let jobId = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'job') {
                jobId = data.jobId;
              } else if (data.type === 'file') {
                setGeneratedFiles(prev => [...prev, data.path]);
              } else if (data.type === 'complete') {
                // Redirect to workspace
                setTimeout(() => {
                  router.push(`/generate/result/${jobId}`);
                }, 500);
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
      setIsGenerating(false);
    }
  };

  const handleTemplateClick = (template: QuickTemplate) => {
    setPrompt(template.prompt);
  };

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Prompt Input */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-2">What do you want to build?</h1>
          <p className="text-gray-400">Describe your app and watch it come to life</p>
        </div>

        {/* Main Input */}
        <div className="mb-12">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/50 via-indigo-600/50 to-cyan-600/50 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition-opacity" />
            <div className="relative bg-[#1A1A1C] border border-white/10 rounded-xl overflow-hidden">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                placeholder="Describe your application..."
                rows={4}
                disabled={isGenerating}
                className="w-full bg-transparent text-white placeholder:text-gray-500 p-4 text-lg focus:outline-none resize-none disabled:opacity-50"
              />
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Enter</kbd>
                  <span>to generate</span>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Generation Progress */}
          {isGenerating && generatedFiles.length > 0 && (
            <div className="mt-4 p-4 bg-[#1A1A1C] border border-white/10 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                <span>Generating files...</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {generatedFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-2 py-1 bg-violet-500/10 text-violet-300 rounded text-xs"
                  >
                    <FileCode className="w-3 h-3" />
                    {file}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Templates */}
        <div className="mb-12">
          <h2 className="text-sm font-medium text-gray-400 mb-4">Quick Start Templates</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                disabled={isGenerating}
                className="group relative bg-[#1A1A1C] border border-white/10 rounded-xl p-4 text-left hover:border-white/20 hover:bg-white/5 transition-all disabled:opacity-50"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center mb-3`}>
                  <template.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-medium text-sm mb-1">{template.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2">{template.prompt}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Generations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-400">Recent Generations</h2>
            {recentGenerations.length > 0 && (
              <Link href="/projects" className="text-xs text-gray-500 hover:text-white transition-colors">
                View all →
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : recentGenerations.length === 0 ? (
            <div className="text-center py-12 bg-[#1A1A1C] border border-white/10 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                <Code2 className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-gray-400 mb-1">No generations yet</p>
              <p className="text-xs text-gray-500">Start by describing what you want to build</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentGenerations.slice(0, 5).map((gen) => (
                <Link
                  key={gen.id}
                  href={`/generate/result/${gen.id}`}
                  className="flex items-center gap-4 p-4 bg-[#1A1A1C] border border-white/10 rounded-xl hover:border-white/20 hover:bg-white/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center">
                    <Code2 className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{gen.prompt}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <StatusBadge status={gen.status} />
                      <span className="text-xs text-gray-500">
                        {new Date(gen.createdAt).toLocaleDateString()}
                      </span>
                      {gen.fileCount && (
                        <span className="text-xs text-gray-500">
                          {gen.fileCount} files
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
