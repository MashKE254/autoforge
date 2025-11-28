/**
 * Generation Result Page
 * 
 * File: src/app/generate/result/[jobId]/page.tsx
 * 
 * Shows the AI Workspace with generated files
 */

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AIWorkspace from '@/components/ai-workspace';

interface PageProps {
  params: Promise<{ jobId: string }>;
}

interface PlanStep {
  title: string;
  description: string;
  [key: string]: unknown;
}

export default async function ResultPage({ params }: PageProps) {
  const { jobId } = await params;

  // Fetch job and files
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: {
      files: {
        orderBy: { path: 'asc' },
      },
    },
  });

  if (!job) {
    notFound();
  }

  // Transform files
  const initialFiles = job.files.map((file) => ({
    path: file.path,
    content: file.content,
    language: file.language || 'plaintext',
  }));

  // Parse plan if available
  let plan: PlanStep[] = [];
  if (job.blueprint) {
    try {
      const blueprint = JSON.parse(job.blueprint as string);
      plan = blueprint.plan || [];
    } catch {
      plan = [];
    }
  }

  // Generate project name from prompt
  const projectName = job.prompt
    .slice(0, 50)
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim() || 'Generated App';

  return (
    <AIWorkspace
      plan={plan}
      projectName={projectName}
      jobId={jobId}
      initialFiles={initialFiles}
    />
  );
}