'use client';

/**
 * AutoForge Dashboard
 * 
 * File: src/app/dashboard/page.tsx
 * 
 * Updated: Fixed generation to use /api/generate and redirect to /job/[jobId]
 * 
 * Flow:
 * 1. User enters prompt -> Click Generate
 * 2. API Check: Needs clarification?
 * 3. YES -> Show interactive questions UI -> Enhance Prompt -> Generate
 * 4. NO -> Generate immediately
 */

import { useState, useEffect, type ElementType } from 'react';
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
  ArrowLeft
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
}

interface QuickTemplate {
  id: string;
  title: string;
  prompt: string;
  icon: ElementType;
  color: string;
}

// Clarification Types
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
    prompt: 'A Discord moderation bot with auto-ban, logging, and custom commands',
    icon: Bot,
    color: 'from-indigo-500 to-purple-500',
  },
  {
    id: 'trading-bot',
    title: 'Trading Bot',
    prompt: 'A crypto trading bot with technical indicators, alerts, and backtesting',
    icon: Layers,
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'web-scraper',
    title: 'Web Scraper',
    prompt: 'A web scraper for price monitoring with scheduled jobs and notifications',
    icon: Code2,
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'saas-platform',
    title: 'SaaS Platform',
    prompt: 'A full SaaS CRM with teams, billing, authentication, and admin dashboard',
    icon: FileCode,
    color: 'from-violet-500 to-cyan-500',
  },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Dashboard() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Core State
  const [prompt, setPrompt] = useState(searchParams.get('prompt') || '');
  const [generatorType, setGeneratorType] = useState(searchParams.get('generator') || undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [recentGenerations, setRecentGenerations] = useState<RecentGeneration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatedFiles, setGeneratedFiles] = useState<string[]>([]);

  // Clarification State
  const [isClarifying, setIsClarifying] = useState(false);
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [multiSelectValues, setMultiSelectValues] = useState<Record<string, string[]>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch recent generations when session is available
  useEffect(() => {
    if (session?.user?.id) {
      fetchRecentGenerations();
    }
  }, [session?.user?.id]);

  const fetchRecentGenerations = async () => {
    try {
      const res = await fetch('/api/jobs?limit=5');
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

  // ==========================================================================
  // GENERATION & CLARIFICATION LOGIC
  // ==========================================================================

  const handleInitialSubmit = async () => {
    if (!prompt.trim() || isGenerating || isAnalyzing) return;

    setIsAnalyzing(true);
    setStatusMessage('Analyzing your request...');

    try {
      // 1. Check if clarification is needed
      const clarifyResponse = await fetch('/api/generate/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!clarifyResponse.ok) {
        // Fallback: If clarify fails, try to generate directly
        console.warn('Clarification check failed, falling back to direct generation');
        await startGeneration(prompt.trim());
        return;
      }

      const clarifyResult: ClarificationResult = await clarifyResponse.json();

      if (clarifyResult.needsClarification && clarifyResult.questions.length > 0) {
        // NEEDS CLARIFICATION: Switch to questions UI
        setQuestions(clarifyResult.questions);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setMultiSelectValues({});
        setIsClarifying(true);
      } else {
        // NO CLARIFICATION NEEDED: Generate immediately
        await startGeneration(prompt.trim());
      }

    } catch (error) {
      console.error('Analysis error:', error);
      // Fallback to direct generation on error
      await startGeneration(prompt.trim());
    } finally {
      setIsAnalyzing(false);
      setStatusMessage('');
    }
  };

  const handleClarificationComplete = async () => {
    setIsGenerating(true);
    setStatusMessage('Enhancing your prompt...');
    
    try {
      // 1. Enhance prompt with answers
      const enhanceResponse = await fetch('/api/generate/clarify', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalPrompt: prompt.trim(),
          answers: Object.fromEntries(
            questions.map(q => [q.question, answers[q.id] || ''])
          ),
        }),
      });
      
      if (!enhanceResponse.ok) {
        throw new Error('Failed to enhance prompt');
      }
      
      const { enhancedPrompt } = await enhanceResponse.json();
      
      // 2. Start generation with the enhanced prompt
      setIsClarifying(false);
      await startGeneration(enhancedPrompt);
      
    } catch (err) {
      console.error('Clarification complete error:', err);
      // Fallback: try generating with original prompt
      setIsClarifying(false);
      await startGeneration(prompt.trim());
    }
  };

  const handleSkipClarification = async () => {
    setIsClarifying(false);
    await startGeneration(prompt.trim());
  };

  /**
   * Main generation function - calls /api/generate and redirects to /job/[jobId]
   */
  const startGeneration = async (finalPrompt: string) => {
    setIsGenerating(true);
    setGeneratedFiles([]);
    setStatusMessage('Starting generation...');

    try {
      // Build request body
      const requestBody: any = { prompt: finalPrompt };

      // Include generator type if specified (from recommender)
      if (generatorType) {
        requestBody.generatorType = generatorType;
        setStatusMessage(`Starting generation with ${generatorType} generator...`);
      }

      // Call the main /api/generate endpoint
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      // Success! Redirect to progress page
      setStatusMessage(`Generation started! Redirecting to progress...`);

      // Update files list for UI
      if (data.files) {
        setGeneratedFiles(data.files.map((f: { path: string }) => f.path));
      }

      // Redirect to the Progress Page (not directly to workspace)
      setTimeout(() => {
        router.push(`/generate/progress/${data.jobId}`);
      }, 500);

    } catch (error) {
      console.error('Generation error:', error);
      setIsGenerating(false);
      setStatusMessage(error instanceof Error ? error.message : 'Error occurred');
    }
  };

  // ==========================================================================
  // CLARIFICATION HANDLERS
  // ==========================================================================

  const handleAnswer = (value: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
    
    // Auto-advance for select/yesno
    if (currentQuestion.type === 'select' || currentQuestion.type === 'yesno') {
      setTimeout(() => {
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        }
      }, 300);
    }
  };

  const handleMultiSelect = (option: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    setMultiSelectValues(prev => {
      const current = prev[currentQuestion.id] || [];
      const updated = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option];
      
      setAnswers(a => ({ ...a, [currentQuestion.id]: updated.join(', ') }));
      return { ...prev, [currentQuestion.id]: updated };
    });
  };

  const handleTextSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const value = formData.get('answer') as string;
    if (value.trim()) {
      handleAnswer(value.trim());
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    }
  };

  const goBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleTemplateClick = (template: QuickTemplate) => {
    setPrompt(template.prompt);
  };

  // ==========================================================================
  // AUTH & LOADING
  // ==========================================================================

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!session) {
    router.push('/login'); 
    return null;
  }

  // Helper values for UI
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Gradient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-4 py-12">
        
        {/* =================================================================== */}
        {/* GENERATING STATE */}
        {/* =================================================================== */}
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 animate-pulse" />
              <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Generating Your Application</h2>
            <p className="text-gray-400 mb-6">{statusMessage || 'This usually takes 30-90 seconds...'}</p>
            
            {/* Show generated files */}
            {generatedFiles.length > 0 && (
              <div className="w-full max-w-md bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-sm text-gray-400 mb-2">Files generated: {generatedFiles.length}</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {generatedFiles.slice(-5).map((file, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <FileCode className="w-3 h-3 text-violet-400" />
                      {file}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : isClarifying && currentQuestion ? (
          /* =================================================================== */
          /* CLARIFICATION MODE */
          /* =================================================================== */
          <div className="max-w-2xl mx-auto py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Quick Questions</h2>
                  <p className="text-sm text-gray-400">Help us understand your vision better</p>
                </div>
              </div>
              <button
                onClick={handleSkipClarification}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <SkipForward className="w-4 h-4" />
                Skip All
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span>{answeredCount} answered</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-8 mb-6">
              <div className="flex items-start gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-1">{currentQuestion.question}</h3>
                  {currentQuestion.why && (
                    <p className="text-sm text-gray-400">{currentQuestion.why}</p>
                  )}
                </div>
              </div>

              {/* Answer Options */}
              <div className="space-y-3">
                {currentQuestion.type === 'select' && currentQuestion.options && (
                  <div className="grid gap-2">
                    {currentQuestion.options.map((option) => (
                      <button
                        key={option}
                        onClick={() => handleAnswer(option)}
                        className={`w-full p-3 rounded-xl text-left transition-all ${
                          answers[currentQuestion.id] === option
                            ? 'bg-violet-500/20 border-violet-500 text-white'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                        } border`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{option}</span>
                          {answers[currentQuestion.id] === option && (
                            <CheckCircle2 className="w-5 h-5 text-violet-400" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {currentQuestion.type === 'multiselect' && currentQuestion.options && (
                  <div className="grid gap-2">
                    {currentQuestion.options.map((option) => {
                      const selected = multiSelectValues[currentQuestion.id]?.includes(option);
                      return (
                        <button
                          key={option}
                          onClick={() => handleMultiSelect(option)}
                          className={`w-full p-3 rounded-xl text-left transition-all ${
                            selected
                              ? 'bg-violet-500/20 border-violet-500 text-white'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                          } border`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{option}</span>
                            {selected && (
                              <CheckCircle2 className="w-5 h-5 text-violet-400" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === 'yesno' && (
                  <div className="grid grid-cols-2 gap-3">
                    {['Yes', 'No'].map((option) => (
                      <button
                        key={option}
                        onClick={() => handleAnswer(option)}
                        className={`p-4 rounded-xl text-center transition-all ${
                          answers[currentQuestion.id] === option
                            ? 'bg-violet-500/20 border-violet-500 text-white'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                        } border`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {currentQuestion.type === 'text' && (
                  <form onSubmit={handleTextSubmit}>
                    <input
                      type="text"
                      name="answer"
                      placeholder={currentQuestion.placeholder || 'Type your answer...'}
                      defaultValue={answers[currentQuestion.id] || ''}
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="mt-3 px-6 py-2.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-500 transition-colors flex items-center justify-center gap-2"
                    >
                      Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  </form>
                )}

                {/* Continue button for multiselect */}
                {currentQuestion.type === 'multiselect' && (
                  <button
                    onClick={() => {
                      if (currentQuestionIndex < questions.length - 1) {
                        setCurrentQuestionIndex(prev => prev + 1);
                      }
                    }}
                    disabled={!multiSelectValues[currentQuestion.id]?.length}
                    className="mt-3 px-6 py-2.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={goBack}
                disabled={currentQuestionIndex === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              
              {isLastQuestion && answeredCount >= questions.length - 1 && (
                <button
                  onClick={handleClarificationComplete}
                  className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate App
                </button>
              )}
            </div>
          </div>
        ) : (
          /* =================================================================== */
          /* STANDARD DASHBOARD MODE */
          /* =================================================================== */
          <>
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="text-3xl font-bold mb-2">What do you want to build?</h1>
              <p className="text-gray-400">Describe your app and watch it come to life</p>
            </div>

            {/* Main Prompt Input */}
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
                        handleInitialSubmit();
                      }
                    }}
                    placeholder="Describe your application... (e.g., 'A Kanban board like Trello with drag-and-drop')"
                    rows={4}
                    disabled={isGenerating || isAnalyzing}
                    className="w-full bg-transparent text-white placeholder:text-gray-500 p-4 text-lg focus:outline-none resize-none disabled:opacity-50 font-sans"
                  />
                  <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Enter</kbd>
                      <span>to generate</span>
                    </div>
                    <button
                      onClick={handleInitialSubmit}
                      disabled={!prompt.trim() || isGenerating || isAnalyzing}
                      className="flex items-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : isGenerating ? (
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
            </div>

            {/* Quick Templates */}
            <div className="mb-12">
              <h3 className="text-sm font-medium text-gray-400 mb-4">Quick Start Templates</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {quickTemplates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateClick(template)}
                      className="group p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all text-left"
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center mb-3`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-sm font-medium text-white">{template.title}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recent Generations */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-400">Recent Generations</h3>
                <Link 
                  href="/projects" 
                  className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  View all →
                </Link>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                </div>
              ) : recentGenerations.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                  <Code2 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No generations yet</p>
                  <p className="text-sm text-gray-500">Your generated apps will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentGenerations.map((gen) => (
                    <Link
                      key={gen.id}
                      href={`/job/${gen.id}`}
                      className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate pr-4">{gen.prompt}</p>
                        <div className="flex items-center gap-3 mt-1">
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
                      <div className="flex items-center gap-3">
                        <StatusBadge status={gen.status} />
                        <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}