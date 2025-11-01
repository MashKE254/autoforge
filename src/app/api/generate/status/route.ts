import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// THE FIX: Use a relative path to import the global prisma client
import { prisma } from "@/lib/prisma";

/**
 * This API route is polled by the frontend to get the real-time status
 * of a generation job.
 */
export async function GET(request: Request) {
  // 1. Authenticate the. user
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  // 2. Get the jobId from the URL (e.g., /api/generate/status?jobId=...)
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  try {
    // 3. Find the job in the database
    // We use the *shared* prisma client here to avoid connection errors
    const job = await prisma.generationJob.findUnique({
      where: {
        // This is a critical security check:
        // Users can ONLY query jobs that they own.
        id: jobId,
        userId: session.user.id,
      },
      // We only select the fields the frontend needs
      select: {
        status: true,
        planJson: true,
        result: true, // This will contain the error message if it FAILED
      },
    });

    // 4. Handle if job is not found (or doesn't belong to the user)
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // 5. Return the job status successfully
    return NextResponse.json({ job });
    
  } catch (error) {
    console.error(`[API/STATUS] Error fetching job ${jobId}:`, error);
    return NextResponse.json(
      { error: "Internal server error fetching job status." },
      { status: 500 }
    );
  }
}

