// src/types/prisma-types.ts
// Manual type definitions matching your Prisma schema
// Use these if `npx prisma generate` doesn't work

export type JobStatus = 
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLUEPRINT_GENERATED'
  | 'BLUEPRINT_APPROVED'
  | 'COMPOSING'
  | 'TESTING'
  | 'DEPLOYING'
  | 'CANCELLED';

export type DeploymentStatus =
  | 'PENDING'
  | 'BUILDING'
  | 'READY'
  | 'ERROR'
  | 'CANCELLED';

export interface GenerationJob {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: JobStatus;
  prompt: string;
  enhancedPrompt: string | null;
  enhancementUsed: boolean;
  planJson: string | null;
  result: string | null;
  userId: string;
  blueprint: string | null;
  blueprintApprovedAt: Date | null;
  blueprintGeneratedAt: Date | null;
  completedModules: number;
  errorLog: string | null;
  failedModules: number;
  generationCompletedAt: Date | null;
  generationStartedAt: Date | null;
  totalModules: number;
}

export interface GeneratedFile {
  id: string;
  createdAt: Date;
  generationJobId: string;
  path: string;
  content: string;
  language: string;
  size: number;
}