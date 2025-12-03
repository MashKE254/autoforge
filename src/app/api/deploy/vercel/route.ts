/**
 * Vercel Deployment API Route - Personal & Public Deployments
 * 
 * File: src/app/api/deploy/vercel/route.ts
 * 
 * Features:
 * - Deploy WITHOUT Stripe (Personal Use)
 * - Optional monetization flag
 * - Personal vs Public deployment types
 * - Real-time status checking
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';
// Types
interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

interface DeployRequestBody {
  jobId: string;
  deploymentType?: 'personal' | 'public';
  enableMonetization?: boolean;
}

// POST: Create new deployment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: DeployRequestBody = await request.json();
    const { jobId, deploymentType = 'personal', enableMonetization = false } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID required' },
        { status: 400 }
      );
    }

    // Get job with files
    const job = await prisma.generationJob.findUnique({
      where: {
        id: jobId,
        userId: session.user.id,
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

    // Check for existing active deployment
    const existingDeployment = await prisma.deployment.findFirst({
      where: {
        generationJobId: jobId,
        status: { in: ['PENDING', 'BUILDING', 'READY'] },
      },
    });

    if (existingDeployment && existingDeployment.deploymentUrl) {
      return NextResponse.json({
        success: true,
        deploymentId: existingDeployment.id,
        deploymentUrl: existingDeployment.deploymentUrl,
        status: existingDeployment.status,
        message: 'Using existing deployment',
      });
    }

    // Verify Vercel token exists
    if (!process.env.VERCEL_TOKEN) {
      return NextResponse.json(
        { error: 'Vercel integration not configured. Please set VERCEL_TOKEN.' },
        { status: 500 }
      );
    }

    // Create deployment record
    const deployment = await prisma.deployment.create({
      data: {
        generationJobId: jobId,
        status: 'PENDING',
        // Store deployment metadata
        // You can add these fields to your schema if needed:
        // deploymentType: deploymentType,
        // enableMonetization: enableMonetization,
      },
    });

    // Prepare files for Vercel (base64 encoded)
    const vercelFiles = job.files.map((f: GeneratedFile) => ({
      file: f.path,
      data: Buffer.from(f.content).toString('base64'),
      encoding: 'base64',
    }));

    // Sanitize project name
    const sanitizedName = job.prompt
      .slice(0, 30)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'autoforge-app';

    console.log(`🚀 Deploying ${sanitizedName} to Vercel (${deploymentType})...`);
    console.log(`📦 Files: ${vercelFiles.length}`);
    console.log(`💰 Monetization: ${enableMonetization ? 'Yes' : 'No'}`);

    // Deploy to Vercel
    const vercelResponse = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: sanitizedName,
        files: vercelFiles,
        projectSettings: {
          framework: 'nextjs',
          buildCommand: 'npm run build',
          outputDirectory: '.next',
          installCommand: 'npm install',
          nodeVersion: '18.x',
        },
        target: 'production',
      }),
    });

    if (!vercelResponse.ok) {
      const error = await vercelResponse.text();
      console.error('❌ Vercel API error:', error);
      
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: 'ERROR',
          errorMessage: `Vercel deployment failed: ${error}`,
        },
      });

      throw new Error(`Vercel deployment failed: ${error}`);
    }

    const vercelData = await vercelResponse.json();

    // Update deployment record
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: {
        vercelDeploymentId: vercelData.id,
        vercelProjectId: vercelData.projectId,
        deploymentUrl: `https://${vercelData.url}`,
        status: 'BUILDING',
      },
    });

    console.log(`✅ Deployment created: https://${vercelData.url}`);

    return NextResponse.json({
      success: true,
      deploymentId: deployment.id,
      vercelDeploymentId: vercelData.id,
      deploymentUrl: `https://${vercelData.url}`,
      status: 'BUILDING',
      deploymentType,
      enableMonetization,
    });

  } catch (error) {
    console.error('Deployment error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to deploy',
      },
      { status: 500 }
    );
  }
}

// GET: Check deployment status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
      where: jobId 
        ? { generationJobId: jobId }
        : { id: deploymentId! },
      orderBy: { createdAt: 'desc' },
      include: {
        generationJob: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!deployment) {
      return NextResponse.json({
        exists: false,
      });
    }

    // Verify ownership
    if (deployment.generationJob.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // If deployment is building, check Vercel status
    if (deployment.status === 'BUILDING' && deployment.vercelDeploymentId) {
      try {
        const vercelResponse = await fetch(
          `https://api.vercel.com/v13/deployments/${deployment.vercelDeploymentId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
            },
          }
        );

        if (vercelResponse.ok) {
          const vercelData = await vercelResponse.json();
          
          let newStatus: typeof deployment.status | 'READY' | 'ERROR' | 'CANCELLED' = deployment.status;
          let errorMessage = deployment.errorMessage;

          if (vercelData.readyState === 'READY') {
            newStatus = 'READY';
          } else if (vercelData.readyState === 'ERROR') {
            newStatus = 'ERROR';
            errorMessage = vercelData.error?.message || 'Deployment failed';
          } else if (vercelData.readyState === 'CANCELED') {
            newStatus = 'CANCELLED';
          }

          // Update if status changed
          if (newStatus !== deployment.status) {
            await prisma.deployment.update({
              where: { id: deployment.id },
              data: {
                status: newStatus,
                errorMessage,
                // Update URL if ready (might have changed)
                ...(newStatus === 'READY' && vercelData.url
                  ? { deploymentUrl: `https://${vercelData.url}` }
                  : {}),
              },
            });
            deployment.status = newStatus;
            if (errorMessage) deployment.errorMessage = errorMessage;
          }
        }
      } catch (vercelError) {
        console.error('Error checking Vercel status:', vercelError);
        // Continue with current status
      }
    }

    return NextResponse.json({
      exists: true,
      deploymentId: deployment.id,
      vercelDeploymentId: deployment.vercelDeploymentId,
      deploymentUrl: deployment.deploymentUrl,
      status: deployment.status,
      errorMessage: deployment.errorMessage,
      createdAt: deployment.createdAt,
    });

  } catch (error) {
    console.error('Get deployment status error:', error);
    return NextResponse.json(
      { error: 'Failed to get deployment status' },
      { status: 500 }
    );
  }
}

// DELETE: Cancel deployment
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const deploymentId = searchParams.get('deploymentId');

    if (!deploymentId) {
      return NextResponse.json(
        { error: 'Deployment ID required' },
        { status: 400 }
      );
    }

    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        generationJob: {
          select: { userId: true },
        },
      },
    });

    if (!deployment) {
      return NextResponse.json(
        { error: 'Deployment not found' },
        { status: 404 }
      );
    }

    if (deployment.generationJob.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Cancel on Vercel if building
    if (deployment.status === 'BUILDING' && deployment.vercelDeploymentId) {
      try {
        await fetch(
          `https://api.vercel.com/v13/deployments/${deployment.vercelDeploymentId}/cancel`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
            },
          }
        );
      } catch (cancelError) {
        console.error('Error canceling Vercel deployment:', cancelError);
      }
    }

    // Update status
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({
      success: true,
      message: 'Deployment cancelled',
    });

  } catch (error) {
    console.error('Cancel deployment error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel deployment' },
      { status: 500 }
    );
  }
}