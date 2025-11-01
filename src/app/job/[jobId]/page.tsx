import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@trigger.dev/sdk";

// Use relative paths to import shared configs/clients
// This avoids TypeScript alias/circular dependency errors
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";

// Import the new Client Component
import JobPlan from "../../../components/job-plan";
import { Badge } from "@/components/ui/badge";

// This is the new page prop type - params is now a Promise in Next.js 15
interface JobPageProps {
  params: Promise<{
    jobId: string;
  }>;
}

// 1. This must be an async function to fix the `params is a Promise` error
export default async function JobPage({ params }: JobPageProps) {
  
  // 2. Get the user's session
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    redirect("/api/auth/signin");
  }

  // 3. Await params before destructuring jobId
  // This is required in Next.js 15
  const { jobId } = await params;

  // 4. Generate the one-time access token for the real-time hook
  // This token is short-lived and secure
  const publicAccessToken = await auth.createPublicToken({
    scopes: {
      read: {
        runs: ["*"], // Allow reading all runs, or specify run IDs as needed
      },
    },
  });

  // 5. Fetch the *initial* job data.
  // This is passed to the client component to prevent a loading flash.
  const initialJob = await prisma.generationJob.findFirst({
    where: {
      id: jobId,
      userId: session.user.id,
    },
  });

  // 6. Handle not found
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

  // 7. Extract the Trigger.dev run ID from the result field
  // Format: "triggerRunId:run_xxxxx"
  let triggerRunId: string | null = null;
  if (initialJob.result && initialJob.result.startsWith("triggerRunId:")) {
    triggerRunId = initialJob.result.replace("triggerRunId:", "");
  }

  // 8. If no trigger run ID is found, we can't use realtime
  // This might happen for old jobs or if the job failed before storing the run ID
  if (!triggerRunId) {
    console.warn("No Trigger.dev run ID found for job:", jobId);
  }

  // Helper function to format the date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
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
          <div className="mt-4">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white">
              Original Prompt:
            </h3>
            <p className="mt-2 rounded-md bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
              {initialJob.prompt}
            </p>
          </div>
        </div>

        {/* This is the Client Component.
          We pass the server-fetched data as props.
          It will handle all the real-time logic.
        */}
        <JobPlan
          initialJob={initialJob}
          accessToken={publicAccessToken}
          jobId={jobId}
        />
      </div>
    </div>
  );
}