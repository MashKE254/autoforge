'use client';

/**
 * Job Status Poller - Waits for generation to complete then reloads
 * 
 * File: src/components/job-status-poller.tsx
 * 
 * This component polls the job status and triggers a page reload
 * when the job completes and files are available.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface JobStatusPollerProps {
  jobId: string;
  initialStatus: string;
  initialFileCount: number;
}

export default function JobStatusPoller({ 
  jobId, 
  initialStatus, 
  initialFileCount 
}: JobStatusPollerProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [fileCount, setFileCount] = useState(initialFileCount);
  const [polling, setPolling] = useState(
    initialStatus === 'PENDING' || initialStatus === 'RUNNING'
  );
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const pollStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/generate/status?jobId=${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }
      
      const data = await response.json();
      
      if (data.job) {
        setStatus(data.job.status);
        setFileCount(data.job.fileCount || 0);
        
        // If completed with files, refresh the page to load them
        if (data.job.status === 'COMPLETED' && data.job.fileCount > 0) {
          console.log('✅ Job completed with files, refreshing...');
          setPolling(false);
          // Use router.refresh() to reload server components
          router.refresh();
        }
        
        // If failed, stop polling
        if (data.job.status === 'FAILED') {
          setPolling(false);
          setError(data.job.errorLog || 'Generation failed');
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
      // Don't stop polling on individual errors
    }
  }, [jobId, router]);

  useEffect(() => {
    if (!polling) return;

    // Poll immediately
    pollStatus();

    // Then poll every 3 seconds
    const interval = setInterval(() => {
      setPollCount(c => c + 1);
      pollStatus();
    }, 3000);

    // Stop after 5 minutes
    const timeout = setTimeout(() => {
      setPolling(false);
      setError('Generation timed out. Please check the Trigger.dev dashboard.');
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [polling, pollStatus]);

  // If we already have files, don't show anything
  if (initialFileCount > 0 && status === 'COMPLETED') {
    return null;
  }

  // Show status banner while generating
  if (polling || status === 'RUNNING' || status === 'PENDING') {
    return (
      <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <AlertDescription className="ml-2 text-blue-800 dark:text-blue-200">
          <div className="flex items-center justify-between">
            <span>
              <strong>Generating your application...</strong> This usually takes 30-90 seconds.
              {pollCount > 0 && ` (${pollCount * 3}s elapsed)`}
            </span>
            <span className="text-sm opacity-70">
              Status: {status}
            </span>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show completion message if just completed
  if (status === 'COMPLETED' && fileCount > 0 && initialFileCount === 0) {
    return (
      <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="ml-2 text-green-800 dark:text-green-200">
          <div className="flex items-center justify-between">
            <span>
              <strong>Generation complete!</strong> {fileCount} files generated.
            </span>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => router.refresh()}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Load Files
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show error if failed
  if (error || status === 'FAILED') {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="ml-2">
          <strong>Generation failed:</strong> {error || 'Unknown error'}
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="ml-4"
          >
            Back to Dashboard
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}