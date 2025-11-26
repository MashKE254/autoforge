/**
 * Unified Generation Start API Route
 * 
 * File: src/app/api/generate/start/route.ts
 * 
 * Updated to use the UnifiedGenerator which automatically:
 * 1. Classifies the prompt (UI, Workflow, or Agent)
 * 2. Routes to the appropriate generator
 * 3. Returns the result
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { tasks } from "@trigger.dev/sdk/v3";
import { classifyUserPrompt } from "@/lib/generation/unified-generator";

export async function POST(request: Request) {
  try {
    console.log("📝 /api/generate/start - Unified generation...");

    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      console.error("❌ Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", session.user.id);

    // 2. Parse and validate request body
    const body = await request.json();
    const { prompt, originalPrompt, forceType } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      console.error("❌ Invalid prompt");
      return NextResponse.json(
        { error: "Valid prompt is required" },
        { status: 400 }
      );
    }

    console.log("✅ Prompt received:", prompt.substring(0, 50) + "...");

    // 3. Classify the prompt to determine generation type
    const classification = classifyUserPrompt(prompt);
    console.log(`🎯 Classification: ${classification.primaryType} (${(classification.confidence * 100).toFixed(1)}% confidence)`);
    console.log(`   Reasoning: ${classification.reasoning}`);

    // Check if this is an enhanced prompt
    const isEnhanced = originalPrompt && originalPrompt !== prompt;

    // 4. Create the job in database with classification info
    const job = await prisma.generationJob.create({
      data: {
        userId: session.user.id,
        prompt: prompt.trim(),
        enhancedPrompt: isEnhanced ? prompt.trim() : null,
        enhancementUsed: isEnhanced,
        status: "PENDING",
        totalModules: 0,
        completedModules: 0,
        // Store classification in blueprint
        blueprint: JSON.stringify({
          classificationType: forceType || classification.primaryType,
          classification: {
            primaryType: classification.primaryType,
            confidence: classification.confidence,
            detectedFeatures: classification.detectedFeatures,
            suggestedTechStack: classification.suggestedTechStack,
            reasoning: classification.reasoning,
          },
        }),
      },
    });

    console.log("✅ Job created:", job.id);

    // 5. Trigger the unified generation job
    console.log("🚀 Triggering unified-generation-job...");
    
    const handle = await tasks.trigger(
      "unified-generation-job",
      { 
        jobId: job.id,
        forceType: forceType || undefined,
      }
    );

    console.log("✅ Trigger.dev job started:", handle.id);

    // 6. Store the run ID
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        result: `triggerRunId:${handle.id}`,
      },
    });

    // 7. Return success response with classification info
    return NextResponse.json({
      success: true,
      jobId: job.id,
      triggerRunId: handle.id,
      enhancementUsed: isEnhanced,
      classification: {
        type: classification.primaryType,
        confidence: classification.confidence,
        features: classification.detectedFeatures,
        techStack: classification.suggestedTechStack,
      },
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