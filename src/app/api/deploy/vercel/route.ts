// API Route: Deploy to Vercel
// POST /api/deploy/vercel
// Deploys generated app to Vercel production

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { VercelDeployment } from '@/lib/deployment/vercel';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { jobId, envVars } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Get job with files
    const job = await prisma.generationJob.findUnique({
      where: {
        id: jobId,
        userId: session.user.id, // Ensure user owns this job
      },
      include: { files: true },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    if (job.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Generation not completed yet' },
        { status: 400 }
      );
    }

    // Check if already deployed
    const existingDeployment = await prisma.deployment.findFirst({
      where: {
        generationJobId: jobId,
        status: { in: ['BUILDING', 'READY'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingDeployment && existingDeployment.status === 'READY') {
      return NextResponse.json({
        success: true,
        deploymentId: existingDeployment.vercelDeploymentId,
        url: existingDeployment.deploymentUrl,
        status: 'ready',
        message: 'App already deployed',
      });
    }

    // Extract project name from prompt (first 30 chars, sanitized)
    const projectName = job.prompt
      .slice(0, 30)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '')
      || 'generated-app';

    console.log(`🚀 Starting deployment for job ${jobId}`);
    console.log(`📝 Project name: ${projectName}`);
    console.log(`📦 Files: ${job.files.length}`);

    // Deploy to Vercel
    const deployer = new VercelDeployment();
    const deployment = await deployer.deploy({
      jobId,
      projectName,
      files: job.files.map(f => ({
        path: f.path,
        content: f.content,
      })),
      envVars: envVars || undefined,
    });

    console.log(`✅ Deployment initiated: ${deployment.url}`);

    return NextResponse.json({
      success: true,
      deploymentId: deployment.deploymentId,
      url: deployment.url,
      inspectorUrl: deployment.inspectorUrl,
      status: 'building',
    });
  } catch (error) {
    console.error('❌ Deployment error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Deployment failed',
      },
      { status: 500 }
    );
  }
}

// GET: Check deployment status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');
    const deploymentId = searchParams.get('deploymentId');

    if (!jobId && !deploymentId) {
      return NextResponse.json(
        { error: 'Job ID or Deployment ID required' },
        { status: 400 }
      );
    }

    // Find deployment
    const deployment = await prisma.deployment.findFirst({
      where: deploymentId
        ? { vercelDeploymentId: deploymentId }
        : { generationJobId: jobId! },
      orderBy: { createdAt: 'desc' },
    });

    if (!deployment) {
      return NextResponse.json(
        { error: 'No deployment found' },
        { status: 404 }
      );
    }

    // If still building, check Vercel status
    if (deployment.status === 'BUILDING') {
      try {
        const deployer = new VercelDeployment();
        const vercelStatus = await deployer.getDeploymentStatus(
          deployment.vercelDeploymentId!
        );

        console.log(`📊 Deployment status: ${vercelStatus.readyState}`);

        // Update database based on Vercel status
        if (vercelStatus.readyState === 'READY') {
          await prisma.deployment.update({
            where: { id: deployment.id },
            data: { status: 'READY' },
          });
          deployment.status = 'READY';
        } else if (vercelStatus.readyState === 'ERROR') {
          await prisma.deployment.update({
            where: { id: deployment.id },
            data: {
              status: 'ERROR',
              errorMessage: vercelStatus.error?.message || 'Build failed',
              buildLogs: vercelStatus.error?.message || 'Build failed',
            },
          });
          deployment.status = 'ERROR';
        }
      } catch (error) {
        console.error('Failed to check Vercel status:', error);
        // Don't fail the request, just return cached status
      }
    }

    return NextResponse.json({
      success: true,
      deployment: {
        id: deployment.id,
        deploymentId: deployment.vercelDeploymentId,
        url: deployment.deploymentUrl,
        status: deployment.status,
        buildLogs: deployment.buildLogs,
        createdAt: deployment.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check deployment status' },
      { status: 500 }
    );
  }
}