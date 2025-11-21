-- Migration: Add PreviewSession and Deployment models
-- This updates the database schema to match the new Prisma schema

-- Drop existing tables if they exist (optional - use with caution)
-- DROP TABLE IF EXISTS "PreviewSession" CASCADE;
-- DROP TABLE IF EXISTS "Deployment" CASCADE;

-- Create DeploymentStatus enum
CREATE TYPE "DeploymentStatus" AS ENUM ('PENDING', 'BUILDING', 'READY', 'ERROR', 'CANCELLED');

-- Add PreviewSession model for shareable preview links
CREATE TABLE "PreviewSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "generationJobId" TEXT NOT NULL,
    "files" JSONB NOT NULL,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),

    CONSTRAINT "PreviewSession_pkey" PRIMARY KEY ("id")
);

-- Add Deployment model for Vercel deployments
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "generationJobId" TEXT NOT NULL,
    "vercelDeploymentId" TEXT,
    "vercelProjectId" TEXT,
    "deploymentUrl" TEXT,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "buildLogs" TEXT,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- Create indexes for PreviewSession
CREATE INDEX "PreviewSession_generationJobId_idx" ON "PreviewSession"("generationJobId");
CREATE INDEX "PreviewSession_expiresAt_idx" ON "PreviewSession"("expiresAt");

-- Create indexes for Deployment
CREATE UNIQUE INDEX "Deployment_vercelDeploymentId_key" ON "Deployment"("vercelDeploymentId");
CREATE INDEX "Deployment_generationJobId_idx" ON "Deployment"("generationJobId");
CREATE INDEX "Deployment_status_idx" ON "Deployment"("status");
CREATE INDEX "Deployment_createdAt_idx" ON "Deployment"("createdAt");

-- Add foreign key constraints
ALTER TABLE "PreviewSession" ADD CONSTRAINT "PreviewSession_generationJobId_fkey" 
    FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_generationJobId_fkey" 
    FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comments for documentation
COMMENT ON TABLE "PreviewSession" IS 'Stores shareable preview sessions with 24-hour expiration';
COMMENT ON COLUMN "PreviewSession"."files" IS 'JSON structure containing all project files for WebContainer';
COMMENT ON COLUMN "PreviewSession"."accessCount" IS 'Number of times this preview has been accessed';

COMMENT ON TABLE "Deployment" IS 'Tracks Vercel deployments for generated applications';
COMMENT ON COLUMN "Deployment"."vercelDeploymentId" IS 'Unique deployment ID from Vercel';
COMMENT ON COLUMN "Deployment"."status" IS 'Current deployment status: PENDING, BUILDING, READY, ERROR, or CANCELLED';