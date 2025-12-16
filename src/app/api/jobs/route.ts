/**
 * Jobs API Route - DEBUG VERSION
 * File: src/app/api/jobs/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// Force dynamic - do not cache this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // DEBUG LOG 1: Check Auth
    console.log("🔍 API /api/jobs called");
    console.log("   User ID from session:", session?.user?.id);
    
    if (!session?.user?.id) {
      console.log("❌ No user ID in session");
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    
    // DEBUG LOG 2: Querying DB
    console.log(`   Fetching last ${limit} jobs for user...`);
    
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
        prompt: true,
        status: true,
        createdAt: true,
        generationCompletedAt: true,
        errorLog: true,
        _count: {
          select: {
            files: true
          }
        }
      },
    });

    // DEBUG LOG 3: Result
    console.log(`✅ Found ${jobs.length} jobs in database.`);
    if (jobs.length > 0) {
      console.log(`   Most recent job ID: ${jobs[0].id}`);
    }

    const formattedJobs = jobs.map(job => ({
      id: job.id,
      prompt: job.prompt,
      status: job.status,
      createdAt: job.createdAt,
      fileCount: job._count.files,
      errorLog: job.errorLog,
    }));
    
    return NextResponse.json({ jobs: formattedJobs });
    
  } catch (error) {
    console.error('❌ Failed to fetch jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}