/**
 * Direct Generation API - Instant Preview
 * 
 * File: src/app/api/generate/instant/route.ts
 * 
 * This API generates the app directly without Trigger.dev,
 * allowing for instant preview of simple applications.
 * 
 * Use this for:
 * - Simple apps (calculator, todo, timer)
 * - Quick prototypes
 * - When you want instant results
 * 
 * Use the regular /api/generate/start for:
 * - Complex apps that might timeout
 * - Apps that need background processing
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { boltGenerator } from "@/lib/generation/bolt-generator";

export async function POST(request: Request) {
  try {
    console.log("⚡ /api/generate/instant - Direct generation...");

    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Valid prompt is required" },
        { status: 400 }
      );
    }

    console.log("⚡ Generating instantly:", prompt.slice(0, 50) + "...");

    // 3. Create job record
    const job = await prisma.generationJob.create({
      data: {
        userId: session.user.id,
        prompt: prompt.trim(),
        status: "RUNNING",
        generationStartedAt: new Date(),
      },
    });

    // 4. Generate directly (no Trigger.dev)
    const result = await boltGenerator.generate(prompt, job.id);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: "Generation failed",
          details: result.error,
          jobId: job.id
        },
        { status: 500 }
      );
    }

    console.log(`✅ Generated ${result.files.length} files instantly`);

    // 5. Return files directly for immediate preview
    return NextResponse.json({
      success: true,
      jobId: job.id,
      files: result.files,
      fileCount: result.files.length,
    });

  } catch (error: unknown) {
    console.error("❌ Error in /api/generate/instant:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      { error: "Generation failed", details: errorMessage },
      { status: 500 }
    );
  }
}