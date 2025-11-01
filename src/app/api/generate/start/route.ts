import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { tasks } from "@trigger.dev/sdk";

// Use relative paths to import shared configs/clients
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

/**
 * API route to start the generation job
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
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required and must be a string" },
        { status: 400 }
      );
    }

    // 4. Create a job record in the database
    const job = await prisma.generationJob.create({
      data: {
        prompt,
        status: "PENDING",
        userId: session.user.id,
      },
    });

    // 5. Trigger the background job and get the run handle
    const handle = await tasks.trigger("generate-application-job", {
      jobId: job.id,
    });

    // 6. Store the Trigger.dev run ID in the database
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        // Store the run ID in the result field temporarily
        // or add a new field called triggerRunId to your schema
        result: `triggerRunId:${handle.id}`,
      },
    });

    // 7. Return both the job ID and the Trigger.dev run ID
    return NextResponse.json(
      { 
        jobId: job.id,
        triggerRunId: handle.id, // This is what we need for realtime
      },
      { status: 202 }
    );
  } catch (error) {
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Error in /api/generate/start:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}