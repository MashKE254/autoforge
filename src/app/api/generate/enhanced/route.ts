/**
 * Enhanced Generation API Route
 * 
 * File: src/app/api/generate/enhanced/route.ts
 * 
 * GET: Classify a prompt (returns type, confidence, features)
 * POST: Start enhanced generation (routes to appropriate generator)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { enhancedClassifyPrompt } from '@/lib/generation/enhanced-prompt-classifier';
import { tasks } from '@trigger.dev/sdk/v3';
import type { enhancedUnifiedGenerationJob } from '@/trigger/enhanced-unified-generate';

// ============================================================================
// GET: Classify prompt without generating
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prompt = searchParams.get('prompt');

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt query parameter is required' },
        { status: 400 }
      );
    }

    // Classify the prompt using enhanced classifier
    const classification = enhancedClassifyPrompt(prompt);

    return NextResponse.json({
      primaryType: classification.primaryType,
      confidence: classification.confidence,
      detectedFeatures: classification.detectedFeatures,
      suggestedTechStack: classification.suggestedTechStack,
      suggestedGenerators: classification.suggestedGenerators,
      reasoning: classification.reasoning,
    });

  } catch (error) {
    console.error('Classification error:', error);
    return NextResponse.json(
      { error: 'Classification failed' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST: Start enhanced generation
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { 
      prompt, 
      forceType, 
      includeInfrastructure = false, 
      includeK8s = false 
    } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
      return NextResponse.json(
        { error: 'Valid prompt is required (minimum 5 characters)' },
        { status: 400 }
      );
    }

    const trimmedPrompt = prompt.trim();

    // 3. Classify the prompt
    const classification = enhancedClassifyPrompt(trimmedPrompt);
    
    console.log('🎯 Enhanced Classification:', {
      type: classification.primaryType,
      confidence: classification.confidence,
      features: classification.detectedFeatures,
      generators: classification.suggestedGenerators,
    });

    // 4. Create generation job
    const job = await prisma.generationJob.create({
      data: {
        userId: session.user.id,
        prompt: trimmedPrompt,
        status: 'PENDING',
        blueprint: JSON.stringify({
          classification: classification.primaryType,
          forceType: forceType || null,
          confidence: classification.confidence,
          detectedFeatures: classification.detectedFeatures,
          suggestedTechStack: classification.suggestedTechStack,
          suggestedGenerators: classification.suggestedGenerators,
          reasoning: classification.reasoning,
          options: {
            includeInfrastructure,
            includeK8s,
          },
        }),
      },
    });

    console.log('📝 Created job:', job.id);

    // 5. Trigger the unified generation task
    // Note: Using the unified task since it handles routing based on classification
    const handle = await tasks.trigger<typeof enhancedUnifiedGenerationJob>(
      'enhanced-unified-generation-job',
      {
        jobId: job.id,
        forceType: forceType || undefined,
        includeInfrastructure,
        includeK8s,
      }
    );

    console.log('🚀 Triggered task:', handle.id);

    // 7. Return response
    return NextResponse.json({
      success: true,
      jobId: job.id,
      triggerRunId: handle.id,
      classification: {
        type: classification.primaryType,
        confidence: classification.confidence,
        features: classification.detectedFeatures,
        techStack: classification.suggestedTechStack,
        generators: classification.suggestedGenerators,
      },
      options: {
        includeInfrastructure,
        includeK8s,
      },
    });

  } catch (error) {
    console.error('Enhanced generation error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Trigger.dev')) {
        return NextResponse.json(
          { error: 'Background job service unavailable. Please try again.' },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Generation failed to start' },
      { status: 500 }
    );
  }
}
