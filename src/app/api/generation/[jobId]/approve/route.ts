import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { orchestrator } from '@/lib/generation/orchestrator'; // ADD THIS

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const job = await prisma.generationJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json({ error: 'Generation job not found' }, { status: 404 });
    }

    if (job.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (job.status !== 'BLUEPRINT_GENERATED') {
      return NextResponse.json(
        { error: 'Blueprint must be in BLUEPRINT_GENERATED status to approve' },
        { status: 400 }
      );
    }

    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'BLUEPRINT_APPROVED',
        blueprintApprovedAt: new Date()
      }
    });

    console.log(`✅ Blueprint approved for job ${jobId}, starting generation...`);

    // Start generation in background (UPDATED - don't await)
    orchestrator.startGeneration(jobId).catch(error => {
      console.error('Background generation error:', error);
    });
    
    return NextResponse.json({
      success: true,
      jobId: jobId,
      status: 'BLUEPRINT_APPROVED',
      message: 'Generation started!'
    });
  } catch (error) {
    console.error('❌ Approve blueprint error:', error);
    return NextResponse.json({ error: 'Failed to approve blueprint' }, { status: 500 });
  }
}