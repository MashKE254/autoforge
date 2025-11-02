import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@trigger.dev/sdk";

// Use relative paths to import shared configs/clients
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";

// Import the Client Components
import JobPlan from "../../../components/job-plan";
import AIWorkspace from "../../../components/ai-workspace";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, FileCode } from "lucide-react";

// This is the new page prop type - params is now a Promise in Next.js 15
interface JobPageProps {
  params: Promise<{
    jobId: string;
  }>;
}

export default async function JobPage({ params }: JobPageProps) {
  
  // Get the user's session
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    redirect("/api/auth/signin");
  }

  // Await params before destructuring jobId
  const { jobId } = await params;

  // Generate the one-time access token for the real-time hook
  const publicAccessToken = await auth.createPublicToken({
    scopes: {
      read: {
        runs: ["*"],
      },
    },
  });

  // Fetch the initial job data
  const initialJob = await prisma.generationJob.findFirst({
    where: {
      id: jobId,
      userId: session.user.id,
    },
  });

  // Handle not found
  if (!initialJob) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg border border-red-500 bg-red-50 p-8 text-red-700 dark:bg-red-900/30">
          <h2 className="text-2xl font-bold">Job Not Found</h2>
          <p className="mt-2">
            The job you are looking for does not exist or you do not have
            permission to view it.
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

  // Parse the plan to pass to components
  let parsedPlan = [];
  if (initialJob.planJson) {
    try {
      parsedPlan = JSON.parse(initialJob.planJson);
      // DEBUG: Log the parsed plan
      console.log("🔍 DEBUG: Parsed plan:", parsedPlan);
    } catch (e) {
      console.error("Failed to parse plan JSON:", e);
    }
  }

  // Check if all steps are completed
  const allStepsCompleted = parsedPlan.length > 0 && 
    parsedPlan.every((step: { status: string }) => step.status === "completed");

  // DEBUG: Log the condition
  console.log("🔍 DEBUG: Plan length:", parsedPlan.length);
  console.log("🔍 DEBUG: All steps completed:", allStepsCompleted);
  console.log("🔍 DEBUG: Step statuses:", parsedPlan.map((s: { status: string }) => s.status));

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

        {/* DEBUG INFO - Remove this later */}
        <div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-500 rounded">
          <h3 className="font-bold text-yellow-900 dark:text-yellow-200 mb-2">🔍 DEBUG INFO</h3>
          <div className="text-sm space-y-1">
            <p><strong>Job Status:</strong> {initialJob.status}</p>
            <p><strong>Plan Length:</strong> {parsedPlan.length}</p>
            <p><strong>All Steps Completed:</strong> {allStepsCompleted ? "✅ YES" : "❌ NO"}</p>
            <p><strong>Step Statuses:</strong></p>
            <ul className="ml-4">
              {parsedPlan.map((step: { status: string; title: string }, i: number) => (
                <li key={i} className={step.status === "completed" ? "text-green-600" : "text-red-600"}>
                  {i + 1}. {step.title}: {step.status}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Job Details Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/50 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white">
                Job Details
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Job ID:
                  </span>{" "}
                  <span className="font-mono">{initialJob.id}</span>
                </div>
                <div className="h-4 w-px bg-gray-300 dark:bg-gray-700" />
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Created:
                  </span>{" "}
                  {formatDate(initialJob.createdAt)}
                </div>
              </div>
            </div>
            
            {/* Status Badge */}
            <div>
              {initialJob.status === "COMPLETED" && allStepsCompleted && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                  ✓ Complete
                </Badge>
              )}
              {initialJob.status === "RUNNING" && (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  ⟳ Running
                </Badge>
              )}
              {initialJob.status === "FAILED" && (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                  ✗ Failed
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white">
              Original Prompt:
            </h3>
            <p className="mt-2 rounded-md bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
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

        {/* DEBUG: Show what should happen */}
        <div className="mb-6 p-4 border-2 border-dashed rounded">
          <p className="font-bold mb-2">
            {allStepsCompleted ? "✅ Condition TRUE - Tabs should appear below:" : "❌ Condition FALSE - Waiting for steps to complete"}
          </p>
        </div>

        {/* AI Workspace - Only show when all steps are completed */}
        {allStepsCompleted ? (
          <div className="rounded-lg border-4 border-green-500 bg-white shadow-sm dark:border-green-500 dark:bg-gray-900/50 overflow-hidden">
            <div className="bg-green-100 dark:bg-green-900/20 p-2 text-center font-bold text-green-800 dark:text-green-200">
              🎉 AI WORKSPACE SECTION (Condition is TRUE!)
            </div>
            <Tabs defaultValue="workspace" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none bg-gray-50 dark:bg-gray-900">
                <TabsTrigger value="workspace" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Workspace
                </TabsTrigger>
                <TabsTrigger value="files" className="gap-2">
                  <FileCode className="h-4 w-4" />
                  Download Files
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="workspace" className="m-0 p-0">
                <AIWorkspace 
                  plan={parsedPlan}
                  projectName={initialJob.prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '-').toLowerCase()}
                  jobId={initialJob.id}
                />
              </TabsContent>
              
              <TabsContent value="files" className="m-0 p-6">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">Use the AI Workspace to edit and download your files</p>
                  <p className="text-sm">Click the Download button in the AI Workspace toolbar</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="rounded-lg border-4 border-red-500 bg-red-50 dark:bg-red-900/20 p-8 text-center">
            <h2 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-4">
              ⏳ Waiting for All Steps to Complete
            </h2>
            <p className="text-red-700 dark:text-red-300">
              AI Workspace will appear here when all steps show &quot;Completed&quot; status
            </p>
            <div className="mt-4 text-sm text-red-600 dark:text-red-400">
              <p>Currently: {parsedPlan.filter((s: { status: string }) => s.status === "completed").length} / {parsedPlan.length} steps completed</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}