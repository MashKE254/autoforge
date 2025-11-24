// app/generate/result/[jobId]/page.tsx
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import AIWorkspace from '@/components/ai-workspace';
import type { PlanStep } from '@/components/job-plan';

interface PageProps {
  params: Promise<{ jobId: string }>;
}

// Define the file type for passing to AIWorkspace
interface GeneratedFileData {
  path: string;
  content: string;
  language: string;
}

// Define the module type from Prisma query
interface ModuleWithRelation {
  module: {
    id: string;
    name: string;
    description: string;
  };
  generatedCode: string | null;
}

// Define the file type from Prisma query
interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export default async function GenerationResultPage({ params }: PageProps) {
  const { jobId } = await params;

  // Get the completed job with FILES from database
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: {
      files: true,  // ✅ This contains the actual generated files!
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

  // Convert modules to PlanStep format for display
  const plan: PlanStep[] = (job.modules as ModuleWithRelation[]).map((m) => ({
    id: m.module.id,
    title: m.module.name,
    description: m.module.description || '',
    code: m.generatedCode || '',
    status: 'completed' as const,
    dependencies: []
  }));

  // ✅ FIX: Extract the actual files from the database with proper typing
  const initialFiles: GeneratedFileData[] = (job.files as GeneratedFile[]).map((f) => ({
    path: f.path,
    content: f.content,
    language: f.language,
  }));

  console.log(`📁 Passing ${initialFiles.length} files to AIWorkspace`);
  console.log('Files:', initialFiles.map(f => f.path).join(', '));

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <AIWorkspace 
        plan={plan}
        projectName={job.prompt.slice(0, 50)}
        jobId={jobId}
        initialFiles={initialFiles}  // ✅ Pass the database files!
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