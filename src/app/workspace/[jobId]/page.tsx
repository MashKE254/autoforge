/**
 * Workspace Redirect Route
 * 
 * File: src/app/workspace/[jobId]/page.tsx
 * 
 * This route redirects to the actual job page.
 * It exists because some parts of the app redirect to /workspace/[jobId]
 * but the actual workspace is at /job/[jobId]
 */

import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default async function WorkspaceRedirect({ params }: PageProps) {
  const { jobId } = await params;
  
  // Redirect to the actual job page which has the AI Workspace
  redirect(`/job/${jobId}`);
}