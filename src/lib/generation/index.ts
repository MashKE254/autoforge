/**
 * Generation Module Exports
 * 
 * File: src/lib/generation/index.ts
 * 
 * AutoForge's generation system:
 * - Simple prompts → BoltGenerator (fast, single-pass)
 * - Complex prompts → OrchestratedGenerator (thorough, multi-pass)
 * - UnifiedGenerator auto-detects and chooses the right one
 */

// ============================================================================
// MAIN GENERATORS
// ============================================================================

// Bolt Generator - Single-pass for simple apps
export { BoltGenerator, boltGenerator } from './bolt-generator';

// Orchestrated Generator - Multi-pass for complex apps
export { OrchestratedGenerator, orchestratedGenerator } from './orchestrated-generator';

// Personal Tool Generator - Simple, single-user tools with localStorage
export { PersonalToolGenerator, personalToolGenerator } from './personal-tool-generator';

// SaaS Upgrade Generator - Transform personal tools → full SaaS
export { SaaSUpgradeGenerator, saasUpgradeGenerator } from './saas-upgrade-generator';

// Unified Generator - Auto-detects complexity and chooses strategy
export {
  UnifiedGenerator,
  unifiedGenerator,
  generateFromPrompt,
} from './unified-generator';

// ============================================================================
// SPECIALIZED GENERATORS
// ============================================================================

// Workflow Generator - Inngest-based workflows
export { WorkflowGenerator, workflowGenerator } from './workflow-generator';

// Agent Generator - AI agent interfaces
export { AgentGenerator, agentGenerator } from './agent-generator';

// SaaS Generator - Full SaaS applications
export { SaaSGenerator, saasGenerator } from './saas-generator';

// API Generator - Backend APIs
export { APIGenerator, apiGenerator } from './api-generator';

// Infrastructure Generator - Docker, CI/CD, K8s
export { InfrastructureGenerator, infrastructureGenerator } from './infrastructure-generator';

// ============================================================================
// PROMPTS
// ============================================================================

export { 
  PREMIUM_UI_SYSTEM_PROMPT,
  buildPremiumUserPrompt,
} from './premium-ui-prompt';

// ============================================================================
// TYPES
// ============================================================================

export type { 
  GeneratedFile, 
  GenerationResult, 
  StreamCallbacks 
} from './bolt-generator';

export type {
  ComplexityAnalysis
} from './unified-generator';

// ============================================================================
// UTILITIES
// ============================================================================

export { classifyPrompt } from './prompt-classifier';

// ============================================================================
// REVOLUTIONARY MULTI-AGENT SYSTEM 🚀
// ============================================================================

// Multi-Agent Orchestrator - 9 specialized AI agents working together
export {
  multiAgentOrchestrator,
  type MultiAgentResult,
  type OrchestrationPhase
} from './orchestrator/multi-agent-orchestrator';

// ============================================================================
// SPECIALIZED AGENTS
// ============================================================================

export { architectAgent, type ArchitectureDesign } from './agents/architect-agent';
export { testAgent, type TestGenerationResult } from './agents/test-agent';
export { accessibilityAgent, type AccessibilityResult, type AccessibilityReport } from './agents/accessibility-agent';
export { typeSafetyAgent, type TypeSafetyResult } from './agents/type-safety-agent';
export { securityAgent, type SecurityReport, type SecurityIssue } from './agents/security-agent';
export { performanceAgent, type PerformanceReport } from './agents/performance-agent';
export { codeReviewAgent, type CodeReviewReport } from './agents/code-review-agent';
export { documentationAgent, type DocumentationResult } from './agents/documentation-agent';

// ============================================================================
// AI DEBUGGER (Revolutionary Feature) 🔧
// ============================================================================

export {
  aiDebugger,
  type DebugError,
  type DebugFix,
  type DebugSession
} from './debugging/ai-debugger';

// ============================================================================
// ITERATION ENGINE (Revolutionary Feature) ⚡
// ============================================================================

export {
  iterationEngine,
  type IterationRequest,
  type IterationPlan,
  type IterationResult
} from './iteration/iteration-engine';