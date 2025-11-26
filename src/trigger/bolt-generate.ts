/**
 * Bolt-Style Generation Task for Trigger.dev
 * 
 * File: src/trigger/bolt-generate.ts
 * 
 * This replaces the complex multi-step generation with a single-shot approach.
 */

import { task, logger } from "@trigger.dev/sdk/v3";
import { BoltGenerator } from "@/lib/generation/bolt-generator";
import { prisma } from "@/lib/prisma";

// Create instance of the generator
const generator = new BoltGenerator();

/**
 * Main generation task - Bolt.new style
 */
export const generateApplicationJob = task({
  id: "generate-application-job",
  maxDuration: 300, // 5 minutes
  
  run: async (payload: { jobId: string }) => {
    const { jobId } = payload;
    
    logger.info("🚀 Starting Bolt-style generation", { jobId });
    
    try {
      // 1. Get the job from database
      const job = await prisma.generationJob.findUnique({
        where: { id: jobId }
      });
      
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }
      
      logger.info("📝 Got job", { 
        prompt: job.prompt.slice(0, 100),
        status: job.status 
      });
      
      // 2. Update status to running
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: "RUNNING",
          generationStartedAt: new Date()
        }
      });
      
      // 3. Generate the application (single LLM call!)
      logger.info("🤖 Calling AI to generate complete application...");
      
      const result = await generator.generate(job.prompt, jobId, {
        onProgress: (message: string) => {
          logger.info(`Progress: ${message}`);
        },
        onFileComplete: (path: string) => {
          logger.info(`✅ Generated: ${path}`);
        },
        onError: (error: string) => {
          logger.error(`❌ Error: ${error}`);
        }
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Generation failed');
      }
      
      logger.info("✅ Generation complete!", {
        filesCount: result.files.length,
        files: result.files.map((f: { path: string }) => f.path)
      });
      
      // 4. Create a simple plan for the UI (optional, for compatibility)
      const planSteps = result.files.map((file: { path: string }, index: number) => ({
        id: `file-${index}`,
        title: file.path,
        description: `Generated ${file.path}`,
        status: 'completed'
      }));
      
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          planJson: JSON.stringify(planSteps)
        }
      });
      
      return {
        success: true,
        jobId,
        filesGenerated: result.files.length,
        files: result.files.map((f: { path: string }) => f.path)
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error("❌ Generation failed", { error: errorMessage });
      
      // Update job status to failed
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          errorLog: errorMessage
        }
      });
      
      throw error;
    }
  }
});

/**
 * Code generation task (alias for backwards compatibility)
 */
export const codeGenerationJob = task({
  id: "code-generation-job",
  maxDuration: 300,
  
  run: async (payload: { jobId: string }) => {
    return generateApplicationJob.trigger(payload);
  }
});