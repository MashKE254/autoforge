import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }  // Promise type
) {
  try {
    const { jobId } = await params;  // Await params
    
    // Authentication
    const session = await getServerSession();
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

    // Get job with modules
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      include: {
        modules: {
          include: {
            module: {
              select: {
                name: true,
                category: true
              }
            }
          }
        },
        telemetry: {
          where: {
            eventType: 'build_failure'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
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

    // Calculate progress
    const totalModules = job.totalModules || job.modules.length;
    const completedModules = job.completedModules || 0;
    const progress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

    // Calculate estimated time remaining
    let estimatedTimeRemaining = 'Calculating...';
    if (job.generationStartedAt && completedModules > 0 && completedModules < totalModules) {
      const elapsedMinutes = (Date.now() - job.generationStartedAt.getTime()) / 60000;
      const minutesPerModule = elapsedMinutes / completedModules;
      const remainingModules = totalModules - completedModules;
      const remainingMinutes = Math.ceil(minutesPerModule * remainingModules);
      
      if (remainingMinutes < 60) {
        estimatedTimeRemaining = `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
      } else {
        const hours = Math.floor(remainingMinutes / 60);
        const minutes = remainingMinutes % 60;
        estimatedTimeRemaining = `${hours}h ${minutes}m`;
      }
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      progress: Math.round(progress),
      totalModules,
      completedModules,
      failedModules: job.failedModules || 0,
      estimatedTimeRemaining,
      modules: job.modules.map(m => ({
        name: m.module.name,
        category: m.module.category,
        status: m.status
      })),
      errors: job.telemetry.map(t => ({
        message: t.errorMessage,
        timestamp: t.createdAt
      })),
      startedAt: job.generationStartedAt,
      blueprintApprovedAt: job.blueprintApprovedAt
    });
  } catch (error) {
    console.error('❌ Get progress error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get progress' },
      { status: 500 }
    );
  }
}