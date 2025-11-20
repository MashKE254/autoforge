import PQueue from 'p-queue';
import { Anthropic } from '@anthropic-ai/sdk';
import { moduleStore } from '../modules/module-store';
import { prisma } from '../prisma';
import { ModuleCategory } from '@prisma/client';

export interface GenerationTask {
  moduleId?: string; // If using existing module
  moduleName: string;
  category: ModuleCategory;
  description: string;
  dependencies: string[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

export interface GenerationResult {
  moduleName: string;
  code: string;
  success: boolean;
  error?: string;
  generatedModuleId?: string;
}

export class ParallelGenerationEngine {
  private queue: PQueue;
  private client: Anthropic;
  private jobId: string;
  private progressCallback?: (progress: number, completed: number, total: number) => void;

  constructor(jobId: string, concurrency: number = 1) {  // SEQUENTIAL - ONE AT A TIME
    this.jobId = jobId;
    this.queue = new PQueue({ 
      concurrency: 1,  // Only 1 request at a time for LocalAI stability
      timeout: 600000 // 10 minute timeout per module (LocalAI is very slow on CPU)
    });
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key'
    });
  }

  /**
   * Set callback for progress updates
   */
  onProgress(callback: (progress: number, completed: number, total: number) => void) {
    this.progressCallback = callback;
  }

  /**
   * Generate multiple modules in parallel
   */
  async generateModules(tasks: GenerationTask[]): Promise<GenerationResult[]> {
    console.log(`🚀 Starting parallel generation of ${tasks.length} modules for job ${this.jobId}`);

    // Update job status
    await prisma.generationJob.update({
      where: { id: this.jobId },
      data: {
        status: 'RUNNING',
        generationStartedAt: new Date(),
        totalModules: tasks.length
      }
    });

    const results: GenerationResult[] = [];
    let completed = 0;

    // Add all tasks to queue
    const promises = tasks.map(task =>
      this.queue.add(async () => {
        const result = await this.generateSingleModule(task);
        
        completed++;
        const progress = (completed / tasks.length) * 100;
        
        // Update progress
        await prisma.generationJob.update({
          where: { id: this.jobId },
          data: { 
            completedModules: completed,
            failedModules: results.filter(r => !r.success).length
          }
        });

        // Call progress callback
        if (this.progressCallback) {
          this.progressCallback(progress, completed, tasks.length);
        }

        console.log(`✅ [${completed}/${tasks.length}] ${task.moduleName}`);
        
        return result;
      })
    );

    // Wait for all to complete
    const completedResults = await Promise.all(promises);
    
    console.log(`🎉 Generation complete: ${completedResults.filter(r => r.success).length}/${tasks.length} successful`);
    
    return completedResults;
  }

  /**
   * Generate a single module
   */
  private async generateSingleModule(task: GenerationTask): Promise<GenerationResult> {
    try {
      // Check if we should use an existing module
      if (task.moduleId) {
        const existingModule = await moduleStore.getById(task.moduleId);
        if (existingModule) {
          // Record usage
          await moduleStore.recordUsage(task.moduleId, true);
          
          return {
            moduleName: task.moduleName,
            code: existingModule.code,
            success: true,
            generatedModuleId: task.moduleId
          };
        }
      }

      // Search for similar existing modules
      const similarModules = await moduleStore.search({
        category: task.category,
        query: task.moduleName,
        limit: 1,
        minSuccessRate: 0.85
      });

      if (similarModules.length > 0) {
        const existingModule = similarModules[0];
        console.log(`♻️  Reusing existing module: ${existingModule.name}`);
        
        await moduleStore.recordUsage(existingModule.id, true);
        
        return {
          moduleName: task.moduleName,
          code: existingModule.code,
          success: true,
          generatedModuleId: existingModule.id
        };
      }

      // Generate new module using AI
      console.log(`🔨 Generating new module: ${task.moduleName}`);
      
      const code = await this.callAIModel(task);

      // Save to module library
      const newModule = await moduleStore.create({
        name: task.moduleName,
        description: task.description,
        code,
        category: task.category,
        tags: this.extractTags(task)
      });

      // Record in generation_module table
      await prisma.generationModule.create({
        data: {
          generationJobId: this.jobId,
          moduleId: newModule.id,
          status: 'completed',
          generatedCode: code
        }
      });

      return {
        moduleName: task.moduleName,
        code,
        success: true,
        generatedModuleId: newModule.id
      };
    } catch (error) {
      console.error(`❌ Failed to generate ${task.moduleName}:`, error);

      // Record failed generation
      await prisma.generationTelemetry.create({
        data: {
          generationJobId: this.jobId,
          eventType: 'build_failure',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          stackTrace: error instanceof Error ? error.stack : undefined
        }
      });

      return {
        moduleName: task.moduleName,
        code: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Call LocalAI to generate module code
   * Simplified prompt for faster generation
   */
  private async callAIModel(task: GenerationTask): Promise<string> {
    // SIMPLIFIED PROMPT for faster LocalAI generation
    const prompt = `Create a TypeScript module for Next.js 16.

Module: ${task.moduleName}
Description: ${task.description}

Requirements:
- TypeScript with types
- Proper imports and exports
- Production-ready code
- Follow Next.js 16 best practices

Return ONLY the code, no markdown, no explanations.`;

    console.log(`🤖 Using LocalAI for ${task.moduleName}`);
    
    const response = await fetch(`${process.env.LOCALAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',  // Hermes model alias
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,  // Lower temperature for faster, more deterministic output
        max_tokens: 2000,  // Reduced from 4000 for faster generation
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LocalAI request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from LocalAI');
    }

    return data.choices[0].message.content.trim();
  }

  /**
   * Extract tags from task for better categorization
   */
  private extractTags(task: GenerationTask): string[] {
    const tags: string[] = [task.category.toLowerCase()];
    
    // Extract keywords from module name
    const nameWords = task.moduleName.split('-');
    tags.push(...nameWords);
    
    // Extract keywords from description
    const descWords = task.description.toLowerCase().split(' ');
    const keywords = ['auth', 'payment', 'database', 'api', 'stripe', 'prisma', 'nextauth'];
    
    for (const keyword of keywords) {
      if (descWords.includes(keyword)) {
        tags.push(keyword);
      }
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Get current progress
   */
  getProgress(): { completed: number; total: number; pending: number } {
    return {
      completed: this.queue.size - this.queue.pending,
      total: this.queue.size,
      pending: this.queue.pending
    };
  }

  /**
   * Cancel all pending generations
   */
  async cancel(): Promise<void> {
    this.queue.clear();
    
    await prisma.generationJob.update({
      where: { id: this.jobId },
      data: { status: 'CANCELLED' }
    });
    
    console.log(`🛑 Generation cancelled for job ${this.jobId}`);
  }
}