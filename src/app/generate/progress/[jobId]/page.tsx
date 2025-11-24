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
      <div className="container mx-auto p-8">
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load generation progress</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isGenerating = ['RUNNING', 'COMPOSING', 'TESTING', 'DEPLOYING'].includes(data.status);
  const isCompleted = data.status === 'COMPLETED';
  const isFailed = data.status === 'FAILED';

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Zap className="w-10 h-10 text-primary" />
          {isGenerating && 'Generating Application...'}
          {isCompleted && '🎉 Generation Complete!'}
          {isFailed && 'Generation Failed'}
        </h1>
        <p className="text-muted-foreground text-lg">
          {isGenerating && 'Please wait while we create your application'}
          {isCompleted && 'Your application is ready! Open the AI Workspace to preview and edit.'}
          {isFailed && 'Something went wrong during generation'}
        </p>
      </div>

      {/* Overall Progress */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Overall Progress</span>
            <Badge variant={isCompleted ? 'default' : 'secondary'} className="text-lg px-4 py-1">
              {data.progress}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={data.progress} className="h-4 mb-4" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Modules</p>
              <p className="text-2xl font-bold">{data.totalModules}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-600">{data.completedModules}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Failed</p>
              <p className="text-2xl font-bold text-red-600">{data.failedModules}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Time Remaining</p>
              <p className="text-2xl font-bold">
                {isCompleted ? 'Done!' : data.estimatedTimeRemaining || 'Calculating...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons - Show prominently when complete */}
      {isCompleted && (
        <Card className="mb-8 border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={handleOpenWorkspace}
                className="gap-2 text-lg px-8 py-6"
              >
                <Play className="w-5 h-5" />
                Open AI Workspace
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={handleDownload}
                disabled={downloading}
                className="gap-2"
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
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </Button>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-4">
              The AI Workspace includes a live preview, code editor, and AI chat to modify your app.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Module List */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {module.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : module.status === 'running' ? (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    ) : module.status === 'failed' ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="font-medium">{module.name}</span>
                  </div>
                  <Badge variant="outline">{module.category}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Errors Section */}
      {data.errors && data.errors.length > 0 && (
        <Card className="mb-8 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Errors ({data.errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {data.errors.map((error, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertDescription>
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
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}