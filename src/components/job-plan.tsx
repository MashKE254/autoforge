"use client";

import { useState, useEffect } from "react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { type GenerationJob } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader,
  CheckCircle,
  XCircle,
  ChevronRight,
  AlertCircle,
  WifiOff,
} from "lucide-react";

export type PlanStep = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  code?: string;
};

// Trigger.dev status categories
const IN_PROGRESS_STATUSES = [
  "PENDING_VERSION",
  "QUEUED",
  "DEQUEUED",
  "EXECUTING",
  "WAITING",
  "DELAYED",
];

const FAILURE_STATUSES = [
  "CANCELED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "EXPIRED",
  "TIMED_OUT",
];

interface JobPlanProps {
  initialJob: GenerationJob;
  accessToken: string;
  jobId: string;
}

export default function JobPlan({ initialJob, accessToken, jobId }: JobPlanProps) {
  const [plan, setPlan] = useState<PlanStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [pollingActive, setPollingActive] = useState(false);

  // Initialize active run ID from job
  useEffect(() => {
    // Check for build run ID first
    if (initialJob.result && initialJob.result.startsWith("buildRunId:")) {
      const runId = initialJob.result.replace("buildRunId:", "");
      setActiveRunId(runId);
      setIsBuilding(true);
    }
    // Otherwise use the planning run ID
    else if (jobId && jobId.startsWith("run_")) {
      setActiveRunId(jobId);
    }
  }, [initialJob.result, jobId]);

  // Enhanced real-time hook with error handling
  const { run, error: realtimeError } = useRealtimeRun(
    activeRunId && activeRunId.startsWith("run_") && realtimeEnabled ? activeRunId : undefined,
    { 
      accessToken,
      enabled: !!(activeRunId && activeRunId.startsWith("run_") && accessToken && realtimeEnabled),
    }
  );

  // Handle realtime errors
  useEffect(() => {
    if (realtimeError) {
      console.error("❌ Realtime connection error:", realtimeError);
      // Disable realtime and fall back to polling
      setRealtimeEnabled(false);
      setPollingActive(true);
      console.log("🔄 Falling back to polling mode");
    }
  }, [realtimeError]);

  // Parse initial plan from job
  useEffect(() => {
    if (initialJob.planJson) {
      try {
        const parsed = JSON.parse(initialJob.planJson);
        setPlan(parsed);
      } catch (e) {
        console.error("Failed to parse initial plan:", e);
        setError("Failed to parse generation plan.");
      }
    }
  }, [initialJob.planJson]);

  // Handle real-time updates from Trigger.dev
  useEffect(() => {
    if (!run) return;

    // Check for failures
    if (FAILURE_STATUSES.includes(run.status)) {
      const errorOutput = run.output as { error?: string } | undefined;
      setError(errorOutput?.error || "Job failed during execution");
      setIsBuilding(false);
      return;
    }

    // Check for completion
    if (run.status === "COMPLETED") {
      if (run.output && typeof run.output === "object" && "plan" in run.output) {
        try {
          const parsedPlan = JSON.parse(run.output.plan as string);
          setPlan(parsedPlan);
          setIsBuilding(false);
        } catch (e) {
          console.error("Failed to parse plan from run output:", e);
          setError("Failed to parse the generated plan.");
        }
      } else {
        setIsBuilding(false);
      }
    }
  }, [run]);

  // Enhanced polling fallback (always active when building OR when realtime is disabled)
  useEffect(() => {
    if (!isBuilding && !pollingActive) return;

    console.log("🔄 Starting polling...");
    let pollAttempts = 0;
    const maxAttempts = 100; // 100 * 2 seconds = 3.3 minutes max

    const pollInterval = setInterval(async () => {
      try {
        pollAttempts++;
        
        if (pollAttempts > maxAttempts) {
          console.warn("⚠️ Max polling attempts reached");
          clearInterval(pollInterval);
          setError("Polling timeout. The job may still be running. Please refresh the page.");
          return;
        }

        const response = await fetch(`/api/generate/status?jobId=${initialJob.id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.job?.planJson) {
          const parsedPlan = JSON.parse(data.job.planJson);
          setPlan(parsedPlan);
          
          // Check if build is complete
          const allCompleted = parsedPlan.every((step: PlanStep) => 
            step.status === "completed"
          );
          const anyFailed = parsedPlan.some((step: PlanStep) => 
            step.status === "failed"
          );
          
          if (allCompleted || anyFailed) {
            console.log("✅ Build complete");
            setIsBuilding(false);
            setPollingActive(false);
            clearInterval(pollInterval);
            
            if (anyFailed) {
              const failedCount = parsedPlan.filter((s: PlanStep) => s.status === "failed").length;
              setError(`${failedCount} step(s) failed during generation. Fallback code was generated. You can still edit the code in the AI Workspace.`);
            }
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
        // Don't set error state for individual polling failures, just log them
        // The interval will keep trying
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      console.log("🛑 Stopping polling");
      clearInterval(pollInterval);
    };
  }, [isBuilding, pollingActive, initialJob.id]);

  const handleStartBuild = async () => {
    setIsBuilding(true);
    setError(null);
    setPollingActive(true);

    try {
      const response = await fetch("/api/generate/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: initialJob.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start the build process.");
      }
      
      const data = await response.json();
      
      // Switch to build run for real-time updates
      if (data.triggerRunId) {
        setActiveRunId(data.triggerRunId);
        console.log("✅ Build started with run ID:", data.triggerRunId);
      }
      
      // Optimistically update plan status
      setPlan(prevPlan => 
        prevPlan.map(step => ({ ...step, status: 'running' as const }))
      );

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
      setIsBuilding(false);
      setPollingActive(false);
    }
  };

  const renderStatusBadge = (
    status: "pending" | "running" | "completed" | "failed"
  ) => {
    switch (status) {
      case "completed":
        return (
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case "running":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            <Loader className="mr-1 h-3 w-3 animate-spin" />
            Running
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      case "pending":
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const renderContent = () => {
    // Show loading state if plan generation is in progress
    if (run && IN_PROGRESS_STATUSES.includes(run.status) && !plan.length) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      );
    }

    // Show error if plan generation failed
    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Generation Issue</AlertTitle>
          <AlertDescription>
            {error}
            {error.includes("fallback") && (
              <p className="mt-2 text-xs">
                💡 Tip: You can edit and improve the generated code in the AI Workspace below.
              </p>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    // Show the plan
    if (plan.length > 0) {
      return (
        <div className="flow-root">
          <ul role="list" className="-mb-8">
            {plan.map((step, stepIdx) => (
              <li key={step.id}>
                <div className="relative pb-8">
                  {stepIdx !== plan.length - 1 ? (
                    <span
                      className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="relative flex items-start space-x-3">
                    <div>
                      <div className="relative px-1">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 ring-8 ring-white dark:bg-gray-800 dark:ring-gray-900">
                          {step.status === "completed" ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : step.status === "running" ? (
                            <Loader className="h-5 w-5 text-blue-500 animate-spin" />
                          ) : step.status === "failed" ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">
                              {String(stepIdx + 1).padStart(2, "0")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 py-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {step.title}
                        </span>
                        {renderStatusBadge(step.status)}
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    
    // Fallback for no data
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Plan Generated</AlertTitle>
        <AlertDescription>
          Waiting for the AI to generate a plan...
        </AlertDescription>
      </Alert>
    );
  };

  // Check if plan is complete and ready to build
  const isPlanComplete = plan.length > 0 && 
    plan.every(step => step.status === "completed" || step.status === "pending") &&
    !isBuilding;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
        <h2 className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
          Generation Pipeline
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isBuilding ? "Building your application..." : "Step-by-step plan for your application"}
        </p>
        
        {/* Connection status indicator */}
        {isBuilding && (
          <div className="mt-2 flex items-center gap-2">
            {realtimeEnabled && !realtimeError ? (
              <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <Loader className="h-3 w-3 animate-spin" />
                Live updates enabled
              </p>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <WifiOff className="h-3 w-3" />
                Using polling mode
              </p>
            )}
          </div>
        )}
        
        <div className="mt-6">{renderContent()}</div>
      </div>

      {isPlanComplete && (
        <Button
          size="lg"
          className="w-full"
          onClick={handleStartBuild}
          disabled={isBuilding}
        >
          {isBuilding ? (
            <Loader className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ChevronRight className="mr-2 h-4 w-4" />
          )}
          {isBuilding ? "Build in Progress..." : "Start Code Generation"}
        </Button>
      )}
    </div>
  );
}