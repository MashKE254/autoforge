'use client';

/**
 * Generate Page - Initiates generation and redirects to progress
 *
 * File: src/app/generate/page.tsx
 *
 * This page:
 * - Receives prompt from URL params
 * - Calls /api/generate to start generation
 * - Redirects to /generate/progress/[jobId]
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';

export default function GeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prompt = searchParams.get('prompt');
  const [status, setStatus] = useState<'initiating' | 'error'>('initiating');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!prompt) {
      router.push('/dashboard');
      return;
    }

    // Start generation
    const startGeneration = async () => {
      try {
        setStatus('initiating');

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            mode: 'AUTO', // Let the system decide
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to start generation');
        }

        const data = await response.json();

        if (data.jobId) {
          // Redirect to progress page
          router.push(`/generate/progress/${data.jobId}`);
        } else {
          throw new Error('No job ID returned from API');
        }
      } catch (err) {
        console.error('Generation error:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      }
    };

    startGeneration();
  }, [prompt, router]);

  return (
    <div className="min-h-screen text-white flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        {status === 'initiating' && (
          <>
            <div className="relative inline-flex items-center justify-center w-24 h-24 mb-8">
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 rounded-full blur-2xl opacity-50 animate-pulse" />

              {/* Icon */}
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white animate-pulse" />
              </div>
            </div>

            <h1 className="text-2xl font-bold mb-3">
              Initiating Generation
            </h1>

            <p className="text-gray-400 mb-6 leading-relaxed">
              Setting up your project with AI...
            </p>

            {prompt && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-300 line-clamp-3">
                  {prompt}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>This will only take a moment...</span>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold mb-3 text-red-400">
              Generation Failed
            </h1>

            <p className="text-gray-400 mb-6">
              {error || 'An unexpected error occurred'}
            </p>

            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors"
            >
              Return to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
