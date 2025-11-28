/**
 * Recent Jobs API
 * 
 * File: src/app/api/jobs/recent/route.ts
 * 
 * Returns recent generation jobs for the current user
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobs = await prisma.generationJob.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        prompt: true,
        status: true,
        createdAt: true,
        _count: {
          select: { files: true },
        },
      },
    });

    const formattedJobs = jobs.map((job) => ({
      id: job.id,
      prompt: job.prompt,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
      fileCount: job._count.files,
    }));

    return NextResponse.json({ jobs: formattedJobs });
  } catch (error) {
    console.error('Error fetching recent jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
