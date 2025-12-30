/**
 * Share Remix API
 *
 * File: src/app/api/share/[shareId]/remix/route.ts
 *
 * Creates a new generation from a shared app (remix/fork)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    // 1. Get share link
    const shareLink = await prisma.shareLink.findUnique({
      where: { shareId },
      include: {
        generationJob: true
      }
    });

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    if (!shareLink.allowRemix) {
      return NextResponse.json(
        { error: 'Remixing is not allowed for this app' },
        { status: 403 }
      );
    }

    // 2. Parse request
    const body = await request.json();
    const { modifiedPrompt } = body;

    // Use modified prompt or original
    const prompt = modifiedPrompt || shareLink.generationJob.prompt;

    // 3. Check authentication (optional for remix)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      // For anonymous users, return that they need to sign up
      return NextResponse.json({
        success: false,
        requiresAuth: true,
        message: 'Sign up to save your remixed app',
        prompt // Return the prompt so they can see it
      });
    }

    // 4. Create new generation job
    const newJob = await prisma.generationJob.create({
      data: {
        userId,
        prompt,
        status: 'PENDING',
        generationMode: 'PERSONAL',
        parentJobId: shareLink.generationJobId // Track remix chain
      }
    });

    // 5. Record remix
    const remix = await prisma.shareRemix.create({
      data: {
        originalShareId: shareLink.id,
        newGenerationJobId: newJob.id,
        remixedByUserId: userId,
        modifiedPrompt: modifiedPrompt !== shareLink.generationJob.prompt ? modifiedPrompt : undefined
      }
    });

    // 6. Increment remix count
    await prisma.shareLink.update({
      where: { id: shareLink.id },
      data: {
        remixCount: { increment: 1 }
      }
    });

    // 7. Trigger generation (you'll need to implement this based on your generation system)
    // await triggerGeneration(newJob.id);

    return NextResponse.json({
      success: true,
      remix: {
        id: remix.id,
        newJobId: newJob.id,
        prompt,
        message: 'Your remix is being generated!'
      }
    });

  } catch (error) {
    console.error('Remix error:', error);
    return NextResponse.json(
      { error: 'Failed to create remix' },
      { status: 500 }
    );
  }
}
