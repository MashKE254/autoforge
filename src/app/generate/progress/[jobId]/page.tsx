'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Package,
  Download,
  Home,
  Play
} from 'lucide-react';

interface ProgressData {
  status: string;
  progress: number;
  totalModules: number;
  completedModules: number;
  failedModules: number;
  estimatedTimeRemaining: string;
  modules: Array<{
    name: string;
    category: string;
    status: string;
  }>;
  errors: Array<{
    message: string;
    timestamp: string;
  }>;
}

export default function ProgressPage({
  params
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/generation/${jobId}/progress`);
        const result = await response.json();

        if (response.ok) {
          setData(result);

          // Check for completion states and stop polling
          if (result.status === 'COMPLETED') {
            clearInterval(interval);
            console.log('✅ Generation complete! Ready to view workspace.');
          } else if (result.status === 'FAILED') {
            clearInterval(interval);
            console.log('❌ Generation failed.');
          }
        }
      } catch (error) {
        console.error('Failed to fetch progress:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchProgress();

    // Poll every 2 seconds
    const interval = setInterval(fetchProgress, 2000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [jobId]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/generation/${jobId}/download`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `application-${jobId.slice(0, 8)}.zip`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenWorkspace = () => {
    router.push(`/generate/result/${jobId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B]">
        <div className="container mx-auto p-8">
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <Loader2 className="w-16 h-16 animate-spin text-violet-400 mb-4" />
            <h2 className="text-2xl font-semibold mb-2 text-white">Loading...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0A0A0B]">
        <div className="container mx-auto p-8">
          <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load generation progress</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const isGenerating = ['RUNNING', 'COMPOSING', 'TESTING', 'DEPLOYING'].includes(data.status);
  const isCompleted = data.status === 'COMPLETED';
  const isFailed = data.status === 'FAILED';

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto p-8 max-w-6xl relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Zap className="w-10 h-10 text-violet-400" />
            {isGenerating && 'Generating Application...'}
            {isCompleted && '🎉 Generation Complete!'}
            {isFailed && 'Generation Failed'}
          </h1>
          <p className="text-gray-400 text-lg">
            {isGenerating && 'Please wait while we create your application'}
            {isCompleted && 'Your application is ready! Open the AI Workspace to preview and edit.'}
            {isFailed && 'Something went wrong during generation'}
          </p>
        </div>

        {/* Overall Progress */}
        <Card className="mb-8 border-white/10 bg-white/[0.02] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              <span>Overall Progress</span>
              <Badge variant={isCompleted ? 'default' : 'secondary'} className={`text-lg px-4 py-1 ${isCompleted ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' : 'bg-white/10 text-gray-400'}`}>
                {data.progress}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={data.progress} className="h-4 mb-4" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Modules</p>
                <p className="text-2xl font-bold text-white">{data.totalModules}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Completed</p>
                <p className="text-2xl font-bold text-emerald-400">{data.completedModules}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Failed</p>
                <p className="text-2xl font-bold text-red-400">{data.failedModules}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Time Remaining</p>
                <p className="text-2xl font-bold text-white">
                  {isCompleted ? 'Done!' : data.estimatedTimeRemaining || 'Calculating...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons - Show prominently when complete */}
        {isCompleted && (
          <Card className="mb-8 border-emerald-500/50 bg-emerald-500/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={handleOpenWorkspace}
                  className="gap-2 text-lg px-8 py-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
                >
                  <Play className="w-5 h-5" />
                  Open AI Workspace
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="gap-2 border-white/10 hover:bg-white/[0.05] text-white"
                >
                  {downloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download ZIP
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="gap-2 border-white/10 hover:bg-white/[0.05] text-white"
                >
                  <Home className="w-4 h-4" />
                  Dashboard
                </Button>
              </div>
              <p className="text-center text-sm text-gray-400 mt-4">
                The AI Workspace includes a live preview, code editor, and AI chat to modify your app.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Module List */}
        <Card className="mb-8 border-white/10 bg-white/[0.02] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Package className="w-5 h-5" />
              Generated Modules ({data.completedModules}/{data.totalModules})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {data.modules.map((module, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white/[0.05] rounded-lg border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      {module.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : module.status === 'running' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                      ) : module.status === 'failed' ? (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-500" />
                      )}
                      <span className="font-medium text-white">{module.name}</span>
                    </div>
                    <Badge variant="outline" className="border-white/10 text-gray-400">{module.category}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Errors Section */}
        {data.errors && data.errors.length > 0 && (
          <Card className="mb-8 border-red-500/50 bg-white/[0.02] backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                Errors ({data.errors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {data.errors.map((error, index) => (
                    <Alert key={index} variant="destructive" className="border-red-500/50 bg-red-500/10">
                      <AlertDescription className="text-red-400">
                        {error.message || 'Unknown error'}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Bottom Actions for non-complete states */}
        {!isCompleted && (
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="gap-2 border-white/10 hover:bg-white/[0.05] text-white"
            >
              <Home className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}