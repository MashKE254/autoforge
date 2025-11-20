import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { blueprintGenerator } from '@/lib/generation/blueprint-generator';

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      return NextResponse.json(
        { error: 'Invalid prompt. Please provide a detailed description (at least 10 characters).' },
        { status: 400 }
      );
    }

    // Generate blueprint
    console.log(`🎯 Generating blueprint for user ${user.email}`);
    const blueprint = await blueprintGenerator.generate(prompt);

    // Create generation job with blueprint
    const job = await prisma.generationJob.create({
      data: {
        prompt: prompt.trim(),
        blueprint: JSON.stringify(blueprint),
        status: 'BLUEPRINT_GENERATED',
        blueprintGeneratedAt: new Date(),
        totalModules: blueprint.estimatedModules,
        userId: user.id
      }
    });

    console.log(`✅ Blueprint created for job ${job.id}`);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      blueprint
    });
  } catch (error) {
    console.error('❌ Blueprint generation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate blueprint',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}