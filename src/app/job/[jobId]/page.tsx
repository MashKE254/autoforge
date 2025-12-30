// src/app/job/[jobId]/page.tsx
/**
 * Job Details Page - Updated for Bolt-Style Generation
 * 
 * This page now includes a poller that waits for generation to complete
 * and automatically refreshes when files are ready.
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, FileCode } from "lucide-react";
import JobPlan from "@/components/job-plan";
import AIWorkspace from "@/components/ai-workspace";
import JobStatusPoller from "@/components/job-status-poller";
import { MonetizeButton } from "@/components/monetize-button";
import type { PlanStep } from "@/components/job-plan";

// Define the file type
interface GeneratedFileData {
  path: string;
  content: string;
  language: string;
}

// Define the file type from Prisma query
interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export default async function JobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/");
  }

  const { jobId } = await params;

  // Get the job with FILES from database
  const initialJob = await prisma.generationJob.findUnique({
    where: {
      id: jobId,
      userId: session.user.id,
    },
    include: {
      files: true,  // ✅ Include the generated files!
    },
  });

  if (!initialJob) {
    notFound();
  }

  // Get public access token for Trigger.dev realtime (if using Trigger.dev)
  let publicAccessToken = "";
  try {
    publicAccessToken = process.env.TRIGGER_PUBLIC_ACCESS_TOKEN || "";
  } catch (error) {
    console.warn("Could not get Trigger.dev access token:", error);
  }

  // Extract the Trigger.dev run ID from the result field
  let triggerRunId: string | null = null;
  if (initialJob.result && initialJob.result.startsWith("triggerRunId:")) {
    triggerRunId = initialJob.result.replace("triggerRunId:", "");
  }

  // Parse the plan to pass to components with proper typing
  let parsedPlan: PlanStep[] = [];
  if (initialJob.planJson) {
    try {
      const rawPlan = JSON.parse(initialJob.planJson) as Array<{
        id?: string;
        title?: string;
        description?: string;
        status?: string;
        code?: string;
        dependencies?: string[];
      }>;
      
      parsedPlan = rawPlan.map((step, index) => ({
        id: step.id || `step-${index}`,
        title: step.title || `Step ${index + 1}`,
        description: step.description || '',
        status: (step.status as PlanStep['status']) || 'pending',
        code: step.code,
        dependencies: step.dependencies || []
      }));
      
      console.log("📋 Parsed plan:", parsedPlan.length, "steps");
    } catch (e) {
      console.error("Failed to parse plan JSON:", e);
    }
  }

  // ✅ Extract the actual files from the database
  const initialFiles: GeneratedFileData[] = (initialJob.files as GeneratedFile[]).map((f) => ({
    path: f.path,
    content: f.content,
    language: f.language,
  }));

  console.log(`📁 Job has ${initialFiles.length} files in database`);
  if (initialFiles.length > 0) {
    console.log('Files:', initialFiles.map(f => f.path).join(', '));
  }

  // Check if all steps are completed
  const allStepsCompleted = parsedPlan.length > 0 && 
    parsedPlan.every((step) => step.status === "completed");

  console.log("✅ All steps completed:", allStepsCompleted);

  // Helper function to format the date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <div className="min-h-screen">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <a
              href="/dashboard"
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              &larr; Back to Dashboard
            </a>
          </div>

          {/* ✅ NEW: Status Poller - Shows progress and auto-refreshes when done */}
          <JobStatusPoller
            jobId={jobId}
            initialStatus={initialJob.status}
            initialFileCount={initialFiles.length}
          />

          {/* Job Details Card */}
          <div className="rounded-lg border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 shadow-sm mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold leading-7 text-white">
                  Generation Job
                </h1>
                <p className="mt-2 text-sm text-gray-400">
                  Created {formatDate(initialJob.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${initialJob.status === 'COMPLETED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : initialJob.status === 'FAILED'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : initialJob.status === 'RUNNING'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>
                  {initialJob.status}
                </span>
                {initialFiles.length > 0 && (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-violet-500/20 text-violet-400 border border-violet-500/30">
                    {initialFiles.length} files
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-sm font-medium text-gray-500">Prompt</h2>
              <p className="mt-1 text-white">
                {initialJob.prompt}
              </p>
            </div>
          </div>

        {/* ✨ Monetize Button - For completed personal tools */}
        {initialJob.generationMode === 'PERSONAL' && initialJob.status === 'COMPLETED' && (
          <MonetizeButton jobId={initialJob.id} className="mb-6" />
        )}

          {/* Show different content based on status */}
          {initialJob.status === 'RUNNING' || initialJob.status === 'PENDING' ? (
            // Still generating - show progress
            <div className="rounded-lg border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 shadow-sm text-center">
              <div className="animate-pulse">
                <Sparkles className="h-16 w-16 mx-auto text-cyan-400 mb-4" />
                <h2 className="text-xl font-semibold mb-2 text-white">Generating your application...</h2>
                <p className="text-gray-400">
                  This usually takes 30-90 seconds. The page will automatically update when ready.
                </p>
              </div>
            </div>
          ) : initialJob.status === 'FAILED' ? (
            // Failed - show error
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 backdrop-blur-xl p-8 shadow-sm text-center">
              <h2 className="text-xl font-semibold mb-2 text-red-400">
                Generation Failed
              </h2>
              <p className="text-red-400 mb-4">
                {initialJob.errorLog || 'An unknown error occurred during generation.'}
              </p>
              <a
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Try Again
              </a>
            </div>
          ) : initialFiles.length === 0 ? (
            // Completed but no files yet (shouldn't happen often)
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 backdrop-blur-xl p-8 shadow-sm text-center">
              <h2 className="text-xl font-semibold mb-2 text-yellow-400">
                Waiting for files...
              </h2>
              <p className="text-yellow-400">
                Generation completed but files are still being saved. Refreshing in a moment...
              </p>
            </div>
          ) : (
          // Completed with files - show workspace
          <>
            {/* Generation Pipeline */}
            {parsedPlan.length > 0 && (
              <div className="mb-6">
                <JobPlan
                  initialJob={initialJob}
                  accessToken={publicAccessToken}
                  jobId={triggerRunId || jobId}
                />
              </div>
            )}

            {/* AI Workspace */}
            <div className="rounded-lg border border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-sm overflow-hidden">
              <Tabs defaultValue="workspace" className="w-full">
                <TabsList className="w-full justify-start border-b border-white/10 rounded-none bg-white/[0.02]">
                  <TabsTrigger value="workspace" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI Workspace
                  </TabsTrigger>
                  <TabsTrigger value="files" className="gap-2">
                    <FileCode className="h-4 w-4" />
                    Files ({initialFiles.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="workspace" className="m-0 p-0">
                  <AIWorkspace
                    plan={parsedPlan}
                    projectName={initialJob.prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '-').toLowerCase()}
                    jobId={initialJob.id}
                    initialFiles={initialFiles}
                    generationMode={(initialJob.generationMode as 'PERSONAL' | 'SAAS' | 'SAAS_UPGRADE' | null) ?? 'SAAS'}
                  />
                </TabsContent>

                <TabsContent value="files" className="m-0 p-6">
                  {initialFiles.length > 0 ? (
                    <div className="space-y-4">
                      {initialFiles.map((file, index) => (
                        <div key={index} className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-mono text-sm font-medium text-white">{file.path}</h3>
                            <span className="text-xs text-gray-500">{file.language}</span>
                          </div>
                          <pre className="bg-white/[0.05] p-3 rounded text-xs overflow-x-auto max-h-48">
                            <code className="text-gray-300">{file.content.slice(0, 500)}{file.content.length > 500 ? '...' : ''}</code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No files generated yet.</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}