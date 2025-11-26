/**
 * Unified Generator - Routes to Appropriate Generator
 * 
 * File: src/lib/generation/unified-generator.ts
 * 
 * This is the main entry point for generation. It:
 * 1. Classifies the user's prompt
 * 2. Routes to the appropriate generator (UI, Workflow, Agent)
 * 3. Returns the generated files
 * 
 * Usage:
 *   const result = await unifiedGenerator.generate(prompt, jobId);
 */

import { prisma } from '../prisma';
import { classifyPrompt, GenerationType, ClassificationResult } from './prompt-classifier';
import { BoltGenerator, GeneratedFile, GenerationResult, StreamCallbacks } from './bolt-generator';
import { WorkflowGenerator } from './workflow-generator';
import { AgentGenerator } from './agent-generator';

// ============================================================================
// TYPES
// ============================================================================

export interface UnifiedGenerationResult extends GenerationResult {
  classificationType: GenerationType;
  classification: ClassificationResult;
}

export interface GenerationContext {
  jobId?: string;
  callbacks?: StreamCallbacks;
  forceType?: GenerationType; // Override auto-classification
}

// ============================================================================
// UNIFIED GENERATOR CLASS
// ============================================================================

export class UnifiedGenerator {
  private boltGenerator: BoltGenerator;
  private workflowGenerator: WorkflowGenerator;
  private agentGenerator: AgentGenerator;
  
  constructor() {
    this.boltGenerator = new BoltGenerator();
    this.workflowGenerator = new WorkflowGenerator();
    this.agentGenerator = new AgentGenerator();
  }
  
  /**
   * Main generation method - classifies and routes automatically
   */
  async generate(
    prompt: string,
    context: GenerationContext = {}
  ): Promise<UnifiedGenerationResult> {
    const { jobId, callbacks, forceType } = context;
    
    console.log('🎯 Unified Generator starting...');
    
    // Step 1: Classify the prompt
    callbacks?.onProgress?.('🔍 Analyzing your request...');
    const classification = classifyPrompt(prompt);
    
    console.log(`   Classification: ${classification.primaryType}`);
    console.log(`   Confidence: ${(classification.confidence * 100).toFixed(1)}%`);
    console.log(`   Reasoning: ${classification.reasoning}`);
    
    // Allow override
    const generationType = forceType || classification.primaryType;
    
    // Update job with classification info
    if (jobId) {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          // Store classification in blueprint field (JSON)
          blueprint: JSON.stringify({
            classification: generationType,
            confidence: classification.confidence,
            detectedFeatures: classification.detectedFeatures,
            suggestedTechStack: classification.suggestedTechStack,
            reasoning: classification.reasoning,
          }),
        },
      });
    }
    
    // Step 2: Route to appropriate generator
    let result: GenerationResult;
    
    switch (generationType) {
      case 'workflow-automation':
      case 'hybrid-workflow-ui':
        callbacks?.onProgress?.('🔄 Generating workflow automation system...');
        console.log('   → Routing to Workflow Generator');
        result = await this.workflowGenerator.generate(prompt, jobId, callbacks);
        break;
        
      case 'ai-agent-network':
      case 'hybrid-agent-ui':
        callbacks?.onProgress?.('🤖 Generating AI agent network...');
        console.log('   → Routing to Agent Generator');
        result = await this.agentGenerator.generate(prompt, jobId, callbacks);
        break;
        
      case 'ui-application':
      default:
        callbacks?.onProgress?.('🎨 Generating UI application...');
        console.log('   → Routing to Bolt Generator (UI)');
        result = await this.boltGenerator.generate(prompt, jobId, callbacks);
        break;
    }
    
    return {
      ...result,
      classificationType: generationType,
      classification,
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
  
  /**
   * Just classify without generating
   */
  classify(prompt: string): ClassificationResult {
    return classifyPrompt(prompt);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const unifiedGenerator = new UnifiedGenerator();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick generation - auto-classifies and generates
 */
export async function generateFromPrompt(
  prompt: string,
  jobId?: string,
  callbacks?: StreamCallbacks
): Promise<UnifiedGenerationResult> {
  return unifiedGenerator.generate(prompt, { jobId, callbacks });
}

/**
 * Classify a prompt without generating
 */
export function classifyUserPrompt(prompt: string): ClassificationResult {
  return classifyPrompt(prompt);
}

/**
 * Check what type of generation will be used
 */
export function getGenerationType(prompt: string): GenerationType {
  return classifyPrompt(prompt).primaryType;
}