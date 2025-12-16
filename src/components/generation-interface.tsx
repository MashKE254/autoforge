'use client';

/**
 * Generation Interface with Smart Clarification
 * 
 * File: src/components/generation-interface.tsx
 * 
 * Flow:
 * 1. User enters prompt
 * 2. Check if clarification needed (API call)
 * 3. If yes → Show clarification questions
 * 4. User answers questions
 * 5. Enhance prompt with answers
 * 6. Generate with enhanced prompt
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Loader2,
  ArrowRight,
  Zap,
  MessageSquare,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  X,
  SkipForward,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

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

type GenerationState = 
  | 'idle' 
  | 'analyzing' 
  | 'clarifying' 
  | 'generating' 
  | 'complete' 
  | 'error';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GenerationInterface() {
  const router = useRouter();
  
  // State
  const [prompt, setPrompt] = useState('');
  const [state, setState] = useState<GenerationState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Clarification state
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [multiSelectValues, setMultiSelectValues] = useState<Record<string, string[]>>({});
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleSubmit = async () => {
    if (!prompt.trim() || state === 'analyzing' || state === 'generating') return;
    
    setError(null);
    setState('analyzing');
    setStatusMessage('Analyzing your request...');
    
    try {
      // Step 1: Check if clarification is needed
      const clarifyResponse = await fetch('/api/generate/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      
      if (!clarifyResponse.ok) {
        throw new Error('Failed to analyze prompt');
      }
      
      const clarifyResult: ClarificationResult = await clarifyResponse.json();
      
      if (clarifyResult.needsClarification && clarifyResult.questions.length > 0) {
        // Show clarification questions
        setQuestions(clarifyResult.questions);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setMultiSelectValues({});
        setState('clarifying');
        setStatusMessage('');
      } else {
        // No clarification needed, generate directly
        await startGeneration(prompt.trim());
      }
      
    } catch (err) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setState('error');
    }
  };
  
  const handleClarificationComplete = async () => {
    setState('generating');
    setStatusMessage('Enhancing your prompt...');
    
    try {
      // Enhance prompt with answers
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
      
      // Generate with enhanced prompt
      await startGeneration(enhancedPrompt);
      
    } catch (err) {
      console.error('Clarification complete error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setState('error');
    }
  };
  
  const handleSkipClarification = async () => {
    // Skip questions and generate with original prompt
    await startGeneration(prompt.trim());
  };
  
  const startGeneration = async (finalPrompt: string) => {
    setState('generating');
    setStatusMessage('Creating your application...');
    
    try {
      // ✅ UPDATED: Points to Trigger.dev background worker
      const response = await fetch('/api/generate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: finalPrompt,
          originalPrompt: prompt // vital for tracking enhancements
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }
      
      setState('complete');
      setStatusMessage('Redirecting to your app...');
      
      // Redirect to workspace
      setTimeout(() => {
        router.push(`/generate/result/${data.jobId}`);
      }, 500);
      
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Generation failed');
      setState('error');
    }
  }; 
  
  // ============================================================================
  // CLARIFICATION HANDLERS
  // ============================================================================
  
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
  
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? ((currentQuestionIndex) / questions.length) * 100 : 0;
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  // Clarification UI
  if (state === 'clarifying' && currentQuestion) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
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
          <div className="bg-zinc-900 rounded-2xl border border-white/10 p-6 mb-6">
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
            
            {/* Select Options */}
            {currentQuestion.type === 'select' && currentQuestion.options && (
              <div className="space-y-2">
                {currentQuestion.options.map((option) => (
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
              </div>
            )}
            
            {/* Multi-select */}
            {currentQuestion.type === 'multiselect' && currentQuestion.options && (
              <div className="space-y-2">
                {currentQuestion.options.map((option) => {
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
                {(multiSelectValues[currentQuestion.id] || []).length > 0 && (
                  <button
                    onClick={() => !isLastQuestion && setCurrentQuestionIndex(prev => prev + 1)}
                    className="w-full mt-4 px-4 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-500 transition-colors flex items-center justify-center gap-2"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            
            {/* Yes/No */}
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
            
            {/* Text Input */}
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
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
          
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={goBack}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Back
            </button>
            
            {isLastQuestion && answeredCount >= questions.length - 1 && (
              <button
                onClick={handleClarificationComplete}
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generate My App
              </button>
            )}
          </div>
          
          {/* Original prompt preview */}
          <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
            <p className="text-xs text-gray-500 mb-1">Your request:</p>
            <p className="text-sm text-gray-300 line-clamp-2">{prompt}</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Main input UI
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            What do you want to build?
          </h1>
          <p className="text-gray-400">
            Describe your application and I&#39;ll create it for you
          </p>
        </div>
        
        {/* Input */}
        <div className="bg-zinc-900 rounded-2xl border border-white/10 p-4 mb-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Build a CRM for managing real estate leads with property tracking, showing schedules, and commission calculations..."
            className="w-full h-32 bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none text-lg"
            disabled={state === 'analyzing' || state === 'generating'}
          />
          
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div className="text-xs text-gray-500">
              {prompt.length > 0 && `${prompt.split(/\s+/).filter(Boolean).length} words`}
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || state === 'analyzing' || state === 'generating'}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2"
            >
              {state === 'analyzing' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : state === 'generating' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Create App
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Status Message */}
        {statusMessage && (
          <div className="text-center text-sm text-gray-400 mb-4">
            {statusMessage}
          </div>
        )}
        
        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setState('idle');
              }}
              className="text-red-400 text-xs underline mt-2"
            >
              Try again
            </button>
          </div>
        )}
        
        {/* Example prompts */}
        <div className="mt-8">
          <p className="text-xs text-gray-500 mb-3 text-center">Try these examples:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              'Build a CRM for tracking sales leads',
              'Build an inventory management dashboard',
              'Build a project management app with Kanban board',
              'Build a booking system for appointments',
            ].map((example) => (
              <button
                key={example}
                onClick={() => setPrompt(example)}
                disabled={state !== 'idle'}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-left disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}