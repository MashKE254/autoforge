/**
 * Jobs API Route
 * 
 * File: src/app/api/jobs/route.ts
 * 
 * Fetches generation jobs for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const status = searchParams.get('status'); // Optional filter
    
    const where: Record<string, unknown> = {
      userId: session.user.id,
    };
    
    if (status) {
      where.status = status;
    }
    
    const jobs = await prisma.generationJob.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(limit, 50), // Max 50
      select: {
        id: true,
        prompt: true,
        status: true,
        createdAt: true,
        generationCompletedAt: true,
        errorLog: true,
      },
    });
    
    return NextResponse.json({ jobs });
    
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}