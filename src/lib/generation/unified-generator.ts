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
import { GeneratedFile, GenerationResult, StreamCallbacks } from './bolt-generator';
import { prisma } from '../prisma';

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
// UNIFIED GENERATOR
// ============================================================================

export class UnifiedGenerator {
  private boltGenerator: BoltGenerator;
  private orchestratedGenerator: OrchestratedGenerator;
  
  constructor() {
    this.boltGenerator = boltGenerator;
    this.orchestratedGenerator = orchestratedGenerator;
  }
  
  /**
   * Generate an application - automatically chooses the right strategy
   */
  async generate(
    prompt: string,
    jobId?: string,
    callbacks?: StreamCallbacks & {
      onComplexityAnalysis?: (analysis: ComplexityAnalysis) => void;
      onStrategySelected?: (strategy: 'simple' | 'orchestrated') => void;
    }
  ): Promise<GenerationResult> {
    // Analyze complexity
    const complexity = analyzePromptComplexity(prompt);
    callbacks?.onComplexityAnalysis?.(complexity);
    
    console.log(`\n📊 Complexity Analysis:`);
    console.log(`   Score: ${complexity.score}/100`);
    console.log(`   Complex: ${complexity.isComplex}`);
    console.log(`   Reasons: ${complexity.reasons.join(', ')}`);
    
    // Choose strategy
    if (complexity.isComplex) {
      console.log(`\n🔧 Using ORCHESTRATED generation (multi-pass)`);
      callbacks?.onStrategySelected?.('orchestrated');
      callbacks?.onProgress?.(`Complex application detected (score: ${complexity.score}). Using multi-pass generation...`);
      
      return this.orchestratedGenerator.generate(prompt, jobId, callbacks);
    } else {
      console.log(`\n⚡ Using SIMPLE generation (single-pass)`);
      callbacks?.onStrategySelected?.('simple');
      callbacks?.onProgress?.('Starting single-pass generation...');
      
      return this.boltGenerator.generate(prompt, jobId, callbacks);
    }
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