/**
 * Delete Job API Route
 * 
 * File: src/app/api/jobs/[jobId]/route.ts
 * 
 * Handles DELETE requests to remove a job and all its associated data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Verify the job exists and belongs to the user
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      select: { 
        id: true, 
        userId: true,
        prompt: true 
      }
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (job.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this project' },
        { status: 403 }
      );
    }

    // Delete in transaction to ensure all related data is removed
    await prisma.$transaction(async (tx) => {
      // 1. Delete all generated files for this job
      await tx.generatedFile.deleteMany({
        where: { generationJobId: jobId }
      });

      // 2. Delete published app if exists (and its related data)
      const publishedApp = await tx.publishedApp.findFirst({
        where: { generationJobId: jobId }
      });

      if (publishedApp) {
        // Delete app customers
        await tx.appCustomer.deleteMany({
          where: { publishedAppId: publishedApp.id }
        });

        // Delete transactions
        await tx.transaction.deleteMany({
          where: { publishedAppId: publishedApp.id }
        });

        // Delete the published app
        await tx.publishedApp.delete({
          where: { id: publishedApp.id }
        });
      }

      // 3. Finally delete the job itself
      await tx.generationJob.delete({
        where: { id: jobId }
      });
    });

    console.log(`✅ Deleted job ${jobId} and all related data`);

    return NextResponse.json({ 
      success: true,
      message: 'Project deleted successfully',
      deletedJobId: jobId
    });

  } catch (error) {
    console.error('Delete job error:', error);
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Record to delete does not exist')) {
        return NextResponse.json(
          { error: 'Project not found or already deleted' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete project. Please try again.' },
      { status: 500 }
    );
  }
}

// Also support GET for fetching a single job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { jobId } = await params;

    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      include: {
        files: true,
        publishedApps: true
      }
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (job.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({ job });

  } catch (error) {
    console.error('Get job error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}