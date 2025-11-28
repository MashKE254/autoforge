/**
 * Enhanced Unified Generator
 * 
 * File: src/lib/generation/enhanced-unified-generator.ts
 * 
 * Orchestrates all generation types:
 * - UI Applications (BoltGenerator)
 * - Full SaaS (SaaSGenerator)
 * - API Backends (APIGenerator)
 * - Workflow Automation (WorkflowGenerator)
 * - AI Agent Networks (AgentGenerator)
 * - Infrastructure (InfrastructureGenerator)
 * 
 * Can combine multiple generators for complex projects.
 */

import { prisma } from '../prisma';
import { enhancedClassifyPrompt, EnhancedGenerationType, EnhancedClassificationResult } from './enhanced-prompt-classifier';
import { BoltGenerator, GeneratedFile, GenerationResult, StreamCallbacks } from './bolt-generator';
import { WorkflowGenerator } from './workflow-generator';
import { AgentGenerator } from './agent-generator';
import { SaaSGenerator } from './saas-generator';
import { APIGenerator } from './api-generator';
import { InfrastructureGenerator } from './infrastructure-generator';

// ============================================================================
// TYPES
// ============================================================================

export interface EnhancedGenerationResult extends GenerationResult {
  classificationType: EnhancedGenerationType;
  classification: EnhancedClassificationResult;
  generatorsUsed: string[];
}

export interface EnhancedGenerationContext {
  jobId?: string;
  callbacks?: StreamCallbacks;
  forceType?: EnhancedGenerationType;
  includeInfrastructure?: boolean;
  includeK8s?: boolean;
}

// ============================================================================
// ENHANCED UNIFIED GENERATOR
// ============================================================================

export class EnhancedUnifiedGenerator {
  private boltGenerator: BoltGenerator;
  private workflowGenerator: WorkflowGenerator;
  private agentGenerator: AgentGenerator;
  private saasGenerator: SaaSGenerator;
  private apiGenerator: APIGenerator;
  private infrastructureGenerator: InfrastructureGenerator;
  
  constructor() {
    this.boltGenerator = new BoltGenerator();
    this.workflowGenerator = new WorkflowGenerator();
    this.agentGenerator = new AgentGenerator();
    this.saasGenerator = new SaaSGenerator();
    this.apiGenerator = new APIGenerator();
    this.infrastructureGenerator = new InfrastructureGenerator();
  }
  
  /**
   * Main generation method - auto-classifies and routes to appropriate generator(s)
   */
  async generate(
    prompt: string,
    context: EnhancedGenerationContext = {}
  ): Promise<EnhancedGenerationResult> {
    const { jobId, callbacks, forceType, includeInfrastructure, includeK8s } = context;
    
    console.log('🎯 Enhanced Unified Generator starting...');
    
    // Step 1: Classify the prompt
    callbacks?.onProgress?.('🔍 Analyzing your request...');
    const classification = enhancedClassifyPrompt(prompt);
    
    console.log(`   Classification: ${classification.primaryType}`);
    console.log(`   Confidence: ${(classification.confidence * 100).toFixed(1)}%`);
    console.log(`   Suggested generators: ${classification.suggestedGenerators.join(', ')}`);
    console.log(`   Reasoning: ${classification.reasoning}`);
    
    // Allow override
    const generationType = forceType || classification.primaryType;
    
    // Update job with classification info
    if (jobId) {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          blueprint: JSON.stringify({
            classification: generationType,
            confidence: classification.confidence,
            detectedFeatures: classification.detectedFeatures,
            suggestedTechStack: classification.suggestedTechStack,
            suggestedGenerators: classification.suggestedGenerators,
            reasoning: classification.reasoning,
          }),
        },
      });
    }
    
    // Step 2: Route to appropriate generator(s)
    const generatorsUsed: string[] = [];
    let allFiles: GeneratedFile[] = [];
    
    // Primary generation
    let primaryResult: GenerationResult;
    
    switch (generationType) {
      case 'full-stack-saas':
        callbacks?.onProgress?.('🏢 Generating complete SaaS application...');
        console.log('   → Routing to SaaS Generator');
        generatorsUsed.push('saas-generator');
        primaryResult = await this.saasGenerator.generate(prompt, jobId, callbacks);
        
        if (primaryResult.success) {
          allFiles = [...primaryResult.files];
          
          // Also generate infrastructure
          callbacks?.onProgress?.('🏗️ Generating infrastructure...');
          generatorsUsed.push('infrastructure-generator');
          const infraResult = await this.infrastructureGenerator.generateForExistingProject(
            primaryResult.files,
            undefined, // Don't save to same job
            callbacks,
            { includeK8s }
          );
          
          if (infraResult.success) {
            // Merge infrastructure files (don't overwrite app files)
            const existingPaths = new Set(allFiles.map(f => f.path));
            infraResult.files.forEach(f => {
              if (!existingPaths.has(f.path)) {
                allFiles.push(f);
              }
            });
          }
        }
        break;
        
      case 'full-saas':
        callbacks?.onProgress?.('🏢 Generating SaaS application...');
        console.log('   → Routing to SaaS Generator');
        generatorsUsed.push('saas-generator');
        primaryResult = await this.saasGenerator.generate(prompt, jobId, callbacks);
        allFiles = primaryResult.files;
        
        // Optionally add infrastructure
        if (includeInfrastructure && primaryResult.success) {
          callbacks?.onProgress?.('🏗️ Adding infrastructure...');
          generatorsUsed.push('infrastructure-generator');
          const infraResult = await this.infrastructureGenerator.generateForExistingProject(
            primaryResult.files,
            undefined,
            callbacks,
            { includeK8s }
          );
          if (infraResult.success) {
            const existingPaths = new Set(allFiles.map(f => f.path));
            infraResult.files.forEach(f => {
              if (!existingPaths.has(f.path)) {
                allFiles.push(f);
              }
            });
          }
        }
        break;
        
      case 'api-backend':
        callbacks?.onProgress?.('🔌 Generating API backend...');
        console.log('   → Routing to API Generator');
        generatorsUsed.push('api-generator');
        primaryResult = await this.apiGenerator.generate(prompt, jobId, callbacks);
        allFiles = primaryResult.files;
        
        if (includeInfrastructure && primaryResult.success) {
          callbacks?.onProgress?.('🏗️ Adding infrastructure...');
          generatorsUsed.push('infrastructure-generator');
          const infraResult = await this.infrastructureGenerator.generateForExistingProject(
            primaryResult.files,
            undefined,
            callbacks,
            { includeK8s }
          );
          if (infraResult.success) {
            const existingPaths = new Set(allFiles.map(f => f.path));
            infraResult.files.forEach(f => {
              if (!existingPaths.has(f.path)) {
                allFiles.push(f);
              }
            });
          }
        }
        break;
        
      case 'infrastructure':
        callbacks?.onProgress?.('🏗️ Generating infrastructure configuration...');
        console.log('   → Routing to Infrastructure Generator');
        generatorsUsed.push('infrastructure-generator');
        primaryResult = await this.infrastructureGenerator.generate(
          prompt,
          jobId,
          callbacks,
          { includeK8s: includeK8s || classification.detectedFeatures.needsK8s }
        );
        allFiles = primaryResult.files;
        break;
        
      case 'workflow-automation':
        callbacks?.onProgress?.('🔄 Generating workflow automation...');
        console.log('   → Routing to Workflow Generator');
        generatorsUsed.push('workflow-generator');
        primaryResult = await this.workflowGenerator.generate(prompt, jobId, callbacks);
        allFiles = primaryResult.files;
        break;
        
      case 'hybrid-workflow-ui':
        callbacks?.onProgress?.('🔄 Generating workflow with UI...');
        console.log('   → Routing to Workflow Generator (hybrid)');
        generatorsUsed.push('workflow-generator');
        primaryResult = await this.workflowGenerator.generate(prompt, jobId, callbacks);
        allFiles = primaryResult.files;
        break;
        
      case 'ai-agent-network':
        callbacks?.onProgress?.('🤖 Generating AI agent network...');
        console.log('   → Routing to Agent Generator');
        generatorsUsed.push('agent-generator');
        primaryResult = await this.agentGenerator.generate(prompt, jobId, callbacks);
        allFiles = primaryResult.files;
        break;
        
      case 'hybrid-agent-ui':
        callbacks?.onProgress?.('🤖 Generating AI agent with UI...');
        console.log('   → Routing to Agent Generator (hybrid)');
        generatorsUsed.push('agent-generator');
        primaryResult = await this.agentGenerator.generate(prompt, jobId, callbacks);
        allFiles = primaryResult.files;
        break;
        
      case 'ui-application':
      default:
        callbacks?.onProgress?.('🎨 Generating UI application...');
        console.log('   → Routing to Bolt Generator (UI)');
        generatorsUsed.push('bolt-generator');
        primaryResult = await this.boltGenerator.generate(prompt, jobId, callbacks);
        allFiles = primaryResult.files;
        
        if (includeInfrastructure && primaryResult.success) {
          callbacks?.onProgress?.('🏗️ Adding infrastructure...');
          generatorsUsed.push('infrastructure-generator');
          const infraResult = await this.infrastructureGenerator.generateForExistingProject(
            primaryResult.files,
            undefined,
            callbacks,
            { includeK8s }
          );
          if (infraResult.success) {
            const existingPaths = new Set(allFiles.map(f => f.path));
            infraResult.files.forEach(f => {
              if (!existingPaths.has(f.path)) {
                allFiles.push(f);
              }
            });
          }
        }
        break;
    }
    
    // Update job with final files if primary generation was successful
    if (jobId && primaryResult.success && allFiles.length > 0) {
      // Save all files to database
      await prisma.$transaction(
        allFiles.map((file: GeneratedFile) =>
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
      
      // Update job completion
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          generationCompletedAt: new Date(),
          totalModules: allFiles.length,
          completedModules: allFiles.length,
          blueprint: JSON.stringify({
            classification: generationType,
            confidence: classification.confidence,
            detectedFeatures: classification.detectedFeatures,
            suggestedTechStack: classification.suggestedTechStack,
            generatorsUsed,
            filesGenerated: allFiles.length,
          }),
        },
      });
    }
    
    return {
      success: primaryResult.success,
      files: allFiles,
      error: primaryResult.error,
      classificationType: generationType,
      classification,
      generatorsUsed,
    };
  }
  
  /**
   * Generate with explicit type (skip classification)
   */
  async generateUI(
    prompt: string,
    jobId?: string,
    callbacks?: StreamCallbacks
  ): Promise<GenerationResult> {
    return this.boltGenerator.generate(prompt, jobId, callbacks);
  }
  
  async generateSaaS(
    prompt: string,
    jobId?: string,
    callbacks?: StreamCallbacks
  ): Promise<GenerationResult> {
    return this.saasGenerator.generate(prompt, jobId, callbacks);
  }
  
  async generateAPI(
    prompt: string,
    jobId?: string,
    callbacks?: StreamCallbacks
  ): Promise<GenerationResult> {
    return this.apiGenerator.generate(prompt, jobId, callbacks);
  }
  
  async generateWorkflow(
    prompt: string,
    jobId?: string,
    callbacks?: StreamCallbacks
  ): Promise<GenerationResult> {
    return this.workflowGenerator.generate(prompt, jobId, callbacks);
  }
  
  async generateAgentNetwork(
    prompt: string,
    jobId?: string,
    callbacks?: StreamCallbacks
  ): Promise<GenerationResult> {
    return this.agentGenerator.generate(prompt, jobId, callbacks);
  }
  
  async generateInfrastructure(
    prompt: string,
    jobId?: string,
    callbacks?: StreamCallbacks,
    options?: { includeK8s?: boolean }
  ): Promise<GenerationResult> {
    return this.infrastructureGenerator.generate(prompt, jobId, callbacks, options);
  }
  
  /**
   * Add infrastructure to existing project
   */
  async addInfrastructure(
    existingFiles: GeneratedFile[],
    callbacks?: StreamCallbacks,
    options?: { includeK8s?: boolean }
  ): Promise<GenerationResult> {
    return this.infrastructureGenerator.generateForExistingProject(
      existingFiles,
      undefined,
      callbacks,
      options
    );
  }
  
  /**
   * Classify a prompt without generating
   */
  classifyPrompt(prompt: string): EnhancedClassificationResult {
    return enhancedClassifyPrompt(prompt);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const enhancedUnifiedGenerator = new EnhancedUnifiedGenerator();

// Convenience exports
export const generateFromPrompt = (
  prompt: string,
  context?: EnhancedGenerationContext
) => enhancedUnifiedGenerator.generate(prompt, context);

export const classifyUserPrompt = (prompt: string) =>
  enhancedUnifiedGenerator.classifyPrompt(prompt);
