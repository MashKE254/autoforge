/**
 * Generation Module Exports (Enhanced)
 * 
 * File: src/lib/generation/index.ts
 * 
 * Central export for all generation functionality including
 * the new SaaS, API, and Infrastructure generators.
 * 
 * IMPORTANT: This file replaces your existing index.ts
 */

// ============================================================================
// CORE GENERATORS
// ============================================================================

// UI Application Generator (Bolt.new style)
export { BoltGenerator, boltGenerator } from './bolt-generator';
export type { GeneratedFile, GenerationResult, StreamCallbacks } from './bolt-generator';

// Workflow Automation Generator (Inngest)
export { WorkflowGenerator, workflowGenerator } from './workflow-generator';

// AI Agent Network Generator (LangGraph)
export { AgentGenerator, agentGenerator } from './agent-generator';

// ============================================================================
// NEW ENHANCED GENERATORS
// ============================================================================

// Full SaaS Application Generator (Stripe, Auth, Multi-page)
export { SaaSGenerator, saasGenerator } from './saas-generator';

// API-Only Backend Generator (Headless, RESTful)
export { APIGenerator, apiGenerator } from './api-generator';

// Infrastructure Generator (Docker, CI/CD, K8s)
export { InfrastructureGenerator, infrastructureGenerator } from './infrastructure-generator';

// ============================================================================
// UNIFIED GENERATORS
// ============================================================================

// Original Unified Generator (backward compatibility)
export { 
  UnifiedGenerator, 
  unifiedGenerator,
  generateFromPrompt as legacyGenerateFromPrompt,
  classifyUserPrompt as legacyClassifyUserPrompt,
  getGenerationType,
} from './unified-generator';
export type { UnifiedGenerationResult, GenerationContext } from './unified-generator';

// Enhanced Unified Generator (recommended)
export {
  EnhancedUnifiedGenerator,
  enhancedUnifiedGenerator,
  generateFromPrompt,
  classifyUserPrompt,
} from './enhanced-unified-generator';
export type { 
  EnhancedGenerationResult, 
  EnhancedGenerationContext 
} from './enhanced-unified-generator';

// ============================================================================
// CLASSIFIERS
// ============================================================================

// Original Prompt Classifier
export {
  classifyPrompt,
  isLikelyWorkflow,
  isLikelyAgentSystem,
} from './prompt-classifier';
export type { GenerationType, ClassificationResult } from './prompt-classifier';

// Enhanced Prompt Classifier (with SaaS, API, Infrastructure detection)
export {
  enhancedClassifyPrompt,
  SAAS_KEYWORDS,
  API_KEYWORDS,
  INFRASTRUCTURE_KEYWORDS,
} from './enhanced-prompt-classifier';
export type { 
  EnhancedGenerationType, 
  EnhancedClassificationResult 
} from './enhanced-prompt-classifier';

// ============================================================================
// PREMIUM UI PROMPT
// ============================================================================

// Industry-grade UI system prompt for professional designs
export {
  PREMIUM_UI_SYSTEM_PROMPT,
  buildPremiumUserPrompt,
} from './premium-ui-prompt';

// ============================================================================
// EXAMPLES
// ============================================================================

export {
  getAllExamples,
  getExamplesByCategory,
  getExampleById,
  getRandomExample,
  promptTemplates,
  uiExamples,
  workflowExamples,
  agentExamples,
} from './examples';
export type { GenerationExample } from './examples';

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick generation function - auto-detects type and generates
 */
export async function quickGenerate(
  prompt: string,
  options?: {
    jobId?: string;
    includeInfrastructure?: boolean;
    includeK8s?: boolean;
  }
) {
  const { enhancedUnifiedGenerator: generator } = await import('./enhanced-unified-generator');
  return generator.generate(prompt, {
    jobId: options?.jobId,
    includeInfrastructure: options?.includeInfrastructure,
    includeK8s: options?.includeK8s,
  });
}

/**
 * Generate a SaaS application
 */
export async function generateSaaS(
  prompt: string,
  options?: {
    jobId?: string;
    includeInfrastructure?: boolean;
  }
) {
  const { enhancedUnifiedGenerator: generator } = await import('./enhanced-unified-generator');
  return generator.generate(prompt, {
    jobId: options?.jobId,
    forceType: 'full-saas',
    includeInfrastructure: options?.includeInfrastructure,
  });
}

/**
 * Generate an API backend
 */
export async function generateAPI(
  prompt: string,
  options?: {
    jobId?: string;
    includeInfrastructure?: boolean;
  }
) {
  const { enhancedUnifiedGenerator: generator } = await import('./enhanced-unified-generator');
  return generator.generate(prompt, {
    jobId: options?.jobId,
    forceType: 'api-backend',
    includeInfrastructure: options?.includeInfrastructure,
  });
}

/**
 * Generate infrastructure for a project
 */
export async function generateInfra(
  prompt: string,
  options?: {
    jobId?: string;
    includeK8s?: boolean;
  }
) {
  const { enhancedUnifiedGenerator: generator } = await import('./enhanced-unified-generator');
  return generator.generate(prompt, {
    jobId: options?.jobId,
    forceType: 'infrastructure',
    includeK8s: options?.includeK8s,
  });
}

/**
 * Generate complete full-stack SaaS with infrastructure
 */
export async function generateFullStack(
  prompt: string,
  options?: {
    jobId?: string;
    includeK8s?: boolean;
  }
) {
  const { enhancedUnifiedGenerator: generator } = await import('./enhanced-unified-generator');
  return generator.generate(prompt, {
    jobId: options?.jobId,
    forceType: 'full-stack-saas',
    includeK8s: options?.includeK8s,
  });
}
