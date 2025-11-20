import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { tasks } from "@trigger.dev/sdk/v3";

export async function POST(request: Request) {
  try {
    console.log("🔨 /api/generate/build - Starting...");

    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      console.error("❌ Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", session.user.id);

    // 2. Parse request body
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      console.error("❌ No jobId provided");
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    console.log("✅ Job ID received:", jobId);

    // 3. Verify the job exists and belongs to the user
    const job = await prisma.generationJob.findFirst({
      where: {
        id: jobId,
        userId: session.user.id,
      },
    });

    if (!job) {
      console.error("❌ Job not found or unauthorized:", jobId);
      return NextResponse.json(
        { error: "Job not found or unauthorized" },
        { status: 404 }
      );
    }

    console.log("✅ Job found:", job.id);

    // 4. Check if the plan is ready
    if (!job.planJson) {
      console.error("❌ Plan not ready for job:", jobId);
      return NextResponse.json(
        { error: "Plan is not ready yet. Please wait for planning to complete." },
        { status: 400 }
      );
    }

    console.log("✅ Plan ready, proceeding with build...");

    // 5. Trigger the code generation job
    console.log("🚀 Triggering code-generation-job...");
    
    const handle = await tasks.trigger(
      "code-generation-job",
      { jobId: job.id }
    );

    console.log("✅ Build job started:", handle.id);

    // 6. Store the build run ID
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        result: `buildRunId:${handle.id}`,
      },
    });

    console.log("✅ Build run ID stored:", handle.id);

    // 7. Return success response
    return NextResponse.json({
      success: true,
      jobId: job.id,
      triggerRunId: handle.id,
    });

  } catch (error: unknown) {
    console.error("❌ Error in /api/generate/build:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    return NextResponse.json(
      { 
        error: "Failed to start build process",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}