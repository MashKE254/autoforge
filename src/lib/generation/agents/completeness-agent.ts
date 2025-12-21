/**
 * PRODUCTION COMPLETENESS AGENT
 *
 * Validates that generated code is 100% production-ready with:
 * - NO TODOs, placeholders, or mock data
 * - ALL edge cases handled
 * - COMPLETE feature implementations (pagination, search, filters, sorting)
 * - Proper error boundaries and loading states
 * - Real-world patterns implemented
 *
 * This is what separates AutoForge from competitors - we ensure COMPLETE apps, not prototypes.
 */

import Anthropic from '@anthropic-ai/sdk';
import { GeneratedFile } from '../bolt-generator';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// TYPES
// ============================================================================

export interface CompletenessIssue {
  file: string;
  line?: number;
  type: 'placeholder' | 'todo' | 'mock_data' | 'missing_feature' | 'incomplete_implementation' | 'missing_error_handling' | 'missing_validation';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  suggestion: string;
  codeSnippet?: string;
}

export interface CompletenessReport {
  score: number; // 0-100
  grade: 'Production Ready' | 'Needs Work' | 'Prototype Only';
  issues: CompletenessIssue[];
  summary: string;
  passesProductionStandard: boolean;
  missingPatterns: string[]; // e.g., "pagination", "search", "filters"
  fileAnalysis: {
    total: number;
    analyzed: number;
    withIssues: number;
  };
}

// ============================================================================
// PRODUCTION PATTERNS THAT MUST BE IMPLEMENTED
// ============================================================================

const REQUIRED_PRODUCTION_PATTERNS = {
  // Data fetching patterns
  pagination: {
    keywords: ['page', 'limit', 'offset', 'take', 'skip', 'cursor'],
    description: 'Pagination for large datasets',
    requiredWhen: ['table', 'list', 'grid', 'data display'],
  },

  search: {
    keywords: ['search', 'query', 'filter by text', 'ilike', 'contains'],
    description: 'Search functionality for data',
    requiredWhen: ['table', 'list', 'directory', 'catalog'],
  },

  sorting: {
    keywords: ['sort', 'order by', 'asc', 'desc', 'orderBy'],
    description: 'Sorting capabilities',
    requiredWhen: ['table', 'list'],
  },

  filtering: {
    keywords: ['filter', 'where', 'status', 'category', 'date range'],
    description: 'Filtering options',
    requiredWhen: ['table', 'list', 'dashboard'],
  },

  // UX patterns
  loadingStates: {
    keywords: ['loading', 'skeleton', 'suspense', 'isLoading', 'isPending'],
    description: 'Loading states for async operations',
    requiredWhen: ['all pages', 'all data fetching'],
  },

  emptyStates: {
    keywords: ['empty', 'no data', 'no results', 'length === 0'],
    description: 'Empty state UI',
    requiredWhen: ['all lists', 'all tables'],
  },

  errorStates: {
    keywords: ['error', 'try', 'catch', 'error.tsx', 'error boundary'],
    description: 'Error handling and error states',
    requiredWhen: ['all pages', 'all API calls'],
  },

  formValidation: {
    keywords: ['zod', 'schema', 'validate', 'errors', 'react-hook-form'],
    description: 'Form validation',
    requiredWhen: ['all forms'],
  },

  // Advanced patterns
  optimisticUpdates: {
    keywords: ['optimistic', 'useMutation', 'onMutate', 'rollback'],
    description: 'Optimistic UI updates',
    requiredWhen: ['interactive features', 'real-time feel'],
  },

  infiniteScroll: {
    keywords: ['infinite', 'useInfiniteQuery', 'fetchNextPage', 'hasNextPage'],
    description: 'Infinite scroll for long lists',
    requiredWhen: ['feeds', 'activity streams'],
  },

  debouncing: {
    keywords: ['debounce', 'useDebounce', 'setTimeout'],
    description: 'Debounced inputs (search, filters)',
    requiredWhen: ['search inputs', 'real-time filters'],
  },
};

// ============================================================================
// CRITICAL ANTI-PATTERNS (Things that indicate prototype code)
// ============================================================================

const ANTI_PATTERNS = [
  // Placeholders
  { pattern: /\/\/\s*TODO/gi, type: 'todo', severity: 'critical' as const, description: 'TODO comment found - incomplete implementation' },
  { pattern: /\/\/\s*FIXME/gi, type: 'todo', severity: 'critical' as const, description: 'FIXME comment found - known issue not addressed' },
  { pattern: /\/\/\s*HACK/gi, type: 'placeholder', severity: 'high' as const, description: 'HACK comment - non-production workaround' },
  { pattern: /\/\/\s*implement this/gi, type: 'placeholder', severity: 'critical' as const, description: 'Not implemented placeholder' },
  { pattern: /\/\/\s*replace with real/gi, type: 'mock_data', severity: 'critical' as const, description: 'Mock data placeholder' },
  { pattern: /\/\/\s*coming soon/gi, type: 'placeholder', severity: 'critical' as const, description: 'Feature marked as coming soon' },

  // Mock data
  { pattern: /const\s+\w+\s*=\s*\[\s*\{[^}]*mock[^}]*\}/gi, type: 'mock_data', severity: 'high' as const, description: 'Mock/dummy data found' },
  { pattern: /\/\/\s*mock data/gi, type: 'mock_data', severity: 'high' as const, description: 'Mock data comment' },
  { pattern: /dummy\s*data/gi, type: 'mock_data', severity: 'high' as const, description: 'Dummy data reference' },

  // Incomplete implementations
  { pattern: /throw new Error\(['"]Not implemented['"]\)/gi, type: 'incomplete_implementation', severity: 'critical' as const, description: 'Not implemented error' },
  { pattern: /return null;\s*\/\/\s*TODO/gi, type: 'incomplete_implementation', severity: 'critical' as const, description: 'Incomplete return statement' },
  { pattern: /console\.log\(['"]TODO/gi, type: 'placeholder', severity: 'medium' as const, description: 'TODO in console log' },

  // Missing error handling
  { pattern: /\.then\([^}]*\}\)(?!\s*\.catch)/gi, type: 'missing_error_handling', severity: 'high' as const, description: 'Promise without .catch()' },
  { pattern: /async function[^{]*\{(?:(?!try)[^}])*\}/gs, type: 'missing_error_handling', severity: 'medium' as const, description: 'Async function without try-catch' },

  // Type safety issues
  { pattern: /:\s*any(?!\[\])/gi, type: 'incomplete_implementation', severity: 'medium' as const, description: 'Using "any" type instead of proper typing' },
  { pattern: /@ts-ignore/gi, type: 'incomplete_implementation', severity: 'high' as const, description: 'TypeScript error suppressed with @ts-ignore' },
  { pattern: /@ts-nocheck/gi, type: 'incomplete_implementation', severity: 'critical' as const, description: 'TypeScript checking disabled' },
];

// ============================================================================
// COMPLETENESS AGENT
// ============================================================================

export class CompletenessAgent {
  /**
   * Validate generated code for production completeness
   */
  async validate(
    files: GeneratedFile[],
    callbacks?: {
      onProgress?: (message: string) => void;
      onFileAnalyzed?: (file: string, issues: number) => void;
    }
  ): Promise<CompletenessReport> {
    callbacks?.onProgress?.('🔍 Analyzing code for production completeness...');

    const issues: CompletenessIssue[] = [];
    const missingPatterns: string[] = [];
    let analyzedFiles = 0;

    // Step 1: Quick anti-pattern scan
    callbacks?.onProgress?.('  → Scanning for anti-patterns (TODOs, placeholders, mocks)...');
    for (const file of files) {
      const fileIssues = this.scanForAntiPatterns(file);
      issues.push(...fileIssues);

      if (fileIssues.length > 0) {
        callbacks?.onFileAnalyzed?.(file.path, fileIssues.length);
      }
      analyzedFiles++;
    }

    // Step 2: Check for missing production patterns
    callbacks?.onProgress?.('  → Checking for missing production patterns...');
    const patternCheck = this.checkProductionPatterns(files);
    missingPatterns.push(...patternCheck.missing);
    issues.push(...patternCheck.issues);

    // Step 3: Deep AI analysis of code quality
    callbacks?.onProgress?.('  → Running deep AI analysis of code completeness...');
    const aiIssues = await this.deepAIAnalysis(files);
    issues.push(...aiIssues);

    // Calculate score
    const score = this.calculateCompletenessScore(issues, missingPatterns, files.length);
    const grade = this.determineGrade(score);
    const passesProductionStandard = score >= 90;

    const summary = this.generateSummary(score, issues, missingPatterns);

    callbacks?.onProgress?.(`✅ Completeness analysis complete: ${score}/100 (${grade})`);

    return {
      score,
      grade,
      issues,
      summary,
      passesProductionStandard,
      missingPatterns,
      fileAnalysis: {
        total: files.length,
        analyzed: analyzedFiles,
        withIssues: issues.filter((issue, index, self) =>
          self.findIndex(i => i.file === issue.file) === index
        ).length,
      },
    };
  }

  /**
   * Scan files for anti-patterns (regex-based, fast)
   */
  private scanForAntiPatterns(file: GeneratedFile): CompletenessIssue[] {
    const issues: CompletenessIssue[] = [];
    const lines = file.content.split('\n');

    for (const antiPattern of ANTI_PATTERNS) {
      const matches = file.content.match(antiPattern.pattern);
      if (matches) {
        for (const match of matches) {
          // Find line number
          const lineIndex = lines.findIndex(line => line.includes(match));
          const line = lineIndex >= 0 ? lineIndex + 1 : undefined;

          issues.push({
            file: file.path,
            line,
            type: antiPattern.type,
            severity: antiPattern.severity,
            description: antiPattern.description,
            suggestion: this.getSuggestionForAntiPattern(antiPattern.type, match),
            codeSnippet: match,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check if required production patterns are implemented
   */
  private checkProductionPatterns(files: GeneratedFile[]): { missing: string[], issues: CompletenessIssue[] } {
    const missing: string[] = [];
    const issues: CompletenessIssue[] = [];
    const allContent = files.map(f => f.content).join('\n').toLowerCase();

    // Check if app has tables/lists (requires certain patterns)
    const hasDataDisplay = /table|list|grid|map\(.*=>/.test(allContent);
    const hasForm = /form|input|textarea|select/.test(allContent);

    if (hasDataDisplay) {
      // Check for pagination
      if (!REQUIRED_PRODUCTION_PATTERNS.pagination.keywords.some(kw => allContent.includes(kw))) {
        missing.push('pagination');
        issues.push({
          file: 'general',
          type: 'missing_feature',
          severity: 'high',
          description: 'Data tables/lists found but NO pagination implemented',
          suggestion: 'Implement pagination with page/limit parameters and pagination UI controls',
        });
      }

      // Check for search
      if (!REQUIRED_PRODUCTION_PATTERNS.search.keywords.some(kw => allContent.includes(kw))) {
        missing.push('search');
        issues.push({
          file: 'general',
          type: 'missing_feature',
          severity: 'medium',
          description: 'Data tables/lists found but NO search functionality',
          suggestion: 'Add search input with debouncing and filter data by search query',
        });
      }

      // Check for sorting
      if (!REQUIRED_PRODUCTION_PATTERNS.sorting.keywords.some(kw => allContent.includes(kw))) {
        missing.push('sorting');
        issues.push({
          file: 'general',
          type: 'missing_feature',
          severity: 'medium',
          description: 'Data tables/lists found but NO sorting capability',
          suggestion: 'Add column sorting with asc/desc toggle',
        });
      }
    }

    if (hasForm) {
      // Check for validation
      if (!REQUIRED_PRODUCTION_PATTERNS.formValidation.keywords.some(kw => allContent.includes(kw))) {
        missing.push('form_validation');
        issues.push({
          file: 'general',
          type: 'missing_validation',
          severity: 'critical',
          description: 'Forms found but NO validation implemented',
          suggestion: 'Implement Zod schemas and react-hook-form for all forms',
        });
      }
    }

    // Check for loading states (required for ALL apps)
    if (!REQUIRED_PRODUCTION_PATTERNS.loadingStates.keywords.some(kw => allContent.includes(kw))) {
      missing.push('loading_states');
      issues.push({
        file: 'general',
        type: 'missing_feature',
        severity: 'high',
        description: 'NO loading states found - poor UX during async operations',
        suggestion: 'Add loading.tsx files and loading indicators for all async operations',
      });
    }

    // Check for empty states
    if (!REQUIRED_PRODUCTION_PATTERNS.emptyStates.keywords.some(kw => allContent.includes(kw))) {
      missing.push('empty_states');
      issues.push({
        file: 'general',
        type: 'missing_feature',
        severity: 'medium',
        description: 'NO empty states found - poor UX when no data',
        suggestion: 'Add empty state UI with helpful messages and CTAs',
      });
    }

    return { missing, issues };
  }

  /**
   * Deep AI-powered analysis of code completeness
   */
  private async deepAIAnalysis(files: GeneratedFile[]): Promise<CompletenessIssue[]> {
    // Select key files for deep analysis (to save tokens)
    const keyFiles = files.filter(f =>
      f.path.includes('page.tsx') ||
      f.path.includes('route.ts') ||
      f.path.includes('action') ||
      (f.path.includes('component') && f.content.length > 500)
    ).slice(0, 10); // Analyze max 10 key files

    if (keyFiles.length === 0) return [];

    const fileSummaries = keyFiles.map(f => `
=== ${f.path} ===
${f.content.slice(0, 2000)}${f.content.length > 2000 ? '\n... (truncated)' : ''}
`).join('\n\n');

    const prompt = `You are a senior code reviewer analyzing code for PRODUCTION READINESS.

Review these generated files and identify ANY issues that make this a PROTOTYPE instead of PRODUCTION-READY code:

${fileSummaries}

Look for:
1. **Incomplete implementations** - Functions that don't do what they claim
2. **Missing edge cases** - What happens when data is empty, errors occur, network fails?
3. **Hardcoded values** - Magic numbers, hardcoded IDs, test data
4. **Missing error handling** - API calls, database queries without proper error handling
5. **Poor UX** - No loading states, no error messages, no success feedback
6. **Security issues** - Exposed secrets, missing auth checks, SQL injection risks
7. **Performance issues** - Missing indexes, N+1 queries, large payloads

Return a JSON array of issues (max 10 most critical):

[
  {
    "file": "app/dashboard/page.tsx",
    "line": 45,
    "type": "incomplete_implementation",
    "severity": "critical",
    "description": "API call has no error handling - will crash on network failure",
    "suggestion": "Wrap in try-catch and show error toast to user"
  }
]

Be HARSH. If code is truly production-ready, return an empty array. Otherwise, find the gaps.`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

      // Extract JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const issues = JSON.parse(jsonMatch[0]) as CompletenessIssue[];
        return issues;
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      // Don't fail the whole process if AI analysis fails
    }

    return [];
  }

  /**
   * Calculate completeness score (0-100)
   */
  private calculateCompletenessScore(
    issues: CompletenessIssue[],
    missingPatterns: string[],
    totalFiles: number
  ): number {
    let score = 100;

    // Deduct points for issues
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 10;
          break;
        case 'high':
          score -= 5;
          break;
        case 'medium':
          score -= 2;
          break;
        case 'low':
          score -= 1;
          break;
      }
    }

    // Deduct points for missing patterns
    score -= missingPatterns.length * 5;

    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine grade from score
   */
  private determineGrade(score: number): 'Production Ready' | 'Needs Work' | 'Prototype Only' {
    if (score >= 90) return 'Production Ready';
    if (score >= 70) return 'Needs Work';
    return 'Prototype Only';
  }

  /**
   * Generate summary report
   */
  private generateSummary(
    score: number,
    issues: CompletenessIssue[],
    missingPatterns: string[]
  ): string {
    const grade = this.determineGrade(score);

    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;

    let summary = `Code completeness: ${score}/100 (${grade})\n\n`;

    if (score >= 90) {
      summary += '✅ Code is PRODUCTION-READY with minimal issues.\n';
    } else if (score >= 70) {
      summary += '⚠️  Code needs some work before production deployment.\n';
    } else {
      summary += '❌ Code is PROTOTYPE-QUALITY and requires significant work.\n';
    }

    summary += `\nIssues found: ${issues.length} total (${criticalCount} critical, ${highCount} high priority)\n`;

    if (missingPatterns.length > 0) {
      summary += `Missing production patterns: ${missingPatterns.join(', ')}\n`;
    }

    if (criticalCount > 0) {
      summary += `\n⚠️  CRITICAL: Fix ${criticalCount} critical issues before deployment!\n`;
    }

    return summary;
  }

  /**
   * Get suggestion for anti-pattern
   */
  private getSuggestionForAntiPattern(type: string, match: string): string {
    switch (type) {
      case 'todo':
        return 'Complete the implementation - remove TODO and implement the feature fully';
      case 'placeholder':
        return 'Replace placeholder with real implementation';
      case 'mock_data':
        return 'Replace mock data with real database queries or API calls';
      case 'incomplete_implementation':
        return 'Complete the implementation - ensure all code paths are handled';
      case 'missing_error_handling':
        return 'Add try-catch blocks and proper error handling with user-friendly error messages';
      case 'missing_validation':
        return 'Add Zod schema validation and proper error messages';
      default:
        return 'Fix this issue to meet production standards';
    }
  }
}

// Export singleton
export const completenessAgent = new CompletenessAgent();
