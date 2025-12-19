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
    console.log("   Session user ID:", session?.user?.id);
    console.log("   Session user email:", session?.user?.email);

    if (!session?.user?.email) {
      console.log("❌ No user email in session");
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database by email (same logic as /api/generate)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      console.log("❌ User not found in database");
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log("   Database user ID:", user.id);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    // DEBUG LOG 2: Querying DB
    console.log(`   Fetching last ${limit} jobs for user...`);

    const jobs = await prisma.generationJob.findMany({
      where: {
        userId: user.id, // Use database user ID instead of session user ID
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