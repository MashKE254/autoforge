'use client';

/**
 * CLARIFICATION QUESTIONS COMPONENT
 * 
 * File: src/components/ClarificationQuestions.tsx
 * 
 * Beautiful UI for asking clarification questions before generation.
 * Makes AutoForge feel like working with a real developer.
 */

import { useState } from 'react';
import { 
  MessageSquare, 
  ChevronRight, 
  Sparkles,
  CheckCircle2,
  HelpCircle,
  X,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface ClarificationQuestion {
  id: string;
  question: string;
  type: 'select' | 'multiselect' | 'text' | 'yesno';
  options?: string[];
  placeholder?: string;
  why?: string;
}

interface ClarificationQuestionsProps {
  questions: ClarificationQuestion[];
  onComplete: (answers: Record<string, string>) => void;
  onSkip: () => void;
  isLoading?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ClarificationQuestions({
  questions,
  onComplete,
  onSkip,
  isLoading = false,
}: ClarificationQuestionsProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [multiSelectValues, setMultiSelectValues] = useState<Record<string, string[]>>({});
  
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const answeredCount = Object.keys(answers).length;
  const progress = ((currentIndex) / questions.length) * 100;
  
  const handleAnswer = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
    
    if (!isLastQuestion) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 300);
    }
  };
  
  const handleMultiSelect = (option: string) => {
    setMultiSelectValues(prev => {
      const current = prev[currentQuestion.id] || [];
      const updated = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option];
      
      // Also update answers
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
    }
  };
  
  const handleComplete = () => {
    onComplete(answers);
  };
  
  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };
  
  if (questions.length === 0) {
    return null;
  }
  
  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Quick Questions</h2>
          <p className="text-sm text-gray-400">
            Help me build exactly what you need
          </p>
        </div>
        <button
          onClick={onSkip}
          className="ml-auto text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Skip & Generate
        </button>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Question {currentIndex + 1} of {questions.length}</span>
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
        {/* Question */}
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
        
        {/* Answer Options */}
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
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 hover:border-white/20'
                  }`}
                >
                  <span>{option}</span>
                  {isSelected && <CheckCircle2 className="w-5 h-5" />}
                </button>
              );
            })}
            {(multiSelectValues[currentQuestion.id] || []).length > 0 && (
              <button
                onClick={() => !isLastQuestion && setCurrentIndex(prev => prev + 1)}
                className="w-full mt-4 px-4 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-500 transition-colors flex items-center justify-center gap-2"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        
        {currentQuestion.type === 'yesno' && (
          <div className="flex gap-3">
            <button
              onClick={() => handleAnswer('Yes')}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                answers[currentQuestion.id] === 'Yes'
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => handleAnswer('No')}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                answers[currentQuestion.id] === 'No'
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              No
            </button>
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
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
      
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={currentIndex === 0}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← Back
        </button>
        
        {isLastQuestion && Object.keys(answers).length >= questions.length - 1 && (
          <button
            onClick={handleComplete}
            disabled={isLoading}
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate My App
              </>
            )}
          </button>
        )}
      </div>
      
      {/* Quick tip */}
      <p className="text-center text-xs text-gray-600 mt-6">
        💡 The more context you provide, the better your app will be
      </p>
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

export function ClarificationSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-white/10" />
        <div className="flex-1">
          <div className="h-5 w-32 bg-white/10 rounded mb-2" />
          <div className="h-4 w-48 bg-white/5 rounded" />
        </div>
      </div>
      
      <div className="bg-zinc-900 rounded-2xl border border-white/10 p-6">
        <div className="h-6 w-3/4 bg-white/10 rounded mb-6" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}