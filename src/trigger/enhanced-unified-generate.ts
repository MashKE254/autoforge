/**
 * Enhanced Unified Generation Tasks for Trigger.dev
 * 
 * File: src/trigger/enhanced-unified-generate.ts
 * 
 * Background tasks for:
 * - SaaS generation
 * - API backend generation
 * - Infrastructure generation
 * - Full-stack SaaS generation
 */

import { task, logger } from '@trigger.dev/sdk/v3';
import { prisma } from '@/lib/prisma';
import { SaaSGenerator } from '@/lib/generation/saas-generator';
import { APIGenerator } from '@/lib/generation/api-generator';
import { InfrastructureGenerator } from '@/lib/generation/infrastructure-generator';
import { BoltGenerator } from '@/lib/generation/bolt-generator';
import { WorkflowGenerator } from '@/lib/generation/workflow-generator';
import { AgentGenerator } from '@/lib/generation/agent-generator';
import { enhancedClassifyPrompt, EnhancedGenerationType } from '@/lib/generation/enhanced-prompt-classifier';
import type { GeneratedFile } from '@/lib/generation/bolt-generator';

// ============================================================================
// TYPES
// ============================================================================

interface EnhancedGenerationPayload {
  jobId: string;
  forceType?: EnhancedGenerationType;
  includeInfrastructure?: boolean;
  includeK8s?: boolean;
}

// ============================================================================
// MAIN ENHANCED UNIFIED GENERATION LOGIC
// ============================================================================

async function executeEnhancedGeneration(payload: EnhancedGenerationPayload) {
  const { jobId, forceType, includeInfrastructure, includeK8s } = payload;
    
    logger.info('Starting enhanced unified generation', { jobId, forceType });
    
    try {
      // 1. Fetch job from database
      const job = await prisma.generationJob.findUnique({
        where: { id: jobId },
      });
      
      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }
      
      // 2. Update status to RUNNING
      await prisma.generationJob.update({
        where: { id: jobId },
        data: { 
          status: 'RUNNING',
          generationStartedAt: new Date(),
        },
      });
      
      // 3. Classify the prompt
      const classification = enhancedClassifyPrompt(job.prompt);
      const generationType = forceType || classification.primaryType;
      
      logger.info('Classification result', {
        type: generationType,
        confidence: classification.confidence,
        features: classification.detectedFeatures,
      });
      
      // 4. Initialize generators
      const saasGenerator = new SaaSGenerator();
      const apiGenerator = new APIGenerator();
      const infraGenerator = new InfrastructureGenerator();
      const boltGenerator = new BoltGenerator();
      const workflowGenerator = new WorkflowGenerator();
      const agentGenerator = new AgentGenerator();
      
      // 5. Route to appropriate generator(s)
      let files: GeneratedFile[] = [];
      const callbacks = {
        onProgress: (msg: string) => logger.info(msg),
        onFileComplete: (path: string) => logger.info(`Generated: ${path}`),
        onError: (err: string) => logger.error(err),
      };
      
      switch (generationType) {
        case 'full-stack-saas':
          // Generate SaaS + Infrastructure
          logger.info('Generating Full-Stack SaaS (SaaS + Infrastructure)');
          const saasResult = await saasGenerator.generate(job.prompt, jobId, callbacks);
          files = saasResult.files;
          
          // Add infrastructure
          const infraResult = await infraGenerator.generate(
            job.prompt, 
            undefined, 
            callbacks,
            { includeK8s }
          );
          files = [...files, ...infraResult.files];
          break;
          
        case 'full-saas':
          logger.info('Generating Full SaaS');
          const saasOnlyResult = await saasGenerator.generate(job.prompt, jobId, callbacks);
          files = saasOnlyResult.files;
          
          // Optionally add infrastructure
          if (includeInfrastructure) {
            const infraAddResult = await infraGenerator.generate(
              job.prompt,
              undefined,
              callbacks,
              { includeK8s }
            );
            files = [...files, ...infraAddResult.files];
          }
          break;
          
        case 'api-backend':
          logger.info('Generating API Backend');
          const apiResult = await apiGenerator.generate(job.prompt, jobId, callbacks);
          files = apiResult.files;
          
          if (includeInfrastructure) {
            const infraApiResult = await infraGenerator.generate(
              job.prompt,
              undefined,
              callbacks,
              { includeK8s }
            );
            files = [...files, ...infraApiResult.files];
          }
          break;
          
        case 'infrastructure':
          logger.info('Generating Infrastructure Only');
          const infraOnlyResult = await infraGenerator.generate(
            job.prompt,
            jobId,
            callbacks,
            { includeK8s }
          );
          files = infraOnlyResult.files;
          break;
          
        case 'workflow-automation':
        case 'hybrid-workflow-ui':
          logger.info('Generating Workflow');
          const workflowResult = await workflowGenerator.generate(job.prompt, jobId, callbacks);
          files = workflowResult.files;
          
          if (includeInfrastructure) {
            const infraWfResult = await infraGenerator.generate(
              job.prompt,
              undefined,
              callbacks,
              { includeK8s }
            );
            files = [...files, ...infraWfResult.files];
          }
          break;
          
        case 'ai-agent-network':
        case 'hybrid-agent-ui':
          logger.info('Generating AI Agent Network');
          const agentResult = await agentGenerator.generate(job.prompt, jobId, callbacks);
          files = agentResult.files;
          
          if (includeInfrastructure) {
            const infraAgentResult = await infraGenerator.generate(
              job.prompt,
              undefined,
              callbacks,
              { includeK8s }
            );
            files = [...files, ...infraAgentResult.files];
          }
          break;
          
        case 'ui-application':
        default:
          logger.info('Generating UI Application');
          const uiResult = await boltGenerator.generate(job.prompt, jobId, callbacks);
          files = uiResult.files;
          
          if (includeInfrastructure) {
            const infraUiResult = await infraGenerator.generate(
              job.prompt,
              undefined,
              callbacks,
              { includeK8s }
            );
            files = [...files, ...infraUiResult.files];
          }
          break;
      }
      
      // 6. Save files to database (deduplicate by path)
      const fileMap = new Map(files.map(f => [f.path, f]));
      const uniqueFiles = Array.from(fileMap.values());
      
      logger.info(`Saving ${uniqueFiles.length} files to database`);
      
      await prisma.$transaction(
        uniqueFiles.map((file) =>
          prisma.generatedFile.upsert({
            where: {
              generationJobId_path: {
                generationJobId: jobId,
                path: file.path,
              },
            },
            update: {
              content: file.content,
              language: file.language,
              size: file.content.length,
            },
            create: {
              generationJobId: jobId,
              path: file.path,
              content: file.content,
              language: file.language,
              size: file.content.length,
            },
          })
        )
      );
      
      // 7. Update job status
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          generationCompletedAt: new Date(),
          totalModules: uniqueFiles.length,
          completedModules: uniqueFiles.length,
          blueprint: JSON.stringify({
            classification: generationType,
            confidence: classification.confidence,
            detectedFeatures: classification.detectedFeatures,
            suggestedTechStack: classification.suggestedTechStack,
            generatorsUsed: getGeneratorsUsed(generationType, includeInfrastructure),
            filesGenerated: uniqueFiles.length,
          }),
        },
      });
      
      logger.info('Generation completed successfully', {
        jobId,
        type: generationType,
        filesCount: uniqueFiles.length,
      });
      
      return {
        success: true,
        jobId,
        type: generationType,
        filesCount: uniqueFiles.length,
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Generation failed', { jobId, error: errorMessage });
      
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorLog: errorMessage,
        },
      });
      
      throw error;
    }
}

// ============================================================================
// MAIN ENHANCED UNIFIED GENERATION TASK
// ============================================================================

export const enhancedUnifiedGenerationJob = task({
  id: 'enhanced-unified-generation-job',
  maxDuration: 900, // 15 minutes

  run: async (payload: EnhancedGenerationPayload) => {
    return executeEnhancedGeneration(payload);
  },
});

// ============================================================================
// SPECIALIZED TASKS
// ============================================================================

export const saasGenerationJob = task({
  id: 'saas-generation-job',
  maxDuration: 600, // 10 minutes

  run: async (payload: EnhancedGenerationPayload) => {
    return executeEnhancedGeneration({
      ...payload,
      forceType: 'full-saas',
    });
  },
});

export const apiBackendGenerationJob = task({
  id: 'api-backend-generation-job',
  maxDuration: 300, // 5 minutes

  run: async (payload: EnhancedGenerationPayload) => {
    return executeEnhancedGeneration({
      ...payload,
      forceType: 'api-backend',
    });
  },
});

export const infrastructureGenerationJob = task({
  id: 'infrastructure-generation-job',
  maxDuration: 300, // 5 minutes

  run: async (payload: EnhancedGenerationPayload) => {
    return executeEnhancedGeneration({
      ...payload,
      forceType: 'infrastructure',
    });
  },
});

export const fullStackSaasGenerationJob = task({
  id: 'full-stack-saas-generation-job',
  maxDuration: 900, // 15 minutes

  run: async (payload: EnhancedGenerationPayload) => {
    return executeEnhancedGeneration({
      ...payload,
      forceType: 'full-stack-saas',
      includeInfrastructure: true,
    });
  },
});

// ============================================================================
// HELPERS
// ============================================================================

function getGeneratorsUsed(type: EnhancedGenerationType, includeInfra?: boolean): string[] {
  const generators: string[] = [];
  
  switch (type) {
    case 'full-stack-saas':
      generators.push('saas-generator', 'infrastructure-generator');
      break;
    case 'full-saas':
      generators.push('saas-generator');
      break;
    case 'api-backend':
      generators.push('api-generator');
      break;
    case 'infrastructure':
      generators.push('infrastructure-generator');
      break;
    case 'workflow-automation':
    case 'hybrid-workflow-ui':
      generators.push('workflow-generator');
      break;
    case 'ai-agent-network':
    case 'hybrid-agent-ui':
      generators.push('agent-generator');
      break;
    default:
      generators.push('bolt-generator');
  }
  
  if (includeInfra && !generators.includes('infrastructure-generator')) {
    generators.push('infrastructure-generator');
  }
  
  return generators;
}