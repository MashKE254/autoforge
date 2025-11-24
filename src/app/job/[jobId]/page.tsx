// src/app/job/[jobId]/page.tsx
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, FileCode } from "lucide-react";
import JobPlan from "@/components/job-plan";
import AIWorkspace from "@/components/ai-workspace";
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
    // You may need to implement this based on your Trigger.dev setup
    publicAccessToken = process.env.TRIGGER_PUBLIC_ACCESS_TOKEN || "";
  } catch (error) {
    console.warn("Could not get Trigger.dev access token:", error);
  }

  // Check if job is in a terminal state
  if (initialJob.status === "PENDING") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Job Pending</h1>
          <p className="text-gray-600">
            This job hasn&apos;t started yet. Please wait for blueprint approval.
          </p>
        </div>
      </div>
    );
  }

  // Extract the Trigger.dev run ID from the result field
  let triggerRunId: string | null = null;
  if (initialJob.result && initialJob.result.startsWith("triggerRunId:")) {
    triggerRunId = initialJob.result.replace("triggerRunId:", "");
  }

  if (!triggerRunId) {
    console.warn("No Trigger.dev run ID found for job:", jobId);
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
      
      // Map to properly typed PlanStep array
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

  // ✅ FIX: Extract the actual files from the database with proper typing
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
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <a
            href="/dashboard"
            className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            &larr; Back to Dashboard
          </a>
        </div>

        {/* Job Details Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/50 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white">
                Generation Job
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Created {formatDate(initialJob.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                initialJob.status === 'COMPLETED' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : initialJob.status === 'FAILED'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
              }`}>
                {initialJob.status}
              </span>
              {initialFiles.length > 0 && (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                  {initialFiles.length} files
                </span>
              )}
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Prompt</h2>
            <p className="mt-1 text-gray-900 dark:text-white">
              {initialJob.prompt}
            </p>
          </div>
        </div>

        {/* Generation Pipeline */}
        <div className="mb-6">
          <JobPlan
            initialJob={initialJob}
            accessToken={publicAccessToken}
            jobId={triggerRunId || jobId}
          />
        </div>

        {/* AI Workspace - Always show */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/50 overflow-hidden">
          <Tabs defaultValue="workspace" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none bg-gray-50 dark:bg-gray-900">
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
              />
            </TabsContent>
            
            <TabsContent value="files" className="m-0 p-6">
              {initialFiles.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="font-medium mb-3">Generated Files ({initialFiles.length})</h3>
                  {initialFiles.map((file) => (
                    <div
                      key={file.path}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-mono">{file.path}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {(file.content.length / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">No files generated yet</p>
                  <p className="text-sm">Files will appear here once generation completes</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}