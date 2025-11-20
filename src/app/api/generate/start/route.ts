import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { tasks } from "@trigger.dev/sdk/v3";

export async function POST(request: Request) {
  try {
    console.log("📝 /api/generate/start - Starting...");

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
    
    if (isEnhanced) {
      console.log("🧠 GPT-4 enhanced prompt detected");
      console.log("   Original length:", originalPrompt.length);
      console.log("   Enhanced length:", prompt.length);
      console.log("   Expansion ratio:", (prompt.length / originalPrompt.length).toFixed(1) + "x");
    } else {
      console.log("📝 Using original prompt (no enhancement)");
    }

    // 3. Create the job in database with enhancement tracking
    const job = await prisma.generationJob.create({
      data: {
        userId: session.user.id,
        prompt: prompt.trim(), // The prompt to use for generation (enhanced or original)
        enhancedPrompt: isEnhanced ? prompt.trim() : null, // Store enhanced version if used
        enhancementUsed: isEnhanced, // Track if enhancement was used
        status: "PENDING",
      },
    });

    console.log("✅ Job created in database:", job.id);
    console.log("   Enhancement used:", isEnhanced);

    // 4. Trigger the Trigger.dev job
    console.log("🚀 Triggering generate-application-job...");
    
    const handle = await tasks.trigger(
      "generate-application-job",
      { jobId: job.id }
    );

    console.log("✅ Trigger.dev job started:", handle.id);

    // 5. CRITICAL: Store the Trigger.dev run ID in the database
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        result: `triggerRunId:${handle.id}`,
      },
    });

    console.log("✅ Trigger run ID stored:", handle.id);

    // 6. Return success response
    return NextResponse.json({
      success: true,
      jobId: job.id,
      triggerRunId: handle.id,
      enhancementUsed: isEnhanced, // Let frontend know if enhancement was used
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