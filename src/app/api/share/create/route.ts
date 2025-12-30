/**
 * Share Link Creation API
 *
 * File: src/app/api/share/create/route.ts
 *
 * Creates a shareable link for a generation job
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request
    const body = await request.json();
    const {
      generationJobId,
      title,
      description,
      showCode = false
    } = body;

    if (!generationJobId) {
      return NextResponse.json(
        { error: 'Generation job ID is required' },
        { status: 400 }
      );
    }

    // 3. Verify job ownership
    const job = await prisma.generationJob.findUnique({
      where: { id: generationJobId },
      include: {
        user: true,
        shareLink: true
      }
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Generation job not found' },
        { status: 404 }
      );
    }

    if (job.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // 4. Check if share link already exists
    if (job.shareLink) {
      return NextResponse.json({
        success: true,
        shareLink: {
          id: job.shareLink.id,
          shareId: job.shareLink.shareId,
          url: `${process.env.NEXT_PUBLIC_APP_URL}/share/${job.shareLink.shareId}`,
          viewCount: job.shareLink.viewCount,
          remixCount: job.shareLink.remixCount
        }
      });
    }

    // 5. Generate short share ID (8 characters for clean URLs)
    const shareId = generateShareId();

    // 6. Create share link
    const shareLink = await prisma.shareLink.create({
      data: {
        generationJobId,
        shareId,
        creatorId: session.user.id,
        creatorName: session.user.name || 'Anonymous',
        title: title || job.prompt.slice(0, 100),
        description: description || job.prompt,
        showCode,
        thumbnailUrl: job.thumbnailUrl,
        isPublic: true,
        allowRemix: true
      }
    });

    return NextResponse.json({
      success: true,
      shareLink: {
        id: shareLink.id,
        shareId: shareLink.shareId,
        url: `${process.env.NEXT_PUBLIC_APP_URL}/share/${shareLink.shareId}`,
        viewCount: 0,
        remixCount: 0
      }
    });

  } catch (error) {
    console.error('Create share link error:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

// Helper: Generate short, readable share ID
function generateShareId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
