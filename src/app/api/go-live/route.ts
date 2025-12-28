// src/app/api/go-live/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { provisioningService } from '@/lib/infrastructure/provisioning-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { generationJobId } = await request.json();

    if (!generationJobId) {
      return NextResponse.json({ error: 'Generation job ID required' }, { status: 400 });
    }

    console.log(`[GO-LIVE] Request for job: ${generationJobId}`);
    console.log(`[GO-LIVE] Session user ID: ${session.user.id}`);
    console.log(`[GO-LIVE] Session user email: ${session.user.email}`);

    // Verify ownership - first check if job exists at all
    const job = await prisma.generationJob.findFirst({
      where: {
        id: generationJobId,
        userId: session.user.id,
      },
    });

    // Debug: Also check if job exists without user filter
    const jobAny = await prisma.generationJob.findUnique({
      where: { id: generationJobId },
      select: { id: true, userId: true, status: true }
    });

    console.log(`[GO-LIVE] Job with user filter:`, job ? 'FOUND' : 'NOT FOUND');
    console.log(`[GO-LIVE] Job without user filter:`, jobAny);

    if (!job) {
      console.error(`[GO-LIVE] Job not found or unauthorized: ${generationJobId}`);
      if (jobAny) {
        console.error(`[GO-LIVE] Job exists but belongs to different user. Job userId: ${jobAny.userId}, Session userId: ${session.user.id}`);
        return NextResponse.json({
          error: `Job belongs to a different user. This is likely a session issue - try logging out and back in.`
        }, { status: 403 });
      }
      return NextResponse.json({ error: 'Job not found or you do not have access to it' }, { status: 404 });
    }

    // Check if job is complete
    if (job.status !== 'COMPLETED') {
      console.error(`[GO-LIVE] Job not completed. Current status: ${job.status}`);
      return NextResponse.json({
        error: `Job is not ready. Current status: ${job.status}. Please wait for generation to complete.`
      }, { status: 400 });
    }

    // Check if already provisioned
    const existing = await prisma.managedProject.findUnique({
      where: { generationJobId },
    });

    if (existing?.status === 'PREVIEW_READY' || existing?.status === 'DEPLOYED') {
      return NextResponse.json({
        success: true,
        managedProjectId: existing.id,
        previewUrl: existing.vercelUrl,
        status: existing.status,
      });
    }

    // Start provisioning (async - returns immediately)
    const result = await provisioningService.provision(
      session.user.id,
      generationJobId
    );

    return NextResponse.json({
      success: result.success,
      managedProjectId: result.managedProjectId,
      previewUrl: result.previewUrl,
      error: result.error,
    });

  } catch (error) {
    console.error('Go live error:', error);
    return NextResponse.json(
      { error: 'Failed to go live' },
      { status: 500 }
    );
  }
}

// GET: Check provisioning status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const managedProjectId = searchParams.get('id');

    if (!managedProjectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const project = await prisma.managedProject.findFirst({
      where: {
        id: managedProjectId,
        userId: session.user.id,
      },
      include: {
        provisioningLogs: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: project.status,
      step: project.provisioningStep,
      url: project.vercelUrl,
      error: project.errorMessage,
      logs: project.provisioningLogs,
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}