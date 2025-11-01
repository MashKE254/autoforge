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
} from "lucide-react";

// Export this type so generation-interface.tsx can use it
export type PlanStep = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  code?: string;
};

// These are the "in progress" statuses from Trigger.dev
const inProgressStatuses = [
  "PENDING_VERSION",
  "QUEUED",
  "DEQUEUED",
  "EXECUTING",
  "WAITING",
  "DELAYED",
];

// These are the "failure" statuses from Trigger.dev
const failureStatuses = [
  "CANCELED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "EXPIRED",
  "TIMED_OUT",
];

interface JobPlanProps {
  initialJob: GenerationJob;
  accessToken: string;
  jobId: string; // This should be the Trigger.dev run ID
}

export default function JobPlan({ initialJob, accessToken, jobId }: JobPlanProps) {
  const [plan, setPlan] = useState<PlanStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildRunId, setBuildRunId] = useState<string | null>(null);
  const [usePolling, setUsePolling] = useState(false);

  // Check if we should start with build run ID
  useEffect(() => {
    if (initialJob.result && initialJob.result.startsWith("buildRunId:")) {
      const runId = initialJob.result.replace("buildRunId:", "");
      setBuildRunId(runId);
    }
  }, [initialJob.result]);

  // This is the real-time hook for the PLAN generation
  const { run: planRun } = useRealtimeRun(
    jobId && jobId.startsWith("run_") && !buildRunId ? jobId : undefined,
    { accessToken, enabled: !!(jobId && jobId.startsWith("run_") && !buildRunId) }
  );

  // This is the real-time hook for the BUILD/CODE generation
  const { run: buildRun } = useRealtimeRun(
    buildRunId && buildRunId.startsWith("run_") ? buildRunId : undefined,
    { accessToken, enabled: !!(buildRunId && buildRunId.startsWith("run_")) }
  );

  // Use the appropriate run based on what's active
  const activeRun = buildRun || planRun;

  // This effect runs when the real-time `run` data changes OR we need to poll
  useEffect(() => {
    // If we're building and not using realtime, poll the database
    if (usePolling && isBuilding) {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/generate/status?jobId=${initialJob.id}`);
          const data = await response.json();
          
          if (data.job && data.job.planJson) {
            setPlan(JSON.parse(data.job.planJson));
            
            // Check if all steps are completed
            const parsedPlan = JSON.parse(data.job.planJson);
            const allCompleted = parsedPlan.every((step: PlanStep) => step.status === "completed");
            if (allCompleted) {
              setIsBuilding(false);
              setUsePolling(false);
              clearInterval(pollInterval);
            }
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(pollInterval);
    }
  }, [usePolling, isBuilding, initialJob.id]);

  // This effect handles real-time updates
  useEffect(() => {
    // Attempt to parse the plan from the latest run data first
    let currentPlanJson: string | null = null;

    if (activeRun?.status === "COMPLETED") {
      if (activeRun.output && typeof activeRun.output === "object" && "plan" in activeRun.output) {
        currentPlanJson = activeRun.output.plan as string;
      }
    } else if (activeRun?.status === "EXECUTING") {
      // For the code generation job, check the database payload
      if (activeRun.payload && typeof activeRun.payload === "object") {
        if ("planJson" in activeRun.payload) {
          currentPlanJson = activeRun.payload.planJson as string;
        } else if ("jobId" in activeRun.payload) {
          // If we only have jobId in payload, we need to poll the database
          setUsePolling(true);
        }
      }
    }
    
    // Fallback to the initial job data if real-time data is not ready
    if (!currentPlanJson && initialJob.planJson) {
      currentPlanJson = initialJob.planJson;
    }

    // Try to parse whatever plan we found
    if (currentPlanJson) {
      try {
        setPlan(JSON.parse(currentPlanJson));
      } catch (e) {
        console.error("Failed to parse plan:", e);
        setError("Failed to parse generation plan.");
      }
    }
  }, [activeRun, initialJob.planJson]); // Rerun when the hook data or initial data changes

  // This new function calls our "build" API
  const handleStartBuild = async () => {
    setIsBuilding(true);
    setError(null);

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
      
      // Store the build run ID for realtime updates
      if (data.triggerRunId) {
        setBuildRunId(data.triggerRunId);
      } else {
        // If no run ID, fall back to polling
        setUsePolling(true);
      }
      
      // Update local plan status immediately
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
    // 1. Show main loading skeletons if the *plan* is not ready yet
    // We check the run status from the hook (if available)
    if (activeRun && inProgressStatuses.includes(activeRun.status) && !plan.length) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      );
    }

    // 2. Show an error if the *plan generation* failed
    if (activeRun && failureStatuses.includes(activeRun.status)) {
      const errorOutput = activeRun.output as { error?: string } | undefined;
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Generation Failed</AlertTitle>
          <AlertDescription>
            {errorOutput?.error || "An unknown error occurred during generation."}
          </AlertDescription>
        </Alert>
      );
    }

    // 3. Show the plan if it's ready (either from initialJob or from the hook)
    if (plan.length > 0) {
      return (
        <div className="flow-root">
          <ul role="list" className="-mb-8">
            {plan.map((step, stepIdx) => (
              <li key={step.id}> {/* Use stable step.id for the key */}
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
    
    // 4. Fallback for when we have no run data and no plan
    if (!activeRun && !plan.length) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      );
    }
    
    // 5. Fallback for when the job is COMPLETED but plan is empty
    return (
       <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Plan Generated</AlertTitle>
          <AlertDescription>
            The generation job completed, but the AI did not return a valid plan.
          </AlertDescription>
        </Alert>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
        <h2 className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
          Generation Pipeline
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          This is the step-by-step plan for your application.
        </p>
        {isBuilding && usePolling && (
          <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
            ⟳ Live updates via polling (checking every 2 seconds)
          </p>
        )}
        {isBuilding && buildRunId && !usePolling && (
          <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
            ⚡ Live updates via real-time connection
          </p>
        )}
        <div className="mt-6">{renderContent()}</div>
      </div>

      {error && (
         <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {((activeRun?.status === "COMPLETED" && plan.length > 0) || (initialJob.status === "COMPLETED" && plan.length > 0 && !isBuilding)) && (
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