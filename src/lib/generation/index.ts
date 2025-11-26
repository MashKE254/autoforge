/**
 * Generation Module Exports
 * 
 * File: src/lib/generation/index.ts
 * 
 * Central export for all generation functionality
 */

// Core generators
export { BoltGenerator, boltGenerator } from './bolt-generator';
export type { GeneratedFile, GenerationResult, StreamCallbacks } from './bolt-generator';

// Workflow generator
export { WorkflowGenerator, workflowGenerator } from './workflow-generator';

// Agent generator
export { AgentGenerator, agentGenerator } from './agent-generator';

// Unified generator (main entry point)
export { 
  UnifiedGenerator, 
  unifiedGenerator,
  generateFromPrompt,
  classifyUserPrompt,
  getGenerationType,
} from './unified-generator';
export type { UnifiedGenerationResult, GenerationContext } from './unified-generator';

// Prompt classifier
export {
  classifyPrompt,
  isLikelyWorkflow,
  isLikelyAgentSystem,
} from './prompt-classifier';
export type { GenerationType, ClassificationResult } from './prompt-classifier';

// Examples
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