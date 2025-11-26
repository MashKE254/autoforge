/**
 * Unified Generation Task for Trigger.dev
 * 
 * File: src/trigger/unified-generate.ts
 * 
 * This task handles all generation types:
 * - UI Applications (default)
 * - Workflow Automations
 * - AI Agent Networks
 * 
 * It uses the UnifiedGenerator to automatically route to the correct generator.
 */

import { task, logger } from "@trigger.dev/sdk/v3";
import { unifiedGenerator } from "@/lib/generation/unified-generator";
import { GenerationType } from "@/lib/generation/prompt-classifier";
import { prisma } from "@/lib/prisma";

/**
 * Main unified generation task
 */
export const unifiedGenerationJob = task({
  id: "unified-generation-job",
  maxDuration: 600, // 10 minutes (agents/workflows need more time)
  
  run: async (payload: { jobId: string; forceType?: GenerationType }) => {
    const { jobId, forceType } = payload;
    
    logger.info("🎯 Starting Unified Generation", { jobId, forceType });
    
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
      
      // 3. Generate using unified generator (auto-classifies!)
      logger.info("🤖 Calling Unified Generator...");
      
      const result = await unifiedGenerator.generate(job.prompt, {
        jobId,
        forceType,
        callbacks: {
          onProgress: (message: string) => {
            logger.info(`Progress: ${message}`);
          },
          onFileComplete: (path: string) => {
            logger.info(`✅ Generated: ${path}`);
          },
          onError: (error: string) => {
            logger.error(`❌ Error: ${error}`);
          }
        }
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Generation failed');
      }
      
      logger.info("✅ Generation complete!", {
        type: result.classificationType,
        confidence: result.classification.confidence,
        filesCount: result.files.length,
        files: result.files.map((f: { path: string }) => f.path)
      });
      
      // 4. Create plan for UI
      const planSteps = result.files.map((file: { path: string }, index: number) => ({
        id: `file-${index}`,
        title: file.path,
        description: `Generated ${file.path}`,
        status: 'completed'
      }));
      
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          planJson: JSON.stringify(planSteps),
          // Update blueprint with final classification
          blueprint: JSON.stringify({
            classificationType: result.classificationType,
            classification: result.classification,
            generatedAt: new Date().toISOString(),
          }),
        }
      });
      
      return {
        success: true,
        jobId,
        generationType: result.classificationType,
        classification: {
          type: result.classification.primaryType,
          confidence: result.classification.confidence,
          features: result.classification.detectedFeatures,
        },
        filesGenerated: result.files.length,
        files: result.files.map((f: { path: string }) => f.path)
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      logger.error("❌ Generation failed", { error: errorMessage });
      
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          errorLog: errorMessage,
        }
      });
      
      throw error;
    }
  }
});

/**
 * Workflow-specific generation task (for explicit workflow requests)
 */
export const workflowGenerationJob = task({
  id: "workflow-generation-job",
  maxDuration: 600,
  
  run: async (payload: { jobId: string }) => {
    const { jobId } = payload;
    
    logger.info("🔄 Starting Workflow Generation", { jobId });
    
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId }
    });
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    const result = await unifiedGenerator.generateWorkflow(job.prompt, jobId, {
      onProgress: (msg) => logger.info(msg),
      onFileComplete: (path) => logger.info(`✅ ${path}`),
      onError: (err) => logger.error(err),
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Workflow generation failed');
    }
    
    return {
      success: true,
      jobId,
      filesGenerated: result.files.length,
    };
  }
});

/**
 * Agent-specific generation task (for explicit agent requests)
 */
export const agentGenerationJob = task({
  id: "agent-generation-job",
  maxDuration: 600,
  
  run: async (payload: { jobId: string }) => {
    const { jobId } = payload;
    
    logger.info("🤖 Starting Agent Network Generation", { jobId });
    
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId }
    });
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    const result = await unifiedGenerator.generateAgentNetwork(job.prompt, jobId, {
      onProgress: (msg) => logger.info(msg),
      onFileComplete: (path) => logger.info(`✅ ${path}`),
      onError: (err) => logger.error(err),
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Agent generation failed');
    }
    
    return {
      success: true,
      jobId,
      filesGenerated: result.files.length,
    };
  }
});