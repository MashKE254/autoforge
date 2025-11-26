/**
 * Generation Status API - Updated for Bolt-Style
 * 
 * File: src/app/api/generate/status/route.ts
 * 
 * Returns job status including file count for polling.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Type for plan steps
interface PlanStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  code?: string;
  dependencies?: string[];
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Extract jobId from query params
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { 
          error: "Missing jobId parameter",
          details: "Please provide a jobId query parameter"
        },
        { status: 400 }
      );
    }

    console.log(`📊 Fetching status for job: ${jobId}`);

    // 2. Fetch job from database with files count
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      include: {
        _count: {
          select: { files: true }
        }
      }
    });

    // 3. Handle job not found
    if (!job) {
      console.log(`❌ Job not found: ${jobId}`);
      return NextResponse.json(
        {
          error: "Job not found",
          jobId
        },
        { status: 404 }
      );
    }

    // 4. Parse and validate plan JSON (if it exists)
    let parsedPlan: PlanStep[] | null = null;
    let planParseError: string | null = null;
    
    if (job.planJson) {
      try {
        parsedPlan = JSON.parse(job.planJson);
        
        if (!Array.isArray(parsedPlan)) {
          throw new Error("Plan is not an array");
        }
        
        console.log(`✅ Parsed plan with ${parsedPlan.length} steps`);
      } catch (e) {
        planParseError = e instanceof Error ? e.message : "Unknown parsing error";
        console.error("❌ Failed to parse plan JSON:", e);
        parsedPlan = null;
      }
    }

    // 5. Build comprehensive response
    const fileCount = job._count.files;
    
    const response = {
      success: true,
      job: {
        id: job.id,
        status: job.status,
        planJson: job.planJson,
        result: job.result,
        prompt: job.prompt,
        errorLog: job.errorLog,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        // ✅ Include file count for polling
        fileCount: fileCount,
      },
      plan: parsedPlan,
      metadata: {
        hasError: !!planParseError || job.status === 'FAILED',
        errorMessage: planParseError || job.errorLog,
        stepCount: parsedPlan?.length || 0,
        completedSteps: parsedPlan?.filter((s) => s.status === "completed").length || 0,
        failedSteps: parsedPlan?.filter((s) => s.status === "failed").length || 0,
        runningSteps: parsedPlan?.filter((s) => s.status === "running").length || 0,
        pendingSteps: parsedPlan?.filter((s) => s.status === "pending").length || 0,
        // ✅ Include file count in metadata too
        fileCount: fileCount,
      },
      timing: {
        queryTimeMs: Date.now() - startTime,
      }
    };

    console.log(`✅ Status response:`, {
      jobId: job.id,
      status: job.status,
      fileCount: fileCount,
      timeMs: response.timing.queryTimeMs,
    });

    return NextResponse.json(response);

  } catch (error: unknown) {
    console.error("❌ Error in /api/generate/status:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
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