'use client';

/**
 * Dashboard Page - Updated for Bolt-Style Generation
 * 
 * File: src/app/dashboard/page.tsx
 * 
 * This now uses /api/generate/start (bolt-style) instead of
 * /api/generation/blueprint (old modular approach)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Sparkles, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Zap,
  Download
} from 'lucide-react';

interface GenerationJob {
  id: string;
  prompt: string;
  status: string;
  createdAt: string;
  estimatedModules?: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentJobs, setRecentJobs] = useState<GenerationJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchRecentJobs();
    }
  }, [status]);

  const fetchRecentJobs = async () => {
    try {
      const response = await fetch('/api/generation/recent');
      if (response.ok) {
        const data = await response.json();
        setRecentJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Failed to fetch recent jobs:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  /**
   * Handle generation using Bolt-style API
   * No more blueprint step - goes straight to generation
   */
  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.trim().length < 10) {
      setError('Please provide a detailed description (at least 10 characters)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the new bolt-style endpoint
      const response = await fetch('/api/generate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect directly to job page (no blueprint approval needed)
        router.push(`/job/${data.jobId}`);
      } else {
        setError(data.error || 'Failed to start generation');
        setLoading(false);
      }
    } catch (err) {
      console.error('Generation error:', err);
      setError('Network error occurred. Please try again.');
      setLoading(false);
    }
  };

  const getStatusBadge = (jobStatus: string) => {
    switch (jobStatus) {
      case 'COMPLETED':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'RUNNING':
        return <Badge className="bg-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Running</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-500"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="outline">{jobStatus}</Badge>;
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {session?.user?.name || 'Builder'}!</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Describe your application and let AI build it for you.
        </p>
      </div>

      {/* Main Generation Card */}
      <Card className="mb-8 border-2 border-blue-100 dark:border-blue-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Create New Application
          </CardTitle>
          <CardDescription>
            Describe what you want to build in plain English. Be specific about features!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g., A calculator app with add, subtract, multiply, and divide operations. Should have a nice modern UI with a display showing the current number and buttons for each operation."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[150px] text-lg"
            disabled={loading}
          />
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-4">
            <Button 
              onClick={handleGenerate} 
              disabled={loading || !prompt.trim()}
              className="flex-1 h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-5 w-5" />
                  Generate Application
                </>
              )}
            </Button>
          </div>

          {/* Example prompts */}
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500 mb-2">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'A calculator with basic operations',
                'A todo list with add, delete, and complete',
                'A simple timer with start, pause, reset',
                'A note-taking app with markdown support',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setPrompt(example)}
                  className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  disabled={loading}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Generations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingJobs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : recentJobs.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No generations yet. Create your first app above!
            </p>
          ) : (
            <div className="space-y-4">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => router.push(`/job/${job.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{job.prompt}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(job.createdAt).toLocaleDateString()} at{' '}
                      {new Date(job.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    {getStatusBadge(job.status)}
                    {job.status === 'COMPLETED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/generate/result/${job.id}`);
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}