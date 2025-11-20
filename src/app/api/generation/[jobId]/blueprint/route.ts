import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }  // Changed to Promise
) {
  try {
    const { jobId } = await params;  // Await the params
    
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

    // Get job
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId }
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

    // Parse blueprint
    const blueprint = job.blueprint ? JSON.parse(job.blueprint) : null;

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      prompt: job.prompt,
      blueprint,
      createdAt: job.createdAt,
      blueprintGeneratedAt: job.blueprintGeneratedAt
    });
  } catch (error) {
    console.error('❌ Get blueprint error:', error);
    
    return NextResponse.json(
      { error: 'Failed to retrieve blueprint' },
      { status: 500 }
    );
  }
}