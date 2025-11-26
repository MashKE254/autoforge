/**
 * Simplified Generation Start API Route
 * 
 * File: src/app/api/generate/start/route.ts
 * 
 * This is the simplified version that triggers the Bolt-style generator.
 * No blueprint step, no module selection - just prompt → generate → done.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { tasks } from "@trigger.dev/sdk/v3";

export async function POST(request: Request) {
  try {
    console.log("📝 /api/generate/start - Bolt-style generation...");

    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      console.error("❌ Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", session.user.id);

    // 2. Parse and validate request body
    const body = await request.json();
    const { prompt, originalPrompt } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      console.error("❌ Invalid prompt");
      return NextResponse.json(
        { error: "Valid prompt is required" },
        { status: 400 }
      );
    }

    console.log("✅ Prompt received:", prompt.substring(0, 50) + "...");

    // Check if this is an enhanced prompt
    const isEnhanced = originalPrompt && originalPrompt !== prompt;

    // 3. Create the job in database
    const job = await prisma.generationJob.create({
      data: {
        userId: session.user.id,
        prompt: prompt.trim(),
        enhancedPrompt: isEnhanced ? prompt.trim() : null,
        enhancementUsed: isEnhanced,
        status: "PENDING",
        // No blueprint needed for bolt-style generation
        totalModules: 0,
        completedModules: 0,
      },
    });

    console.log("✅ Job created:", job.id);

    // 4. Trigger the Bolt-style generation job
    console.log("🚀 Triggering generate-application-job (Bolt-style)...");
    
    const handle = await tasks.trigger(
      "generate-application-job",
      { jobId: job.id }
    );

    console.log("✅ Trigger.dev job started:", handle.id);

    // 5. Store the run ID
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        result: `triggerRunId:${handle.id}`,
      },
    });

    // 6. Return success response
    return NextResponse.json({
      success: true,
      jobId: job.id,
      triggerRunId: handle.id,
      enhancementUsed: isEnhanced,
    });

  } catch (error: unknown) {
    console.error("❌ Error in /api/generate/start:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    return NextResponse.json(
      { 
        error: "Failed to start generation job",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}