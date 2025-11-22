// app/generate/result/[jobId]/page.tsx
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import AIWorkspace from '@/components/ai-workspace';
import type { PlanStep } from '@/components/job-plan'; // Import the correct type

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default async function GenerationResultPage({ params }: PageProps) {
  const { jobId } = await params;

  // Get the completed job
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: {
      files: true,
      modules: {
        include: { module: true }
      }
    }
  });

  if (!job) {
    notFound();
  }

  if (job.status !== 'COMPLETED') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Generation {job.status}</h1>
          <p className="text-gray-600 mt-2">
            Progress: {job.completedModules}/{job.totalModules} modules
          </p>
        </div>
      </div>
    );
  }

  // Convert to PlanStep format with proper status typing
  const plan: PlanStep[] = job.modules.map((m) => ({
    id: m.module.id,
    title: m.module.name,
    description: m.module.description || '',
    code: m.generatedCode || '',
    status: 'completed', // Explicitly typed as the literal "completed"
    dependencies: []
  }));

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <AIWorkspace 
        plan={plan}
        projectName={job.prompt.slice(0, 50)}
        jobId={jobId}
      />
    </div>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { jobId } = await params;
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    select: { prompt: true }
  });

  return {
    title: job?.prompt ? `Result: ${job.prompt.slice(0, 50)}` : 'Generation Result'
  };
}