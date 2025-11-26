/**
 * Trigger.dev Task Exports
 * 
 * File: src/trigger/index.ts
 * 
 * This file exports all Trigger.dev tasks for the AutoForge platform.
 * Trigger.dev automatically discovers and registers these tasks.
 * 
 * ============================================================================
 * AVAILABLE TASKS:
 * ============================================================================
 * 
 * UI APPLICATION GENERATION:
 * - generate-application-job: Bolt-style single-shot UI app generation
 * - code-generation-job: Alias for backwards compatibility
 * 
 * UNIFIED GENERATION (NEW):
 * - unified-generation-job: Auto-classifies prompt and routes to correct generator
 *   • Detects "UI app" → uses BoltGenerator
 *   • Detects "workflow/automation" → uses WorkflowGenerator  
 *   • Detects "AI agent" → uses AgentGenerator
 * 
 * EXPLICIT GENERATORS (NEW):
 * - workflow-generation-job: Force workflow automation generation
 * - agent-generation-job: Force AI agent network generation
 * 
 * ============================================================================
 * USAGE:
 * ============================================================================
 * 
 * From API routes, trigger tasks like this:
 * 
 *   import { tasks } from "@trigger.dev/sdk/v3";
 * 
 *   // Auto-detect and generate
 *   await tasks.trigger("unified-generation-job", { jobId: "..." });
 * 
 *   // Or force a specific type
 *   await tasks.trigger("workflow-generation-job", { jobId: "..." });
 *   await tasks.trigger("agent-generation-job", { jobId: "..." });
 * 
 * ============================================================================
 */

// ============================================================================
// ORIGINAL BOLT-STYLE GENERATION
// ============================================================================

import { task, logger } from "@trigger.dev/sdk/v3";
import { BoltGenerator } from "@/lib/generation/bolt-generator";
import { prisma } from "@/lib/prisma";

// Create instance of the generator
const boltGenerator = new BoltGenerator();

/**
 * Main generation task - Bolt.new style (UI Applications)
 * 
 * This is the original generator that creates Next.js UI applications.
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
      
      const result = await boltGenerator.generate(job.prompt, jobId, {
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

// ============================================================================
// NEW: UNIFIED GENERATION (Auto-detects UI, Workflow, or Agent)
// ============================================================================

import { unifiedGenerator } from "@/lib/generation/unified-generator";
import type { GenerationType } from "@/lib/generation/prompt-classifier";

/**
 * Unified generation task - Auto-classifies and routes
 * 
 * This is the NEW main entry point that automatically detects:
 * - UI applications → routes to BoltGenerator
 * - Workflow automations → routes to WorkflowGenerator
 * - AI agent networks → routes to AgentGenerator
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
 * Workflow-specific generation task
 * 
 * Use this when you explicitly want workflow automation generation,
 * bypassing the auto-classification.
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
    
    // Update status
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "RUNNING",
        generationStartedAt: new Date()
      }
    });
    
    const result = await unifiedGenerator.generateWorkflow(job.prompt, jobId, {
      onProgress: (msg) => logger.info(msg),
      onFileComplete: (path) => logger.info(`✅ ${path}`),
      onError: (err) => logger.error(err),
    });
    
    if (!result.success) {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          errorLog: result.error || "Workflow generation failed"
        }
      });
      throw new Error(result.error || 'Workflow generation failed');
    }
    
    // Create plan for UI
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
        blueprint: JSON.stringify({
          classificationType: 'workflow-automation',
          generatedAt: new Date().toISOString(),
        }),
      }
    });
    
    logger.info("✅ Workflow generation complete!", {
      filesCount: result.files.length
    });
    
    return {
      success: true,
      jobId,
      generationType: 'workflow-automation',
      filesGenerated: result.files.length,
    };
  }
});

/**
 * Agent-specific generation task
 * 
 * Use this when you explicitly want AI agent network generation,
 * bypassing the auto-classification.
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
    
    // Update status
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "RUNNING",
        generationStartedAt: new Date()
      }
    });
    
    const result = await unifiedGenerator.generateAgentNetwork(job.prompt, jobId, {
      onProgress: (msg) => logger.info(msg),
      onFileComplete: (path) => logger.info(`✅ ${path}`),
      onError: (err) => logger.error(err),
    });
    
    if (!result.success) {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          errorLog: result.error || "Agent generation failed"
        }
      });
      throw new Error(result.error || 'Agent generation failed');
    }
    
    // Create plan for UI
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
        blueprint: JSON.stringify({
          classificationType: 'ai-agent-network',
          generatedAt: new Date().toISOString(),
        }),
      }
    });
    
    logger.info("✅ Agent generation complete!", {
      filesCount: result.files.length
    });
    
    return {
      success: true,
      jobId,
      generationType: 'ai-agent-network',
      filesGenerated: result.files.length,
    };
  }
});