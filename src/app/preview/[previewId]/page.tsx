// Shareable Preview Page
// /preview/[previewId] - Anyone with the link can view

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import SharedPreview from '@/components/SharedPreview';

interface PageProps {
  params: Promise<{ previewId: string }>;
}

export default async function PreviewPage({ params }: PageProps) {
  const { previewId } = await params;

  // Fetch preview session
  const session = await prisma.previewSession.findUnique({
    where: { id: previewId },
    include: {
      generationJob: {
        select: {
          prompt: true,
          createdAt: true,
        },
      },
    },
  });

  if (!session) {
    notFound();
  }

  // Check if expired
  if (new Date() > session.expiresAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">⏰</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Preview Expired</h1>
          <p className="text-gray-600">
            This preview link expired on {session.expiresAt.toLocaleDateString()}.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Preview links are valid for 24 hours after creation.
          </p>
        </div>
      </div>
    );
  }

  // Update view count (fire and forget)
  prisma.previewSession
    .update({
      where: { id: session.id },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    })
    .catch((err: Error) => console.error('Failed to update view count:', err));

  // Parse files from JSON
  const files = typeof session.files === 'string' 
    ? JSON.parse(session.files) 
    : session.files;

  return (
    <SharedPreview
      files={files as Array<{ path: string; content: string; language: string }>}
      projectName={session.generationJob.prompt.slice(0, 50)}
      expiresAt={session.expiresAt}
      viewCount={session.accessCount}
    />
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { previewId } = await params;

  const session = await prisma.previewSession.findUnique({
    where: { id: previewId },
    include: {
      generationJob: {
        select: { prompt: true },
      },
    },
  });

  if (!session) {
    return {
      title: 'Preview Not Found',
    };
  }

  return {
    title: `Preview: ${session.generationJob.prompt.slice(0, 50)}`,
    description: 'Shared preview from BuildNow - AI-powered app generation',
  };
}