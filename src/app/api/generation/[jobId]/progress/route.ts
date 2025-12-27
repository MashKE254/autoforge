import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get job with files and telemetry
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      include: {
        files: {
          select: {
            path: true,
          }
        },
        telemetry: {
          where: {
            eventType: 'build_failure'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10,
          select: {
            errorMessage: true,
            createdAt: true,
          }
        }
      }
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Generation job not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (job.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Calculate progress based on status
    let progress = 0;
    let estimatedTimeRemaining = 'Calculating...';

    if (job.status === 'PENDING') {
      progress = 0;
      estimatedTimeRemaining = 'Queued';
    } else if (job.status === 'GENERATING') {
      // Estimate based on elapsed time
      if (job.generationStartedAt) {
        const elapsed = Date.now() - job.generationStartedAt.getTime();
        const elapsedMinutes = elapsed / 60000;

        // Assume average generation takes 1-2 minutes
        if (elapsedMinutes < 1) {
          progress = 25;
          estimatedTimeRemaining = '1-2 minutes';
        } else if (elapsedMinutes < 1.5) {
          progress = 50;
          estimatedTimeRemaining = '30-60 seconds';
        } else {
          progress = 75;
          estimatedTimeRemaining = '30 seconds';
        }
      } else {
        progress = 10;
        estimatedTimeRemaining = '1-2 minutes';
      }
    } else if (job.status === 'COMPLETED') {
      progress = 100;
      estimatedTimeRemaining = 'Complete';
    } else if (job.status === 'FAILED') {
      progress = 0;
      estimatedTimeRemaining = 'Failed';
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      progress: Math.round(progress),
      filesGenerated: job.files.length,
      estimatedTimeRemaining,
      errors: job.telemetry.map((t) => ({
        message: t.errorMessage,
        timestamp: t.createdAt
      })),
      startedAt: job.generationStartedAt,
      completedAt: job.generationCompletedAt,
    });
  } catch (error) {
    console.error('❌ Get progress error:', error);

    return NextResponse.json(
      { error: 'Failed to get progress' },
      { status: 500 }
    );
  }
}