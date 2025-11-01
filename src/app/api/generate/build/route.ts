import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { tasks } from "@trigger.dev/sdk";

// Use relative paths to import shared configs/clients
// This avoids TypeScript alias/circular dependency errors
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

/**
 * API route to start the code generation (build) process.
 * This is called when the user clicks "Start Code Generation" on the job page.
 */
export async function POST(request: Request) {
  try {
    // 1. Get user session
    const session = await getServerSession(authOptions);

    // 2. Protect the route
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Parse the request body
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // 4. Validate that this job belongs to the current user
    const job = await prisma.generationJob.findFirst({
      where: {
        id: jobId,
        userId: session.user.id,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found or you do not have permission" },
        { status: 404 }
      );
    }

    // 5. Trigger the new background job and get the run handle
    const handle = await tasks.trigger("code-generation-job", {
      jobId: jobId,
    });

    // 6. Store the build run ID in the database
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        result: `buildRunId:${handle.id}`,
      },
    });

    // 7. Return an immediate success response with the run ID
    return NextResponse.json({ 
      success: true, 
      jobId: jobId,
      triggerRunId: handle.id,
    }, { status: 202 });
  } catch (error) {
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Error in /api/generate/build:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}