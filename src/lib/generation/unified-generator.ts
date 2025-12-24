/**
 * SMART UNIFIED GENERATOR
 * 
 * File: src/lib/generation/unified-generator.ts
 * 
 * Automatically chooses the right generation strategy:
 * - Simple prompts → Single-pass BoltGenerator (fast, 1 API call)
 * - Complex prompts → Multi-pass OrchestratedGenerator (thorough, 6 API calls)
 * 
 * This is what makes AutoForge better than competitors:
 * ONE PROMPT → COMPLETE APPLICATION (no matter how complex)
 */

import { BoltGenerator, boltGenerator } from './bolt-generator';
import { OrchestratedGenerator, orchestratedGenerator } from './orchestrated-generator';
import { PersonalToolGenerator, personalToolGenerator } from './personal-tool-generator';
import { GeneratedFile, GenerationResult, StreamCallbacks } from './bolt-generator';
import { prisma } from '../prisma';
import { dynamicModuleGenerator, DynamicModule, DynamicModuleGenerator } from './dynamic-module-generator';
import { multiAgentOrchestrator, MultiAgentResult } from './orchestrator/multi-agent-orchestrator';
import { ClassificationResult } from '@/app/api/generate/classify/route';

// ============================================================================
// COMPLEXITY DETECTION
// ============================================================================

interface ComplexityAnalysis {
  score: number;  // 0-100
  isComplex: boolean;
  reasons: string[];
}

function analyzePromptComplexity(prompt: string): ComplexityAnalysis {
  const lower = prompt.toLowerCase();
  let score = 0;
  const reasons: string[] = [];
  
  // Length-based scoring
  const wordCount = prompt.split(/\s+/).length;
  if (wordCount > 100) {
    score += 20;
    reasons.push('Long detailed prompt');
  } else if (wordCount > 50) {
    score += 10;
    reasons.push('Detailed prompt');
  }
  
  // Feature count (numbered lists, bullet points)
  const listItems = (prompt.match(/(\d+\.|[-•])\s+/g) || []).length;
  if (listItems >= 5) {
    score += 25;
    reasons.push(`${listItems} distinct features requested`);
  } else if (listItems >= 3) {
    score += 15;
    reasons.push(`${listItems} features requested`);
  }
  
  // Multi-page indicators
  const pageKeywords = ['dashboard', 'settings', 'page', 'screen', 'view', 'panel', 'section'];
  const pageMatches = pageKeywords.filter(k => lower.includes(k)).length;
  if (pageMatches >= 3) {
    score += 20;
    reasons.push('Multiple pages/views required');
  }
  
  // Integration complexity
  const integrationKeywords = [
    'api', 'webhook', 'integration', 'connect', 'sync',
    'stripe', 'payment', 'billing', 'subscription',
    'auth', 'authentication', 'login', 'signup',
    'database', 'prisma', 'storage',
    'websocket', 'real-time', 'realtime', 'live',
    'mt4', 'mt5', 'broker', 'trading',
  ];
  const integrationMatches = integrationKeywords.filter(k => lower.includes(k)).length;
  if (integrationMatches >= 4) {
    score += 25;
    reasons.push('Complex integrations required');
  } else if (integrationMatches >= 2) {
    score += 15;
    reasons.push('Multiple integrations needed');
  }
  
  // Domain complexity
  const complexDomains = [
    'saas', 'platform', 'marketplace', 'copier', 'automation',
    'crm', 'erp', 'inventory', 'booking', 'scheduling',
    'analytics', 'reporting', 'monitoring',
  ];
  const domainMatches = complexDomains.filter(k => lower.includes(k)).length;
  if (domainMatches >= 2) {
    score += 15;
    reasons.push('Complex domain requirements');
  }
  
  // Multi-user/role indicators
  const roleKeywords = ['admin', 'user', 'master', 'follower', 'subscriber', 'manager', 'team'];
  const roleMatches = roleKeywords.filter(k => lower.includes(k)).length;
  if (roleMatches >= 2) {
    score += 10;
    reasons.push('Multiple user roles');
  }
  
  // "Complete" or "full" indicators
  if (lower.includes('complete') || lower.includes('full') || lower.includes('entire')) {
    score += 10;
    reasons.push('Comprehensive application requested');
  }
  
  return {
    score: Math.min(score, 100),
    isComplex: score >= 40,
    reasons,
  };
}

// ============================================================================
// AI-POWERED CLASSIFICATION
// ============================================================================

/**
 * Call the AI classifier to determine generation mode
 * Returns classification result with confidence score
 */
async function callAIClassifier(prompt: string): Promise<ClassificationResult | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/generate/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      console.warn(`   ⚠️  AI classifier failed (${response.status}), falling back to keyword-based`);
      return null;
    }

    const data = await response.json();
    if (data.success && data.classification) {
      return data.classification;
    }

    return null;
  } catch (error) {
    console.warn('   ⚠️  AI classifier error, falling back to keyword-based:', error);
    return null;
  }
}

// ============================================================================
// UNIFIED GENERATOR
// ============================================================================

export class UnifiedGenerator {
  private boltGenerator: BoltGenerator;
  private orchestratedGenerator: OrchestratedGenerator;
  private personalToolGenerator: PersonalToolGenerator;

  constructor() {
    this.boltGenerator = boltGenerator;
    this.orchestratedGenerator = orchestratedGenerator;
    this.personalToolGenerator = personalToolGenerator;
  }

  /**
   * Generate an application - automatically chooses the right strategy
   *
   * @param prompt - User's description of what to build
   * @param mode - Generation mode: 'PERSONAL' (default) | 'SAAS' | 'AUTO'
   * @param jobId - Optional job ID for tracking
   * @param callbacks - Progress callbacks
   */
  async generate(
    prompt: string,
    mode: 'PERSONAL' | 'SINGLE_USER' | 'SAAS' | 'AUTO' = 'AUTO',
    jobId?: string,
    callbacks?: StreamCallbacks & {
      onComplexityAnalysis?: (analysis: ComplexityAnalysis) => void;
      onStrategySelected?: (strategy: 'simple' | 'orchestrated' | 'personal' | 'single-user' | 'multi-agent') => void;
      onModulesDetected?: (modules: DynamicModule[]) => void;
      onModeSelected?: (mode: 'PERSONAL' | 'SINGLE_USER' | 'SAAS') => void;
      onClassificationResult?: (result: ClassificationResult) => void;
      onPhaseStart?: (phase: string, agent: string) => void;
      onPhaseComplete?: (phase: string, duration: number) => void;
      onQualityMetrics?: (metrics: any) => void;
    }
  ): Promise<GenerationResult | MultiAgentResult> {
    // ========================================================================
    // STEP 1: MODE SELECTION (AI-Powered with Fallback)
    // ========================================================================

    let finalMode: 'PERSONAL' | 'SINGLE_USER' | 'SAAS';
    let classificationResult: ClassificationResult | null = null;

    if (mode === 'AUTO') {
      console.log(`\n🤖 AI-Powered Classification...`);
      callbacks?.onProgress?.('Analyzing prompt with AI classifier...');

      // Try AI classifier first
      classificationResult = await callAIClassifier(prompt);

      if (classificationResult) {
        finalMode = classificationResult.mode;
        console.log(`   ✓ AI Classification: ${finalMode} (${(classificationResult.confidence * 100).toFixed(0)}% confident)`);
        console.log(`   Reasoning: ${classificationResult.reasoning}`);

        if (classificationResult.promptQuality === 'MINIMAL' && classificationResult.suggestedEnhancements) {
          console.log(`   💡 Suggested Enhancements:`);
          classificationResult.suggestedEnhancements.forEach(e => console.log(`      - ${e}`));
        }

        callbacks?.onClassificationResult?.(classificationResult);
      } else {
        // Fallback to keyword-based classification
        console.log(`   ⚠️  AI classifier unavailable, using keyword-based fallback`);
        finalMode = this.determineMode(prompt);
      }
    } else {
      finalMode = mode;
    }

    console.log(`\n🎯 GENERATION MODE: ${finalMode}`);
    console.log(`   Prompt: "${prompt.slice(0, 100)}..."`);
    callbacks?.onModeSelected?.(finalMode);

    // If PERSONAL mode, use PersonalToolGenerator (skip complexity analysis and modules)
    if (finalMode === 'PERSONAL') {
      console.log(`\n🛠️  Using PERSONAL TOOL generator`);
      console.log(`   Simple browser tool - localStorage, basic code`);
      callbacks?.onStrategySelected?.('personal');
      callbacks?.onProgress?.('Generating personal tool...');

      return await this.personalToolGenerator.generate(prompt, jobId, callbacks);
    }

    // ========================================================================
    // STEP 2: SINGLE_USER or SAAS MODE - Dynamic Modules & Complexity Analysis
    // ========================================================================

    const isSingleUser = finalMode === 'SINGLE_USER';
    console.log(`\n${isSingleUser ? '👤' : '🏢'} Using ${finalMode} generator`);
    if (isSingleUser) {
      console.log(`   Production-grade app for one user - real backend/DB, no auth`);
    } else {
      console.log(`   Full multi-tenant SaaS - auth, billing, user management`);
    }

    // Generate required modules dynamically using Claude API
    callbacks?.onProgress?.('Analyzing required integrations...');
    const moduleResult = await dynamicModuleGenerator.generateModules(prompt);
    const detectedModules = moduleResult.modules;

    callbacks?.onModulesDetected?.(detectedModules);

    console.log(`\n🔍 Dynamic Module Analysis:`);
    console.log(`   ${moduleResult.summary}`);
    if (detectedModules.length > 0) {
      console.log(`   Generated modules:`);
      detectedModules.forEach(m => console.log(`     - ${m.name}: ${m.description}`));
    }

    // Enhance prompt with module requirements
    let enhancedPrompt = prompt;
    if (detectedModules.length > 0) {
      const modulesPrompt = DynamicModuleGenerator.getModulesPrompt(detectedModules);
      enhancedPrompt = `${prompt}\n\n${modulesPrompt}`;
      callbacks?.onProgress?.(`Generated ${detectedModules.length} integration modules...`);
    }

    // Analyze complexity
    const complexity = analyzePromptComplexity(prompt);
    callbacks?.onComplexityAnalysis?.(complexity);

    console.log(`\n📊 Complexity Analysis:`);
    console.log(`   Score: ${complexity.score}/100`);
    console.log(`   Complex: ${complexity.isComplex}`);
    console.log(`   Reasons: ${complexity.reasons.join(', ')}`);

    // Choose strategy
    let result: GenerationResult | MultiAgentResult;

    if (complexity.isComplex) {
      console.log(`\n🚀 Using REVOLUTIONARY MULTI-AGENT ORCHESTRATOR`);
      callbacks?.onStrategySelected?.('multi-agent');
      callbacks?.onProgress?.(`Complex application detected (score: ${complexity.score}). Activating 9 specialized AI agents...`);

      result = await multiAgentOrchestrator.generate(enhancedPrompt, jobId, {
        ...callbacks,
        onPhaseStart: callbacks?.onPhaseStart,
        onPhaseComplete: callbacks?.onPhaseComplete,
        onQualityMetrics: callbacks?.onQualityMetrics,
      });

      // Log quality metrics
      if ('qualityMetrics' in result) {
        console.log(`\n📊 QUALITY METRICS:`);
        console.log(`   Overall Score: ${result.qualityMetrics.overallScore}/100 (${result.qualityMetrics.grade})`);
        console.log(`   Test Coverage: ${result.qualityMetrics.testCoverage}%`);
        console.log(`   Accessibility: ${result.qualityMetrics.accessibilityScore}/100`);
        console.log(`   Type Safety: ${result.qualityMetrics.typeSafetyScore}/100`);
        console.log(`   Security: ${result.qualityMetrics.securityScore}/100`);
        console.log(`   Performance: ${result.qualityMetrics.performanceScore}/100`);
      }
    } else {
      console.log(`\n⚡ Using SIMPLE generation (single-pass)`);
      callbacks?.onStrategySelected?.('simple');
      callbacks?.onProgress?.('Starting single-pass generation...');

      result = await this.boltGenerator.generate(enhancedPrompt, jobId, callbacks, isSingleUser);
    }

    // Append dynamically generated module files to result
    if (detectedModules.length > 0) {
      const moduleFiles = DynamicModuleGenerator.getModuleFiles(detectedModules);
      console.log(`\n📦 Adding ${moduleFiles.length} integration files`);

      result.files.push(...moduleFiles.map(f => ({
        path: f.path,
        content: f.content,
        language: 'typescript',
      })));

      // Add module dependencies to package.json if it exists
      const packageJsonFile = result.files.find(f => f.path === 'package.json');
      if (packageJsonFile) {
        const moduleDeps = DynamicModuleGenerator.getAllDependencies(detectedModules);
        if (moduleDeps.length > 0) {
          console.log(`   Adding ${moduleDeps.length} dependencies: ${moduleDeps.join(', ')}`);

          try {
            const packageJson = JSON.parse(packageJsonFile.content);
            packageJson.dependencies = packageJson.dependencies || {};

            // Add module dependencies with latest version
            moduleDeps.forEach(dep => {
              if (!packageJson.dependencies[dep]) {
                packageJson.dependencies[dep] = 'latest';
              }
            });

            packageJsonFile.content = JSON.stringify(packageJson, null, 2);
          } catch (error) {
            console.error('   Failed to add module dependencies to package.json:', error);
          }
        }
      }

      // Log setup instructions
      const setupInstructions = DynamicModuleGenerator.getSetupInstructions(detectedModules);
      if (setupInstructions) {
        console.log(setupInstructions);
      }
    }

    return result;
  }
  
  /**
   * Force orchestrated generation regardless of complexity
   */
  async generateComplex(
    prompt: string,
    jobId?: string,
    callbacks?: StreamCallbacks
  ): Promise<GenerationResult> {
    console.log(`\n🔧 Forcing ORCHESTRATED generation`);
    callbacks?.onProgress?.('Using multi-pass orchestrated generation...');
    
    return this.orchestratedGenerator.generate(prompt, jobId, callbacks);
  }
  
  /**
   * Force simple generation regardless of complexity
   */
  async generateSimple(
    prompt: string,
    jobId?: string,
    callbacks?: StreamCallbacks
  ): Promise<GenerationResult> {
    console.log(`\n⚡ Forcing SIMPLE generation`);
    callbacks?.onProgress?.('Using single-pass generation...');

    return this.boltGenerator.generate(prompt, jobId, callbacks);
  }

  /**
   * Determine the generation mode based on prompt analysis
   *
   * PERSONAL: Simple browser tools (calculator, timer, todo)
   * - No backend needed
   * - localStorage only
   * - Basic code quality
   *
   * SINGLE_USER: Production-grade app for one user
   * - Needs backend/database (API integrations, real-time, complex logic)
   * - No multi-tenant features
   * - Industry-level code quality (tests, security, type-safety)
   *
   * SAAS: Multi-tenant platform
   * - Explicit monetization intent ("subscription", "billing", "sell")
   * - User management needs ("sign up", "user registration")
   * - Multi-user references
   *
   * Returns 'PERSONAL' | 'SINGLE_USER' | 'SAAS'
   */
  private determineMode(prompt: string): 'PERSONAL' | 'SINGLE_USER' | 'SAAS' {
    const lower = prompt.toLowerCase();

    // ========================================================================
    // STEP 1: Check for explicit SAAS indicators (monetization intent)
    // ========================================================================
    const saasKeywords = [
      'saas',
      'subscription',
      'multi-user',
      'multi-tenant',
      'sign up',
      'signup',
      'user registration',
      'user accounts',
      'billing',
      'payments',
      'stripe',
      'landing page',
      'pricing page',
      'monetize',
      'sell access',
      'sell to',
      'checkout',
    ];

    const matchedSaasKeyword = saasKeywords.find(keyword => lower.includes(keyword));
    if (matchedSaasKeyword) {
      console.log(`   ✓ SAAS keyword detected: "${matchedSaasKeyword}" → Multi-tenant platform`);
      return 'SAAS';
    }

    // ========================================================================
    // STEP 2: Check if backend/database is needed (SINGLE_USER indicators)
    // ========================================================================
    const backendIndicators = [
      // API integrations (need server-side keys)
      'api', 'integration', 'webhook', 'connect to', 'sync with',

      // Real-time features (need WebSocket server)
      'real-time', 'realtime', 'live', 'websocket', 'streaming',

      // Database requirements
      'database', 'postgres', 'supabase', 'store data', 'persist',

      // Trading/financial (needs backend)
      'trading', 'trades', 'broker', 'mt4', 'mt5', 'forex',
      'master account', 'follower account', 'copy trad',

      // Complex domains (usually need backend)
      'crm', 'erp', 'inventory', 'booking', 'scheduling',
      'automation', 'workflow', 'pipeline',

      // File processing (needs server)
      'pdf generation', 'generate pdf', 'report generation',
      'email send', 'notification', 'sms',

      // AI/ML (needs backend)
      'ai assistant', 'chatbot', 'gpt', 'claude', 'llm',
      'machine learning', 'vector database', 'embeddings',
    ];

    const matchedBackendIndicator = backendIndicators.find(indicator => lower.includes(indicator));
    if (matchedBackendIndicator) {
      console.log(`   ✓ Backend indicator detected: "${matchedBackendIndicator}" → Production-grade single-user`);
      return 'SINGLE_USER';
    }

    // Check for "account" or "user" references (even for own accounts)
    // This catches "my master account", "my follower accounts" etc.
    const accountRefs = (lower.match(/\b(account|user)s?\b/g) || []).length;
    if (accountRefs >= 3) {
      console.log(`   ✓ Multiple account references (${accountRefs}) → Production-grade single-user`);
      return 'SINGLE_USER';
    }

    // ========================================================================
    // STEP 3: Default to PERSONAL for simple tools
    // ========================================================================
    console.log(`   ✓ Simple browser tool detected → localStorage personal tool`);
    return 'PERSONAL';
  }
}

// Export singleton
export const unifiedGenerator = new UnifiedGenerator();

// Convenience function
export async function generateFromPrompt(
  prompt: string,
  jobId?: string,
  callbacks?: StreamCallbacks
): Promise<GenerationResult> {
  return unifiedGenerator.generate(prompt, jobId, callbacks);
}

// Re-export types
export type { GeneratedFile, GenerationResult, StreamCallbacks };
export type { ComplexityAnalysis };
export type { MultiAgentResult };