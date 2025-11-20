import { prisma } from '../prisma';
import { moduleSelector } from './module-selector';
import { ParallelGenerationEngine } from './parallel-engine';
import { CodeAssembler } from './code-assembler';

export class GenerationOrchestrator {
  /**
   * Start the full generation process for a job
   */
  async startGeneration(jobId: string): Promise<void> {
    console.log(`🚀 Starting generation for job ${jobId}`);

    try {
      // Get the job
      const job = await prisma.generationJob.findUnique({
        where: { id: jobId }
      });

      if (!job) {
        throw new Error('Job not found');
      }

      if (!job.blueprint) {
        throw new Error('Job does not have a blueprint');
      }

      // Parse blueprint
      const blueprint = JSON.parse(job.blueprint);

      // Update status
      await prisma.generationJob.update({
        where: { id: jobId },
        data: { 
          status: 'RUNNING',
          generationStartedAt: new Date()
        }
      });

      // Step 1: Select modules
      console.log('📋 Step 1: Selecting modules...');
      const tasks = await moduleSelector.selectModules(blueprint);

      // Step 2: Resolve dependencies
      console.log('🔗 Step 2: Resolving dependencies...');
      const orderedTasks = moduleSelector.resolveDependencyOrder(tasks);

      // Step 3: Generate modules in parallel
      console.log('⚡ Step 3: Generating modules in parallel...');
      const engine = new ParallelGenerationEngine(jobId, 20);

      // Set up progress tracking
      engine.onProgress(async (progress, completed, total) => {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            completedModules: completed,
            totalModules: total
          }
        });
      });

      const results = await engine.generateModules(orderedTasks);

      // Check for failures
      const failedModules = results.filter(r => !r.success);
      
      if (failedModules.length > 0) {
        console.warn(`⚠️  ${failedModules.length} modules failed to generate`);
        
        // Log failures
        for (const failed of failedModules) {
          await prisma.generationTelemetry.create({
            data: {
              generationJobId: jobId,
              eventType: 'build_failure',
              errorMessage: `Failed to generate ${failed.moduleName}: ${failed.error}`
            }
          });
        }
      }

      // Step 4: Assemble code (if generation succeeded)
      if (failedModules.length < results.length / 2) {  // If more than 50% succeeded
        console.log('🔨 Step 4: Assembling application code...');
        
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { status: 'COMPOSING' }
        });
        
        const assembler = new CodeAssembler(jobId);
        const files = await assembler.assemble();
        
        // Save files to database
        for (const file of files) {
          await prisma.generatedFile.create({
            data: {
              generationJobId: jobId,
              path: file.path,
              content: file.content,
              language: file.type
            }
          });
        }
        
        console.log(`✅ Assembly complete: ${files.length} files created`);
      }

      // Update job status
      const finalStatus = failedModules.length === results.length ? 'FAILED' : 'COMPLETED';
      
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: finalStatus,
          completedModules: results.filter(r => r.success).length,
          failedModules: failedModules.length,
          generationCompletedAt: finalStatus === 'COMPLETED' ? new Date() : undefined
        }
      });

      if (finalStatus === 'COMPLETED') {
        console.log('✅ Generation complete!');
      } else {
        console.error('❌ Generation failed - too many module failures');
      }

    } catch (error) {
      console.error('❌ Generation error:', error);

      // Update job with error
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorLog: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      // Log telemetry
      await prisma.generationTelemetry.create({
        data: {
          generationJobId: jobId,
          eventType: 'build_failure',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          stackTrace: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }
}

export const orchestrator = new GenerationOrchestrator();