import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';

// Type definition for file data
interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { jobId } = await request.json();

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

    // Check for existing deployment
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

    // Create new deployment record
    const deployment = await prisma.deployment.create({
      data: {
        generationJobId: jobId,
        status: 'PENDING',
      },
    });

    // Prepare files for Vercel
    const vercelFiles: Record<string, { file: string }> = {};
    
    // FIX: Add proper type annotation for 'f' parameter
    job.files.forEach((f: GeneratedFile) => {
      vercelFiles[f.path] = {
        file: f.content,
      };
    });

    // Deploy to Vercel
    const vercelResponse = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `autoforge-${jobId.slice(0, 8)}`,
        files: vercelFiles,
        projectSettings: {
          framework: 'nextjs',
          buildCommand: 'npm run build',
          outputDirectory: '.next',
        },
      }),
    });

    if (!vercelResponse.ok) {
      const error = await vercelResponse.text();
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

    return NextResponse.json({
      success: true,
      deploymentId: deployment.id,
      deploymentUrl: `https://${vercelData.url}`,
      status: 'BUILDING',
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
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID required' },
        { status: 400 }
      );
    }

    const deployment = await prisma.deployment.findFirst({
      where: {
        generationJobId: jobId,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!deployment) {
      return NextResponse.json({
        exists: false,
      });
    }

    // Check Vercel status if deployment is building
    if (deployment.status === 'BUILDING' && deployment.vercelDeploymentId) {
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
        
        // Update status based on Vercel response
        if (vercelData.readyState === 'READY') {
          await prisma.deployment.update({
            where: { id: deployment.id },
            data: { status: 'READY' },
          });
          deployment.status = 'READY';
        } else if (vercelData.readyState === 'ERROR') {
          await prisma.deployment.update({
            where: { id: deployment.id },
            data: {
              status: 'ERROR',
              errorMessage: vercelData.error?.message || 'Deployment failed',
            },
          });
          deployment.status = 'ERROR';
        }
      }
    }

    return NextResponse.json({
      exists: true,
      deploymentId: deployment.id,
      deploymentUrl: deployment.deploymentUrl,
      status: deployment.status,
      errorMessage: deployment.errorMessage,
    });
  } catch (error) {
    console.error('Get deployment status error:', error);
    return NextResponse.json(
      { error: 'Failed to get deployment status' },
      { status: 500 }
    );
  }
}