import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';

// Type for recent job data
interface RecentJob {
  id: string;
  createdAt: Date;
  status: string;
  prompt: string;
  completedModules: number;
  totalModules: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get user's recent generation jobs
    const jobs = await prisma.generationJob.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        status: true,
        prompt: true,
        completedModules: true,
        totalModules: true,
      },
    });

    // FIX: Add proper type annotation for 'job' parameter
    return NextResponse.json({
      success: true,
      jobs: jobs.map((job: RecentJob) => ({
        id: job.id,
        createdAt: job.createdAt,
        status: job.status,
        prompt: job.prompt.slice(0, 100),
        progress: job.totalModules > 0 
          ? Math.round((job.completedModules / job.totalModules) * 100) 
          : 0,
      })),
    });
  } catch (error) {
    console.error('Get recent jobs error:', error);
    return NextResponse.json(
      { error: 'Failed to get recent jobs' },
      { status: 500 }
    );
  }
}