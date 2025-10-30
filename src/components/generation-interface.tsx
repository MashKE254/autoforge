"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Sparkles, Wand2, User } from "lucide-react";

// Define the structure of a generation step
type GenerationStep = {
  id: string;
  title: string;
  status: "pending" | "in-progress" | "complete" | "error";
  description: string;
};

// Mock data for the generation plan
const mockGenerationPlan: GenerationStep[] = [
  {
    id: "1",
    title: "Understanding Intent",
    status: "complete",
    description: "Analyzed user prompt and business context.",
  },
  {
    id: "2",
    title: "Planning Architecture",
    status: "in-progress",
    description: "Designing database schema and API endpoints.",
  },
  {
    id: "3",
    title: "Generating Backend Code",
    status: "pending",
    description: "Creating Next.js API routes with Prisma models.",
  },
  {
    id: "4",
    title: "Generating Frontend UI",
    status: "pending",
    description: "Building React components with shadcn/ui.",
  },
  {
    id: "5",
    title: "Validation & Security Scan",
    status: "pending",
    description: "Automated testing and Semgrep security analysis.",
  },
  {
    id: "6",
    title: "Deployment",
    status: "pending",
    description: "Preparing for instant hosting on Vercel.",
  },
];

export function GenerationInterface() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;

    setIsLoading(true);
    setGenerationSteps([]); // Clear previous results

    // --- This is where the real AI API call will go ---
    // For now, we simulate a network request
    await new Promise((resolve) => setTimeout(resolve, 3000));
    // --- End of mock API call ---

    // Update the state with the mock response
    setGenerationSteps(mockGenerationPlan);
    setIsLoading(false);
  };

  const getStatusBadge = (
    status: "pending" | "in-progress" | "complete" | "error"
  ) => {
    switch (status) {
      case "complete":
        return <Badge variant="default">Complete</Badge>;
      case "in-progress":
        return <Badge variant="secondary">In Progress...</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: "2fr 1fr" }}>
      {/* Left Column: Prompt and Generation Status */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-blue-500" />
            <span>Create New Application</span>
          </CardTitle>
          <CardDescription>
            Describe the application, SaaS, or internal tool you want to build.
            Be as descriptive as possible.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <Textarea
              placeholder="e.g., 'Build a SaaS platform for real-estate agents to manage property listings and client appointments. It needs user authentication, Stripe subscriptions, and a map view...'"
              className="min-h-[150px] text-base"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || !prompt}>
              {isLoading ? (
                <>
                  <Bot className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Application
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Right Column: Generation Pipeline */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Generation Pipeline</CardTitle>
          <CardDescription>
            AutoForge will follow this plan to build your application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && generationSteps.length === 0 && (
            // Skeleton Loading State
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-4/5" />
              <Skeleton className="h-10 w-3/5" />
            </div>
          )}

          {generationSteps.length > 0 && (
            // Real Data State
            <ol className="relative border-l border-gray-200 dark:border-gray-700">
              {generationSteps.map((step) => (
                <li key={step.id} className="mb-6 ml-6">
                  <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                    {/*  */}
                    <Bot className="h-3 w-3 text-blue-800 dark:text-blue-300" />
                  </span>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {step.title}
                    </h3>
                    {getStatusBadge(step.status)}
                  </div>
                  <p className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          )}

          {!isLoading && generationSteps.length === 0 && (
            // Idle State
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted">
              <p className="text-muted-foreground">
                Your generation plan will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
