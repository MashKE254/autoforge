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
import { 
  Loader2, 
  ListChecks, 
  ArrowRight, 
  WandSparkles, 
  AlertCircle, 
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp
} from "lucide-react";

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
  const [streamingText, setStreamingText] = useState('');
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
  const [showEnhancement, setShowEnhancement] = useState(false);
  
  const pollControllerRef = useRef<AbortController | null>(null);

  const pollJobStatus = async (jobId: string) => {
    if (pollControllerRef.current) {
      pollControllerRef.current.abort();
    }
    pollControllerRef.current = new AbortController();
    const signal = pollControllerRef.current.signal;

    let pollAttempts = 0;
    const maxPollAttempts = 200;

    try {
      while (true) {
        if (signal.aborted) {
          throw new Error("Polling was aborted");
        }

        pollAttempts++;
        if (pollAttempts > maxPollAttempts) {
          throw new Error("Job took too long to complete (10+ minutes). Please check the Trigger.dev logs or try a simpler prompt.");
        }
        
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

        if (statusData.error) {
          throw new Error(statusData.error);
        }
        if (!statusData.job) {
          throw new Error("Job details not found in API response.");
        }

        const { status, planJson, result } = statusData.job;
        
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
            return jobId;
          } catch (parseError) {
            throw new Error("Failed to parse the generated plan. Please try again.");
          }
        } else if (status === "FAILED") {
          throw new Error(result || "Job failed without a specific error message");
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Polling failed:", err);
        setError(err.message || "Polling failed");
        setIsLoading(false);
        throw err;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;

    setIsLoading(true);
    setLoadingStatus("🧠 GPT-4 is understanding your idea...");
    setError(null);
    setPlan(null);
    setStreamingText('');
    setEnhancedPrompt(null);

    try {
      // === STEP 1: ENHANCE PROMPT WITH GPT-4 ===
      const enhanceResponse = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      let finalPrompt = prompt; // Default to original

      if (enhanceResponse.ok) {
        const enhanceData = await enhanceResponse.json();
        
        if (enhanceData.enhancedPrompt) {
          finalPrompt = enhanceData.enhancedPrompt;
          setEnhancedPrompt(finalPrompt); // Store for display
          setLoadingStatus("✨ Understanding complete! Starting generation...");
          
          console.log("=== PROMPT ENHANCED ===");
          console.log("Original:", prompt.substring(0, 100));
          console.log("Enhanced length:", finalPrompt.length);
        } else if (enhanceData.shouldUseOriginal) {
          setLoadingStatus("⚠️ Using original prompt (enhancement unavailable)...");
        }
      } else {
        console.warn("Enhancement failed, using original prompt");
        setLoadingStatus("⚠️ Enhancement unavailable, using original prompt...");
      }

      // === STEP 2: GENERATE WITH CLAUDE (using enhanced prompt) ===
      setLoadingStatus("🚀 Claude Sonnet 4 is building your app...");
      
      const response = await fetch("/api/generate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: finalPrompt,      // Enhanced version
          originalPrompt: prompt     // Keep original for reference
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error || !data.jobId) {
        throw new Error(data.error || "Failed to start job");
      }
      
      const completedJobId = await pollJobStatus(data.jobId);

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
  
  const renderLoadingState = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{loadingStatus}</span>
        {streamingText && (
          <span className="text-xs text-muted-foreground">
            • {streamingText.length} chars
          </span>
        )}
      </div>
      
      {streamingText && (
        <div className="text-xs font-mono text-muted-foreground bg-muted/50 p-3 rounded-md max-h-32 overflow-y-auto">
          {streamingText.slice(-200)}...
        </div>
      )}
      
      <div className="space-y-3">
        {[0,1,2,3].map((i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              i < (plan?.length || 0) ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
            }`}>
              {i < (plan?.length || 0) && <Check className="h-3 w-3 text-white" />}
            </div>
            <div className="flex-1">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground text-center mt-4">
        🚀 Generating complete application... {plan?.length || 0} files created
      </p>
    </div>
  );

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
          onClick={() => {}}
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
              placeholder="e.g., 'A simple blog with user auth and posts' or 'todo list app' or 'weather dashboard'"
              className="min-h-[200px] text-base"
              disabled={isLoading}
            />
            
            {/* Show enhanced prompt preview if available */}
            {enhancedPrompt && (
              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">GPT-4 Enhanced Your Idea</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEnhancement(!showEnhancement)}
                      type="button"
                    >
                      {showEnhancement ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {showEnhancement && (
                  <CardContent>
                    <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto p-3 bg-white dark:bg-gray-900 rounded border">
                      {enhancedPrompt}
                    </pre>
                  </CardContent>
                )}
              </Card>
            )}
            
            <Button type="submit" disabled={isLoading || !prompt}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <WandSparkles className="mr-2 h-4 w-4" />
              )}
              Generate Application
            </Button>
            
            <p className="text-xs text-muted-foreground">
              💡 Tip: Just describe what you want! GPT-4 will enhance your prompt for better results.
            </p>
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
                      setEnhancedPrompt(null);
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