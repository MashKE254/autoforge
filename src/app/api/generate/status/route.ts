import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Define the structure of a plan step
interface PlanStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  [key: string]: unknown; // Allow additional properties
}

export async function GET(request: Request) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get jobId from URL params
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    console.log(`📊 Fetching status for job: ${jobId}`);

    // 3. Fetch the job from database WITH RETRY LOGIC
    let job = null;
    let retries = 3;
    let lastError = null;
    
    while (retries > 0 && !job) {
      try {
        job = await prisma.generationJob.findFirst({
          where: {
            id: jobId,
            userId: session.user.id,
          },
          select: {
            id: true,
            status: true,
            planJson: true,
            result: true,
            createdAt: true,
            updatedAt: true,
            prompt: true,
          },
        });
        
        // If job not found and we have retries left, wait a bit
        if (!job && retries > 1) {
          console.log(`⏳ Job not found, retrying... (${4 - retries}/3)`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        lastError = error;
        console.error(`❌ Database query failed (attempt ${4 - retries}/3):`, error);
        retries--;
        
        if (retries > 0) {
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 500 * (4 - retries)));
        }
      }
      
      retries--;
    }

    if (!job) {
      console.error(`❌ Job not found after retries: ${jobId}`);
      return NextResponse.json(
        { 
          error: "Job not found or unauthorized",
          details: lastError instanceof Error ? lastError.message : "Job does not exist",
          jobId
        },
        { status: 404 }
      );
    }

    // 4. Parse and validate plan JSON (if it exists)
    let parsedPlan = null;
    let planParseError = null;
    
    if (job.planJson) {
      try {
        parsedPlan = JSON.parse(job.planJson);
        
        // Validate plan structure
        if (!Array.isArray(parsedPlan)) {
          throw new Error("Plan is not an array");
        }
        
        // Validate each step has required fields
        const isValid = parsedPlan.every((step: PlanStep) =>
          step.id &&
          step.title &&
          step.description &&
          step.status
        );
        
        if (!isValid) {
          throw new Error("Plan steps are missing required fields");
        }
        
        console.log(`✅ Successfully parsed plan with ${parsedPlan.length} steps`);
      } catch (e) {
        planParseError = e instanceof Error ? e.message : "Unknown parsing error";
        console.error("❌ Failed to parse plan JSON:", e);
        parsedPlan = null;
      }
    }

    // 5. Build comprehensive response
    const response = {
      success: true,
      job: {
        id: job.id,
        status: job.status,
        planJson: job.planJson,
        result: job.result,
        prompt: job.prompt,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      },
      // Add parsed plan for easier client-side consumption
      plan: parsedPlan,
      // Add metadata about the job state
      metadata: {
        hasError: !!planParseError,
        errorMessage: planParseError,
        stepCount: parsedPlan?.length || 0,
        completedSteps: parsedPlan?.filter((s: PlanStep) => s.status === "completed").length || 0,
        failedSteps: parsedPlan?.filter((s: PlanStep) => s.status === "failed").length || 0,
        runningSteps: parsedPlan?.filter((s: PlanStep) => s.status === "running").length || 0,
        pendingSteps: parsedPlan?.filter((s: PlanStep) => s.status === "pending").length || 0,
      }
    };

    console.log(`✅ Status response ready:`, {
      jobId: job.id,
      status: job.status,
      stepCount: response.metadata.stepCount,
      completed: response.metadata.completedSteps,
      failed: response.metadata.failedSteps,
    });

    // 4. Return the enhanced job status
    return NextResponse.json(response);

  } catch (error: unknown) {
    console.error("❌ Error in /api/generate/status:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log detailed error for debugging
    console.error("Error details:", {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
    });
    
    return NextResponse.json(
      { 
        error: "Failed to fetch job status",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}