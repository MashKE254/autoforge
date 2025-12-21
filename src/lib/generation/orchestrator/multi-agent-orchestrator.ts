/**
 * MULTI-AGENT ORCHESTRATOR
 *
 * The revolutionary system that coordinates 9 specialized AI agents working together:
 * 1. ArchitectAgent - Designs app structure
 * 2. BoltGenerator - Generates initial code (from existing system)
 * 3. TestAgent - Generates comprehensive tests
 * 4. AccessibilityAgent - Ensures WCAG 2.1 AA compliance
 * 5. TypeSafetyAgent - Adds tRPC and end-to-end type safety
 * 6. SecurityAgent - Scans and fixes vulnerabilities
 * 7. PerformanceAgent - Optimizes for speed
 * 8. CodeReviewAgent - Reviews code quality
 * 9. DocumentationAgent - Generates docs
 *
 * This is the GAME CHANGER that makes AutoForge undeniably better than competitors.
 */

import { GeneratedFile, GenerationResult, StreamCallbacks } from '../bolt-generator';
import { architectAgent, ArchitectureDesign } from '../agents/architect-agent';
import { testAgent } from '../agents/test-agent';
import { accessibilityAgent } from '../agents/accessibility-agent';
import { typeSafetyAgent } from '../agents/type-safety-agent';
import { securityAgent } from '../agents/security-agent';
import { performanceAgent } from '../agents/performance-agent';
import { codeReviewAgent } from '../agents/code-review-agent';
import { documentationAgent } from '../agents/documentation-agent';
import { completenessAgent } from '../agents/completeness-agent';
import { boltGenerator } from '../bolt-generator';

// ============================================================================
// TYPES
// ============================================================================

export interface MultiAgentResult extends GenerationResult {
  architecture?: ArchitectureDesign;
  qualityMetrics: {
    testCoverage: number;
    accessibilityScore: number;
    typeSafetyScore: number;
    securityScore: number;
    performanceScore: number;
    codeQualityScore: number;
    completenessScore: number;
    overallScore: number;
    grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    productionReady: boolean;
  };
  agentReports: {
    architecture?: string;
    testing?: string;
    accessibility?: string;
    typeSafety?: string;
    security?: string;
    performance?: string;
    codeReview?: string;
    documentation?: string;
    completeness?: string;
  };
}

export interface OrchestrationPhase {
  name: string;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: number;
  result?: any;
}

// ============================================================================
// MULTI-AGENT ORCHESTRATOR
// ============================================================================

export class MultiAgentOrchestrator {
  private phases: OrchestrationPhase[] = [];

  /**
   * Generate application using all specialized agents in coordinated phases
   */
  async generate(
    prompt: string,
    jobId?: string,
    callbacks?: StreamCallbacks & {
      onPhaseStart?: (phase: string, agent: string) => void;
      onPhaseComplete?: (phase: string, duration: number) => void;
      onQualityMetrics?: (metrics: any) => void;
    }
  ): Promise<MultiAgentResult> {
    callbacks?.onProgress?.('🚀 Initializing Multi-Agent Orchestrator...');

    this.phases = this.initializePhases();

    try {
      // ====================================================================
      // PHASE 1: ARCHITECTURE DESIGN
      // ====================================================================
      const architecture = await this.executePhase(
        'Architecture Design',
        'ArchitectAgent',
        async () => {
          callbacks?.onProgress?.('🏗️  ArchitectAgent designing application architecture...');
          return await architectAgent.design(prompt);
        },
        callbacks
      );

      callbacks?.onProgress?.(`✅ Architecture designed: ${architecture.techStack.framework} + ${architecture.techStack.database}`);

      // ====================================================================
      // PHASE 2: CODE GENERATION (Parallel)
      // ====================================================================
      callbacks?.onProgress?.('⚡ Generating initial codebase...');

      const initialCode = await this.executePhase(
        'Code Generation',
        'BoltGenerator',
        async () => {
          return await boltGenerator.generate(prompt, jobId, {
            onProgress: (msg) => callbacks?.onProgress?.(`  → ${msg}`),
          });
        },
        callbacks
      );

      if (!initialCode.success) {
        throw new Error(initialCode.error || 'Code generation failed');
      }

      callbacks?.onProgress?.(`✅ Generated ${initialCode.files.length} initial files`);

      let enhancedFiles = [...initialCode.files];

      // ====================================================================
      // PHASE 3: QUALITY ENHANCEMENT (Parallel)
      // ====================================================================
      callbacks?.onProgress?.('🔧 Running quality enhancement agents in parallel...');

      const [testResult, accessibilityResult, typeSafetyResult, securityResult, performanceResult] =
        await Promise.all([
          // Test Generation
          this.executePhase(
            'Test Generation',
            'TestAgent',
            async () => {
              callbacks?.onProgress?.('  → TestAgent generating comprehensive tests...');
              return await testAgent.generateTests(enhancedFiles, {
                onProgress: (msg) => callbacks?.onProgress?.(`    ${msg}`),
              });
            },
            callbacks
          ),

          // Accessibility Enhancement
          this.executePhase(
            'Accessibility Enhancement',
            'AccessibilityAgent',
            async () => {
              callbacks?.onProgress?.('  → AccessibilityAgent ensuring WCAG 2.1 AA...');
              return await accessibilityAgent.enhanceAccessibility(enhancedFiles, {
                onProgress: (msg) => callbacks?.onProgress?.(`    ${msg}`),
              });
            },
            callbacks
          ),

          // Type Safety Enhancement
          this.executePhase(
            'Type Safety Enhancement',
            'TypeSafetyAgent',
            async () => {
              callbacks?.onProgress?.('  → TypeSafetyAgent adding end-to-end type safety...');
              return await typeSafetyAgent.enhanceTypeSafety(enhancedFiles, {
                onProgress: (msg) => callbacks?.onProgress?.(`    ${msg}`),
              });
            },
            callbacks
          ),

          // Security Scanning
          this.executePhase(
            'Security Scanning',
            'SecurityAgent',
            async () => {
              callbacks?.onProgress?.('  → SecurityAgent scanning for vulnerabilities...');
              return await securityAgent.scan(enhancedFiles);
            },
            callbacks
          ),

          // Performance Optimization
          this.executePhase(
            'Performance Optimization',
            'PerformanceAgent',
            async () => {
              callbacks?.onProgress?.('  → PerformanceAgent optimizing for speed...');
              return await performanceAgent.optimize(enhancedFiles);
            },
            callbacks
          ),
        ]);

      // Merge all enhancements
      callbacks?.onProgress?.('🔀 Merging enhancements from all agents...');

      // Add test files
      enhancedFiles.push(...testResult.testFiles);
      callbacks?.onProgress?.(`  ✓ Added ${testResult.testFiles.length} test files`);

      // Replace with accessibility-enhanced files
      enhancedFiles = this.mergeFiles(enhancedFiles, accessibilityResult.enhancedFiles);
      callbacks?.onProgress?.(`  ✓ Enhanced ${accessibilityResult.reports.length} files for accessibility`);

      // Add type safety files (tRPC routers, Zod schemas)
      enhancedFiles.push(...typeSafetyResult.tRPCRouters);
      enhancedFiles.push(...typeSafetyResult.zodSchemas);
      enhancedFiles.push(...typeSafetyResult.configFiles);
      callbacks?.onProgress?.(`  ✓ Added ${typeSafetyResult.tRPCRouters.length} tRPC routers`);

      // Replace with security-fixed files
      if (securityResult.fixedFiles.length > 0) {
        enhancedFiles = this.mergeFiles(enhancedFiles, securityResult.fixedFiles);
        callbacks?.onProgress?.(`  ✓ Fixed ${securityResult.issues.length} security issues`);
      }

      // Replace with performance-optimized files
      enhancedFiles = this.mergeFiles(enhancedFiles, performanceResult.optimizedFiles);
      callbacks?.onProgress?.(`  ✓ Applied ${performanceResult.optimizations.length} performance optimizations`);

      // ====================================================================
      // PHASE 4: CODE REVIEW
      // ====================================================================
      const codeReview = await this.executePhase(
        'Code Review',
        'CodeReviewAgent',
        async () => {
          callbacks?.onProgress?.('📝 CodeReviewAgent reviewing code quality...');
          return await codeReviewAgent.review(enhancedFiles);
        },
        callbacks
      );

      callbacks?.onProgress?.(`✅ Code Review: ${codeReview.grade} (${codeReview.score}/100)`);

      // ====================================================================
      // PHASE 5: DOCUMENTATION
      // ====================================================================
      const docs = await this.executePhase(
        'Documentation',
        'DocumentationAgent',
        async () => {
          callbacks?.onProgress?.('📚 DocumentationAgent generating documentation...');
          return await documentationAgent.generate(enhancedFiles, architecture);
        },
        callbacks
      );

      enhancedFiles.push(...docs.files);
      callbacks?.onProgress?.(`✅ Generated ${docs.files.length} documentation files`);

      // ====================================================================
      // PHASE 6: PRODUCTION COMPLETENESS VALIDATION (THE AUTOFORGE DIFFERENCE!)
      // ====================================================================
      const completenessReport = await this.executePhase(
        'Completeness Validation',
        'CompletenessAgent',
        async () => {
          callbacks?.onProgress?.('🔍 CompletenessAgent validating production completeness...');
          callbacks?.onProgress?.('   → Scanning for TODOs, placeholders, and mock data...');
          return await completenessAgent.validate(enhancedFiles, {
            onProgress: (msg) => callbacks?.onProgress?.(`   ${msg}`),
            onFileAnalyzed: (file, issues) => {
              if (issues > 0) {
                callbacks?.onProgress?.(`   ⚠️  ${file}: ${issues} issue(s) found`);
              }
            },
          });
        },
        callbacks
      );

      callbacks?.onProgress?.(`✅ Completeness: ${completenessReport.score}/100 (${completenessReport.grade})`);

      if (!completenessReport.passesProductionStandard) {
        callbacks?.onProgress?.(`⚠️  WARNING: Code does NOT meet production standards!`);
        callbacks?.onProgress?.(`   Found ${completenessReport.issues.length} issues that need fixing`);

        // Log critical issues
        const criticalIssues = completenessReport.issues.filter(i => i.severity === 'critical');
        if (criticalIssues.length > 0) {
          callbacks?.onProgress?.(`\n   CRITICAL ISSUES:`);
          criticalIssues.slice(0, 5).forEach(issue => {
            callbacks?.onProgress?.(`   - ${issue.file}: ${issue.description}`);
          });
        }
      } else {
        callbacks?.onProgress?.(`✅ Code is PRODUCTION-READY with minimal issues`);
      }

      // ====================================================================
      // CALCULATE QUALITY METRICS
      // ====================================================================
      const qualityMetrics = this.calculateQualityMetrics({
        testCoverage: testResult.coverage.overall,
        accessibilityScore: accessibilityResult.overallScore,
        typeSafetyScore: typeSafetyResult.typeSafetyScore,
        securityScore: securityResult.score,
        performanceScore: performanceResult.estimatedLighthouseScore,
        codeQualityScore: codeReview.score,
        completenessScore: completenessReport.score,
        productionReady: completenessReport.passesProductionStandard,
      });

      callbacks?.onQualityMetrics?.(qualityMetrics);

      // ====================================================================
      // FINAL REPORT
      // ====================================================================
      callbacks?.onProgress?.('\n🎉 Multi-Agent Generation Complete!\n');
      callbacks?.onProgress?.(`📊 Quality Metrics:`);
      callbacks?.onProgress?.(`   Overall Score: ${qualityMetrics.overallScore}/100 (${qualityMetrics.grade})`);
      callbacks?.onProgress?.(`   ${qualityMetrics.productionReady ? '✅ PRODUCTION-READY' : '⚠️  NEEDS WORK BEFORE PRODUCTION'}`);
      callbacks?.onProgress?.(`\n   Individual Scores:`);
      callbacks?.onProgress?.(`   ✓ Completeness: ${qualityMetrics.completenessScore}/100 ${qualityMetrics.completenessScore >= 90 ? '✅' : '⚠️'}`);
      callbacks?.onProgress?.(`   ✓ Test Coverage: ${qualityMetrics.testCoverage}%`);
      callbacks?.onProgress?.(`   ✓ Security: ${qualityMetrics.securityScore}/100`);
      callbacks?.onProgress?.(`   ✓ Accessibility: ${qualityMetrics.accessibilityScore}/100`);
      callbacks?.onProgress?.(`   ✓ Type Safety: ${qualityMetrics.typeSafetyScore}/100`);
      callbacks?.onProgress?.(`   ✓ Performance: ${qualityMetrics.performanceScore}/100`);
      callbacks?.onProgress?.(`   ✓ Code Quality: ${qualityMetrics.codeQualityScore}/100`);
      callbacks?.onProgress?.(`\n📁 Total Files: ${enhancedFiles.length}`);

      return {
        success: true,
        files: enhancedFiles,
        tokensUsed: initialCode.tokensUsed,
        architecture,
        qualityMetrics,
        agentReports: {
          architecture: `Architecture designed with ${architecture.techStack.framework}`,
          testing: testResult.summary,
          accessibility: accessibilityResult.summary,
          typeSafety: typeSafetyResult.summary,
          security: `Security score: ${securityResult.score}/100, ${securityResult.issues.length} issues fixed`,
          performance: performanceResult.summary,
          codeReview: codeReview.summary,
          documentation: docs.summary,
          completeness: completenessReport.summary,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      callbacks?.onProgress?.(`❌ Multi-Agent generation failed: ${errorMessage}`);

      return {
        success: false,
        files: [],
        error: errorMessage,
        qualityMetrics: {
          testCoverage: 0,
          accessibilityScore: 0,
          typeSafetyScore: 0,
          securityScore: 0,
          performanceScore: 0,
          codeQualityScore: 0,
          completenessScore: 0,
          overallScore: 0,
          grade: 'F',
          productionReady: false,
        },
        agentReports: {},
      };
    }
  }

  /**
   * Execute a phase and track progress
   */
  private async executePhase<T>(
    phaseName: string,
    agentName: string,
    executor: () => Promise<T>,
    callbacks?: StreamCallbacks & {
      onPhaseStart?: (phase: string, agent: string) => void;
      onPhaseComplete?: (phase: string, duration: number) => void;
    }
  ): Promise<T> {
    const startTime = Date.now();

    const phase = this.phases.find(p => p.name === phaseName);
    if (phase) {
      phase.status = 'running';
    }

    callbacks?.onPhaseStart?.(phaseName, agentName);

    try {
      const result = await executor();

      const duration = Date.now() - startTime;

      if (phase) {
        phase.status = 'completed';
        phase.duration = duration;
        phase.result = result;
      }

      callbacks?.onPhaseComplete?.(phaseName, duration);

      return result;
    } catch (error) {
      if (phase) {
        phase.status = 'failed';
      }
      throw error;
    }
  }

  /**
   * Initialize orchestration phases
   */
  private initializePhases(): OrchestrationPhase[] {
    return [
      { name: 'Architecture Design', agent: 'ArchitectAgent', status: 'pending' },
      { name: 'Code Generation', agent: 'BoltGenerator', status: 'pending' },
      { name: 'Test Generation', agent: 'TestAgent', status: 'pending' },
      { name: 'Accessibility Enhancement', agent: 'AccessibilityAgent', status: 'pending' },
      { name: 'Type Safety Enhancement', agent: 'TypeSafetyAgent', status: 'pending' },
      { name: 'Security Scanning', agent: 'SecurityAgent', status: 'pending' },
      { name: 'Performance Optimization', agent: 'PerformanceAgent', status: 'pending' },
      { name: 'Code Review', agent: 'CodeReviewAgent', status: 'pending' },
      { name: 'Documentation', agent: 'DocumentationAgent', status: 'pending' },
    ];
  }

  /**
   * Merge enhanced files with existing files (replace by path)
   */
  private mergeFiles(existing: GeneratedFile[], updates: GeneratedFile[]): GeneratedFile[] {
    const merged = [...existing];

    for (const update of updates) {
      const index = merged.findIndex(f => f.path === update.path);
      if (index >= 0) {
        merged[index] = update;
      } else {
        merged.push(update);
      }
    }

    return merged;
  }

  /**
   * Calculate overall quality metrics
   */
  private calculateQualityMetrics(scores: {
    testCoverage: number;
    accessibilityScore: number;
    typeSafetyScore: number;
    securityScore: number;
    performanceScore: number;
    codeQualityScore: number;
    completenessScore: number;
    productionReady: boolean;
  }): MultiAgentResult['qualityMetrics'] {
    // Weighted average (completeness gets highest weight - it's the most critical!)
    const overallScore = Math.round(
      scores.completenessScore * 0.25 +  // HIGHEST WEIGHT - Completeness is critical!
      scores.testCoverage * 0.15 +
      scores.securityScore * 0.15 +
      scores.accessibilityScore * 0.12 +
      scores.typeSafetyScore * 0.12 +
      scores.performanceScore * 0.11 +
      scores.codeQualityScore * 0.10
    );

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    if (overallScore >= 95) grade = 'A+';
    else if (overallScore >= 90) grade = 'A';
    else if (overallScore >= 80) grade = 'B';
    else if (overallScore >= 70) grade = 'C';
    else if (overallScore >= 60) grade = 'D';
    else grade = 'F';

    return {
      ...scores,
      overallScore,
      grade,
    };
  }

  /**
   * Get current orchestration status
   */
  getStatus(): OrchestrationPhase[] {
    return this.phases;
  }
}

// Export singleton
export const multiAgentOrchestrator = new MultiAgentOrchestrator();
