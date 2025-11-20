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
  Home
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

          // Don't auto-redirect when completed - let user download first
          if (result.status === 'FAILED') {
            clearInterval(interval);
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

    return () => clearInterval(interval);
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
          {isCompleted && 'Generation Complete!'}
          {isFailed && 'Generation Failed'}
        </h1>
        <p className="text-muted-foreground text-lg">
          {isGenerating && 'Please wait while we create your application'}
          {isCompleted && 'Your application is ready to download!'}
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
                {isCompleted ? 'Done!' : data.estimatedTimeRemaining}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module Status */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Module Generation Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {data.modules.map((module, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {module.status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {module.status === 'generating' && (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    )}
                    {module.status === 'pending' && (
                      <Clock className="w-5 h-5 text-gray-400" />
                    )}
                    {module.status === 'failed' && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">{module.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {module.category.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      module.status === 'completed' ? 'default' :
                      module.status === 'failed' ? 'destructive' :
                      'secondary'
                    }
                  >
                    {module.status}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Errors */}
      {data.errors.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-2">
                {data.errors.map((error, i) => (
                  <Alert key={i} variant="destructive">
                    <AlertDescription>
                      <p className="font-medium">{error.message}</p>
                      <p className="text-xs mt-1">
                        {new Date(error.timestamp).toLocaleString()}
                      </p>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {isCompleted && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-green-900 mb-1">
                  🎉 Your Application is Ready!
                </h3>
                <p className="text-green-700">
                  Download your complete application and start developing
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => router.push('/dashboard')}
                  variant="outline"
                  size="lg"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Dashboard
                </Button>
                <Button
                  onClick={handleDownload}
                  disabled={downloading}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Download Application
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generating status */}
      {isGenerating && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Generation in progress... This page will update automatically.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}