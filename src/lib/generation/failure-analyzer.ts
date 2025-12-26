/**
 * Failure Pattern Analyzer
 *
 * File: src/lib/generation/failure-analyzer.ts
 *
 * LAYER 4: Learns from failures and auto-updates system prompts
 */

import { prisma } from '../prisma';
import { BuildError, classifyBuildError } from './build-recovery';

/**
 * Log a generation failure for analysis
 */
export async function logGenerationFailure(params: {
  error: BuildError;
  prompt: string;
  generator: string;
  filesGenerated: number;
  recovered: boolean;
  fixApplied?: string;
  attemptsCount: number;
  userId?: string;
  jobId?: string;
}): Promise<void> {
  try {
    const classification = classifyBuildError(params.error.message);

    await prisma.generationFailure.create({
      data: {
        errorType: classification.type,
        errorMessage: params.error.message,
        errorFile: params.error.file,
        errorLine: params.error.line,
        errorCode: params.error.code,
        prompt: params.prompt,
        generator: params.generator,
        filesGenerated: params.filesGenerated,
        recovered: params.recovered,
        fixApplied: params.fixApplied,
        attemptsCount: params.attemptsCount,
        userId: params.userId,
        jobId: params.jobId,
        resolvedAt: params.recovered ? new Date() : null,
      },
    });

    console.log(`📊 Logged failure: ${classification.type} - ${params.recovered ? 'recovered' : 'unresolved'}`);
  } catch (error) {
    console.error('Failed to log generation failure:', error);
  }
}

/**
 * Analyze failure patterns and update system if needed
 */
export async function analyzeFailurePatterns(): Promise<{
  patternsFound: number;
  rulesAdded: number;
  patterns: Array<{
    type: string;
    frequency: number;
    solution: string;
  }>;
}> {
  console.log('🔍 Analyzing failure patterns...');

  // Get failures from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentFailures = await prisma.generationFailure.findMany({
    where: {
      createdAt: { gte: sevenDaysAgo },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`   Found ${recentFailures.length} failures in last 7 days`);

  // Group by error type and message patterns
  const patterns = new Map<string, {
    count: number;
    errorType: string;
    keywords: string[];
    examples: string[];
  }>();

  for (const failure of recentFailures) {
    // Extract key patterns from error message
    const key = extractErrorPattern(failure.errorMessage);

    if (!patterns.has(key)) {
      patterns.set(key, {
        count: 0,
        errorType: failure.errorType,
        keywords: extractKeywords(failure.errorMessage),
        examples: [],
      });
    }

    const pattern = patterns.get(key)!;
    pattern.count++;
    if (pattern.examples.length < 3) {
      pattern.examples.push(failure.errorMessage);
    }
  }

  // Find recurring patterns (frequency >= 5)
  const recurringPatterns = Array.from(patterns.entries())
    .filter(([_, data]) => data.count >= 5)
    .sort((a, b) => b[1].count - a[1].count);

  console.log(`   Found ${recurringPatterns.length} recurring patterns`);

  let rulesAdded = 0;

  // Check each pattern against database
  for (const [patternKey, data] of recurringPatterns) {
    // Check if pattern already exists
    const existingPattern = await prisma.failurePattern.findFirst({
      where: {
        patternType: patternKey,
      },
    });

    if (existingPattern) {
      // Update frequency
      await prisma.failurePattern.update({
        where: { id: existingPattern.id },
        data: {
          frequency: existingPattern.frequency + data.count,
          lastSeen: new Date(),
        },
      });
    } else {
      // Create new pattern with auto-generated solution
      const solution = generateSolution(data.errorType, data.keywords, data.examples);

      await prisma.failurePattern.create({
        data: {
          patternType: patternKey,
          description: data.examples[0],
          frequency: data.count,
          errorType: data.errorType,
          keywords: data.keywords,
          solution: solution,
          preventionRule: generatePreventionRule(data.errorType, data.keywords),
          addedToPrompt: false,
        },
      });

      rulesAdded++;
      console.log(`   ✅ Added new pattern: ${patternKey} (frequency: ${data.count})`);
    }
  }

  return {
    patternsFound: recurringPatterns.length,
    rulesAdded,
    patterns: recurringPatterns.map(([key, data]) => ({
      type: key,
      frequency: data.count,
      solution: generateSolution(data.errorType, data.keywords, data.examples),
    })),
  };
}

/**
 * Extract a stable pattern key from error message
 */
function extractErrorPattern(errorMessage: string): string {
  // Remove file paths, line numbers, variable names to get stable pattern
  const normalized = errorMessage
    .replace(/\/[^\s]+/g, '<path>')  // Remove paths
    .replace(/:\d+:\d+/g, '')        // Remove line:column
    .replace(/`[^`]+`/g, '<identifier>') // Remove specific identifiers
    .replace(/["'][^"']+["']/g, '<string>') // Remove string literals
    .replace(/\d+/g, '<number>')     // Remove numbers
    .toLowerCase()
    .trim();

  return normalized.slice(0, 100); // First 100 chars as pattern key
}

/**
 * Extract keywords from error message
 */
function extractKeywords(errorMessage: string): string[] {
  const keywords = new Set<string>();

  // Common error keywords
  const commonPatterns = [
    'use client',
    'metadata',
    'server component',
    'client component',
    'cannot find module',
    'type error',
    'syntax error',
    'unexpected',
    'export',
    'import',
  ];

  for (const pattern of commonPatterns) {
    if (errorMessage.toLowerCase().includes(pattern)) {
      keywords.add(pattern);
    }
  }

  return Array.from(keywords);
}

/**
 * Generate a solution based on error type and keywords
 */
function generateSolution(errorType: string, keywords: string[], examples: string[]): string {
  if (errorType === 'nextjs') {
    if (keywords.includes('use client') && keywords.includes('metadata')) {
      return 'Remove "use client" directive from files with metadata exports. Metadata can only be exported from Server Components.';
    }

    if (keywords.includes('server component') || keywords.includes('client component')) {
      return 'Separate interactive logic into client components. Keep layouts and pages as Server Components unless they need hooks or event handlers.';
    }
  }

  if (errorType === 'dependency') {
    return 'Add missing package to package.json dependencies. Run npm install to fetch it.';
  }

  if (errorType === 'typescript') {
    return 'Fix type errors by adding proper type annotations or importing missing types.';
  }

  return 'Review the error message and apply appropriate fixes based on the context.';
}

/**
 * Generate a prevention rule for system prompt
 */
function generatePreventionRule(errorType: string, keywords: string[]): string | null {
  if (errorType === 'nextjs' && keywords.includes('use client') && keywords.includes('metadata')) {
    return 'CRITICAL: Never add "use client" to files that export metadata. Layout files must always be Server Components.';
  }

  if (errorType === 'dependency') {
    return 'IMPORTANT: Always include all imported packages in package.json dependencies.';
  }

  return null;
}

/**
 * Get current failure statistics
 */
export async function getFailureStats(): Promise<{
  totalFailures: number;
  recoveryRate: number;
  byType: Record<string, number>;
  topPatterns: Array<{ type: string; frequency: number }>;
}> {
  const [total, recovered, byType, patterns] = await Promise.all([
    prisma.generationFailure.count(),
    prisma.generationFailure.count({ where: { recovered: true } }),
    prisma.generationFailure.groupBy({
      by: ['errorType'],
      _count: true,
    }),
    prisma.failurePattern.findMany({
      orderBy: { frequency: 'desc' },
      take: 10,
      select: {
        patternType: true,
        frequency: true,
      },
    }),
  ]);

  const recoveryRate = total > 0 ? (recovered / total) * 100 : 0;

  const byTypeMap: Record<string, number> = {};
  for (const item of byType) {
    byTypeMap[item.errorType] = item._count;
  }

  return {
    totalFailures: total,
    recoveryRate,
    byType: byTypeMap,
    topPatterns: patterns.map(p => ({
      type: p.patternType,
      frequency: p.frequency,
    })),
  };
}
