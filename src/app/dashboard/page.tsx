'use client';

/**
 * AutoForge Dashboard
 * * File: src/app/dashboard/page.tsx
 * * Updated: Integrated Smart Clarification System
 * * Flow:
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
        await startGenerationStream(prompt.trim());
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
        await startGenerationStream(prompt.trim());
      }

    } catch (error) {
      console.error('Analysis error:', error);
      // Fallback to direct generation on error
      await startGenerationStream(prompt.trim());
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
      await startGenerationStream(enhancedPrompt);
      
    } catch (err) {
      console.error('Clarification complete error:', err);
      // Fallback: try generating with original prompt
      setIsClarifying(false);
      await startGenerationStream(prompt.trim());
    }
  };

  const handleSkipClarification = async () => {
    setIsClarifying(false);
    await startGenerationStream(prompt.trim());
  };

  const startGenerationStream = async (finalPrompt: string) => {
    setIsGenerating(true);
    setGeneratedFiles([]);
    setStatusMessage('Starting generation...');

    try {
      const response = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt }),
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
                setStatusMessage('Complete! Redirecting...');
                setTimeout(() => {
                  router.push(`/generate/result/${jobId}`);
                }, 500);
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (e) {
              console.warn('Error parsing stream chunk', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
      setIsGenerating(false);
      setStatusMessage('Error occurred');
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
  const progress = questions.length > 0 ? ((currentQuestionIndex) / questions.length) * 100 : 0;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* CLARIFICATION MODE */}
        {isClarifying && currentQuestion ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Header */}
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-violet-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-white">Quick Questions</h2>
                  <p className="text-sm text-gray-400">Help me build exactly what you need</p>
                </div>
                <button
                  onClick={handleSkipClarification}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip
                </button>
              </div>

              {/* Progress */}
              <div className="mb-8">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                  <span>{answeredCount} answered</span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Question Card */}
              <div className="bg-[#1A1A1C] rounded-2xl border border-white/10 p-6 mb-6">
                <div className="mb-6">
                  <h3 className="text-xl font-medium text-white mb-2">
                    {currentQuestion.question}
                  </h3>
                  {currentQuestion.why && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <HelpCircle className="w-3 h-3" />
                      {currentQuestion.why}
                    </p>
                  )}
                </div>

                {/* Input Types */}
                <div className="space-y-2">
                  {currentQuestion.type === 'select' && currentQuestion.options?.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleAnswer(option)}
                      className={`w-full px-4 py-3 rounded-xl text-left transition-all duration-200 flex items-center justify-between group ${
                        answers[currentQuestion.id] === option
                          ? 'bg-violet-600 text-white'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span>{option}</span>
                      {answers[currentQuestion.id] === option ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-50 transition-opacity" />
                      )}
                    </button>
                  ))}

                  {currentQuestion.type === 'multiselect' && currentQuestion.options?.map((option) => {
                    const isSelected = (multiSelectValues[currentQuestion.id] || []).includes(option);
                    return (
                      <button
                        key={option}
                        onClick={() => handleMultiSelect(option)}
                        className={`w-full px-4 py-3 rounded-xl text-left transition-all duration-200 flex items-center justify-between ${
                          isSelected
                            ? 'bg-violet-600/20 text-violet-300 border border-violet-500/50'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                        }`}
                      >
                        <span>{option}</span>
                        {isSelected && <CheckCircle2 className="w-5 h-5" />}
                      </button>
                    );
                  })}

                   {currentQuestion.type === 'yesno' && (
                    <div className="flex gap-3">
                      {['Yes', 'No'].map((option) => (
                        <button
                          key={option}
                          onClick={() => handleAnswer(option)}
                          className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                            answers[currentQuestion.id] === option
                              ? 'bg-violet-600 text-white'
                              : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}

                  {currentQuestion.type === 'text' && (
                    <form onSubmit={handleTextSubmit}>
                      <input
                        name="answer"
                        type="text"
                        placeholder={currentQuestion.placeholder || 'Type your answer...'}
                        defaultValue={answers[currentQuestion.id] || ''}
                        autoFocus
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                      />
                      <button
                        type="submit"
                        className="w-full mt-3 px-4 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-500 transition-colors flex items-center justify-center gap-2"
                      >
                        Continue <ChevronRight className="w-4 h-4" />
                      </button>
                    </form>
                  )}

                  {/* Continue button for multiselect */}
                  {currentQuestion.type === 'multiselect' && (multiSelectValues[currentQuestion.id] || []).length > 0 && (
                    <button
                      onClick={() => !isLastQuestion && setCurrentQuestionIndex(prev => prev + 1)}
                      className="w-full mt-4 px-4 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-500 transition-colors flex items-center justify-center gap-2"
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
          /* STANDARD DASHBOARD MODE */
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
                    placeholder="Describe your application..."
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

              {/* Status Message */}
              {(statusMessage || (isGenerating && generatedFiles.length > 0)) && (
                <div className="mt-4 p-4 bg-[#1A1A1C] border border-white/10 rounded-xl animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                    <span>{statusMessage || 'Generating files...'}</span>
                  </div>
                  {generatedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {generatedFiles.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 px-2 py-1 bg-violet-500/10 text-violet-300 rounded text-xs animate-in zoom-in duration-300"
                        >
                          <FileCode className="w-3 h-3" />
                          <span className="truncate max-w-[200px]">{file}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Start Templates */}
            <div className="mb-12">
              <h2 className="text-sm font-medium text-gray-400 mb-4">Quick Start Templates</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {quickTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateClick(template)}
                    disabled={isGenerating || isAnalyzing}
                    className="group relative bg-[#1A1A1C] border border-white/10 rounded-xl p-4 text-left hover:border-white/20 hover:bg-white/5 transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center mb-3`}>
                      <template.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-medium text-sm mb-1 text-white group-hover:text-violet-200 transition-colors">
                      {template.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2">{template.prompt}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Generations List */}
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
                <div className="flex items-center justify-center py-12 border border-white/5 rounded-xl bg-[#1A1A1C]/50">
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
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center shrink-0">
                        <Code2 className="w-5 h-5 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate pr-4">{gen.prompt}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <StatusBadge status={gen.status} />
                          <span className="text-xs text-gray-500">
                            {new Date(gen.createdAt).toLocaleDateString()}
                          </span>
                          {gen.fileCount !== undefined && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                               <span className="w-1 h-1 rounded-full bg-gray-600"/>
                               {gen.fileCount} files
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}