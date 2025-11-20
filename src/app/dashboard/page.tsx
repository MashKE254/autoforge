'use client';

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

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.trim().length < 10) {
      setError('Please provide a detailed description (at least 10 characters)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generation/blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to blueprint approval page
        router.push(`/generate/blueprint/${data.jobId}`);
      } else {
        setError(data.error || 'Failed to generate blueprint');
        setLoading(false);
      }
    } catch (err) {
      console.error('Generation error:', err);
      setError('Network error occurred. Please try again.');
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500';
      case 'FAILED':
        return 'bg-red-500';
      case 'RUNNING':
      case 'COMPOSING':
      case 'TESTING':
        return 'bg-blue-500';
      case 'BLUEPRINT_GENERATED':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4" />;
      case 'FAILED':
        return <AlertCircle className="w-4 h-4" />;
      case 'RUNNING':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (status === 'loading') {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/');
    return null;
  }

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Zap className="w-10 h-10 text-primary" />
          Build.now Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">
          Transform your ideas into production-ready applications in minutes
        </p>
      </div>

      {/* New Generation Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Start New Generation
          </CardTitle>
          <CardDescription>
            Describe your application in plain English and we&#39;ll create a Living Blueprint
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="Example: Build a SaaS platform for project management with teams, tasks, time tracking, and subscription billing. Include user authentication, real-time updates, and a mobile-responsive dashboard."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              className="resize-none"
              disabled={loading}
            />

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {prompt.length}/2000 characters
              </p>
              <Button
                onClick={handleGenerate}
                disabled={loading || prompt.trim().length < 10}
                size="lg"
                className="min-w-[200px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating Blueprint...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Blueprint
                  </>
                )}
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                ⚡ Blueprint generation takes ~2 minutes • You&#39;ll review the architecture before generation starts
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Generations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Generations</CardTitle>
          <CardDescription>
            Your generation history and current jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingJobs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No generations yet. Start your first one above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (job.status === 'BLUEPRINT_GENERATED') {
                      router.push(`/generate/blueprint/${job.id}`);
                    } else if (job.status === 'COMPLETED') {
                      router.push(`/generate/result/${job.id}`);
                    } else {
                      router.push(`/generate/progress/${job.id}`);
                    }
                  }}
                >
                  <div className="flex-1">
                    <p className="font-medium line-clamp-1">{job.prompt}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(job.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {job.estimatedModules && (
                      <Badge variant="secondary">
                        {job.estimatedModules} modules
                      </Badge>
                    )}
                    <Badge className={getStatusColor(job.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(job.status)}
                        {job.status.replace('_', ' ')}
                      </span>
                    </Badge>
                    {job.status === 'COMPLETED' && (
                      <Button
                        onClick={async () => {
                          const response = await fetch(`/api/generation/${job.id}/download`);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `app-${job.id.slice(0, 8)}.zip`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        }}
                        size="sm"
                        variant="outline"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
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