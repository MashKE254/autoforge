import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Type for file data from database
interface FileData {
  path: string;
  content: string;
  language: string;
}

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

    const { jobId } = await request.json();

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

    // Check if preview already exists and is not expired
    const existingPreview = await prisma.previewSession.findFirst({
      where: {
        generationJobId: jobId,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingPreview) {
      const shareableUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/preview/${existingPreview.id}`;

      return NextResponse.json({
        success: true,
        previewId: existingPreview.id,
        shareableUrl,
        expiresAt: existingPreview.expiresAt,
        message: 'Using existing preview link',
      });
    }

    // FIX: Add proper type annotation for 'f' parameter
    // Create snapshot of files
    const filesSnapshot = job.files.map((f: FileData) => ({
      path: f.path,
      content: f.content,
      language: f.language,
    }));

    // Generate short preview ID (10 chars, URL-safe)
    const previewId = nanoid(10);

    // Create preview session (expires in 24 hours)
    const session_preview = await prisma.previewSession.create({
      data: {
        id: previewId,
        generationJobId: jobId,
        files: filesSnapshot,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const shareableUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/preview/${previewId}`;

    console.log(`✅ Created shareable preview: ${shareableUrl}`);
    console.log(`📦 Files: ${job.files.length}`);
    console.log(`⏰ Expires: ${session_preview.expiresAt}`);

    return NextResponse.json({
      success: true,
      previewId,
      shareableUrl,
      expiresAt: session_preview.expiresAt,
      filesCount: job.files.length,
    });
  } catch (error) {
    console.error('❌ Preview creation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create preview',
      },
      { status: 500 }
    );
  }
}

// GET: Check if preview exists for a job
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID required' },
        { status: 400 }
      );
    }

    const preview = await prisma.previewSession.findFirst({
      where: {
        generationJobId: jobId,
        expiresAt: { gt: new Date() }, // Not expired
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!preview) {
      return NextResponse.json({
        exists: false,
      });
    }

    const shareableUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/preview/${preview.id}`;

    return NextResponse.json({
      exists: true,
      previewId: preview.id,
      shareableUrl,
      expiresAt: preview.expiresAt,
      viewCount: preview.accessCount,
    });
  } catch (error) {
    console.error('Preview check error:', error);
    return NextResponse.json(
      { error: 'Failed to check preview' },
      { status: 500 }
    );
  }
}