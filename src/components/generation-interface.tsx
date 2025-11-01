"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ListChecks, ArrowRight, WandSparkles, AlertCircle } from "lucide-react";

type PlanStep = {
  id: string;
  title: string;
  description: string;
  status: string;
};

export default function GenerationInterface() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanStep[] | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  
  // A ref to a controller to abort the fetch if the component unmounts
  const pollControllerRef = useRef<AbortController | null>(null);

  const pollJobStatus = async (jobId: string) => {
    // Stop any previous polling
    if (pollControllerRef.current) {
      pollControllerRef.current.abort();
    }
    pollControllerRef.current = new AbortController();
    const signal = pollControllerRef.current.signal;

    let pollAttempts = 0;
    const maxPollAttempts = 200; // 10 minutes max (200 * 3 seconds)

    try {
      while (true) {
        if (signal.aborted) {
          throw new Error("Polling was aborted");
        }

        pollAttempts++;
        if (pollAttempts > maxPollAttempts) {
          throw new Error("Job took too long to complete (10+ minutes). Please check the Trigger.dev logs or try a simpler prompt.");
        }
        
        // Log progress every 10 attempts (30 seconds)
        if (pollAttempts % 10 === 0) {
          console.log(`Still waiting for job... (${Math.floor(pollAttempts * 3 / 60)} minutes elapsed)`);
        }

        const statusRes = await fetch(`/api/generate/status?jobId=${jobId}`, {
          signal,
        });

        if (!statusRes.ok) {
          throw new Error(`HTTP error! status: ${statusRes.status}`);
        }

        const statusData = await statusRes.json();

        // Robust checking
        if (statusData.error) {
          throw new Error(statusData.error);
        }
        if (!statusData.job) {
          throw new Error("Job details not found in API response.");
        }

        const { status, planJson, result } = statusData.job;
        
        // Update loading status based on job status
        if (status === "RUNNING") {
          setLoadingStatus("AI is generating your plan...");
        } else if (status === "QUEUED") {
          setLoadingStatus("Job queued, waiting to start...");
        } else {
          setLoadingStatus(`Job status: ${status}`);
        }

        if (status === "COMPLETED") {
          setIsLoading(false);
          try {
            const parsedPlan = JSON.parse(planJson || "[]");
            if (!Array.isArray(parsedPlan) || parsedPlan.length === 0) {
              throw new Error("Received empty plan from server");
            }
            setPlan(parsedPlan);
            // Return the completed job ID
            return jobId;
          } catch (parseError) {
            throw new Error("Failed to parse the generated plan. Please try again.");
          }
        } else if (status === "FAILED") {
          throw new Error(result || "Job failed without a specific error message");
        }

        // Wait for 3 seconds before polling again
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Polling failed:", err);
        setError(err.message || "Polling failed");
        setIsLoading(false);
        throw err; // Re-throw to be caught in handleSubmit
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;

    setIsLoading(true);
    setLoadingStatus("Starting generation job...");
    setError(null);
    setPlan(null); // Clear previous plan

    try {
      const response = await fetch("/api/generate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error || !data.jobId) {
        throw new Error(data.error || "Failed to start job");
      }
      
      // Start polling for the job status
      const completedJobId = await pollJobStatus(data.jobId);

      // If polling completes successfully, navigate to the job page
      if (completedJobId) {
        router.push(`/job/${completedJobId}`);
      }
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
      setIsLoading(false);
    }
  };
  
  // This is the loading state
  const renderLoadingState = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{loadingStatus}</span>
      </div>
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
      <p className="text-xs text-muted-foreground text-center">
        This may take 1-3 minutes depending on the complexity...
      </p>
    </div>
  );

  // This renders the *completed* plan.
  const renderPlan = () => {
    if (!plan || plan.length === 0) return null;

    return (
      <div className="space-y-4">
        {plan.map((step, i) => (
          <div key={i} className="flex items-start gap-4">
            <ListChecks className="h-5 w-5 flex-shrink-0 text-blue-500" />
            <div>
              <h4 className="font-semibold">{step.title}</h4>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          </div>
        ))}
        <Button
          className="w-full"
          onClick={() => {
            // This navigation will happen automatically in handleSubmit
            // This button is just a visual confirmation
          }}
          disabled={true}
        >
          Navigating to Job Details... <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  };
  
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Create New Application</CardTitle>
          <CardDescription>
            Describe the application, workflow, or agent you want to build.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'A simple blog with user auth and posts'"
              className="min-h-[200px] text-base"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !prompt}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <WandSparkles className="mr-2 h-4 w-4" />
              )}
              Generate Application
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Generation Pipeline</CardTitle>
          <CardDescription>
            The AI will generate a step-by-step plan here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Generation Failed</AlertTitle>
              <AlertDescription>
                {error}
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setError(null);
                      setPrompt("");
                    }}
                  >
                    Try Again
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          {isLoading && !error && renderLoadingState()}
          {!isLoading && !error && plan && renderPlan()}
          {!isLoading && !error && !plan && (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              <p>Enter a prompt to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}