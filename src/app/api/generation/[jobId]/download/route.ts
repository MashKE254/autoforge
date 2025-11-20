import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import archiver from 'archiver';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    
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

    // Get job with files
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      include: {
        files: true
      }
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

    // Check if generation is complete
    if (job.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Generation is not complete yet' },
        { status: 400 }
      );
    }

    // Check if files exist
    if (job.files.length === 0) {
      return NextResponse.json(
        { error: 'No files generated for this job' },
        { status: 404 }
      );
    }

    console.log(`📦 Creating ZIP for job ${jobId} with ${job.files.length} files`);

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    // Create a proper streaming response
    const stream = new ReadableStream({
      start(controller) {
        // Pipe archive data to the response stream
        archive.on('data', (chunk) => {
          controller.enqueue(chunk);
        });

        archive.on('end', () => {
          controller.close();
        });

        archive.on('error', (err) => {
          console.error('Archive error:', err);
          controller.error(err);
        });

        // Add all files to archive
        for (const file of job.files) {
          archive.append(file.content, { name: file.path });
        }

        // Finalize the archive
        archive.finalize();
      }
    });

    // Generate filename
    const appName = job.prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `${appName}-${jobId.slice(0, 8)}.zip`;

    // Return streaming response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('❌ Download error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create download',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}