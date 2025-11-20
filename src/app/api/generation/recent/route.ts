import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
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

    // Get recent jobs
    const jobs = await prisma.generationJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        prompt: true,
        status: true,
        createdAt: true,
        totalModules: true
      }
    });

    return NextResponse.json({
      success: true,
      jobs: jobs.map(job => ({
        id: job.id,
        prompt: job.prompt,
        status: job.status,
        createdAt: job.createdAt.toISOString(),
        estimatedModules: job.totalModules
      }))
    });
  } catch (error) {
    console.error('❌ Get recent jobs error:', error);
    
    return NextResponse.json(
      { error: 'Failed to retrieve recent jobs' },
      { status: 500 }
    );
  }
}