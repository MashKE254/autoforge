/**
 * Build Recovery System
 *
 * File: src/lib/generation/build-recovery.ts
 *
 * LAYER 3: Auto-recovery when build fails
 * Uses AI Debugger to fix errors automatically
 */

import { GeneratedFile, GenerationResult, StreamCallbacks } from './bolt-generator';
import { aiDebugger } from './debugging/ai-debugger';

export interface BuildError {
  message: string;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
  stack?: string;
}

export interface RecoveryResult {
  success: boolean;
  files: GeneratedFile[];
  attempts: number;
  errors: BuildError[];
  fixes: string[];
}

/**
 * Attempt to recover from build failures using AI
 */
export async function recoverFromBuildFailure(
  files: GeneratedFile[],
  error: BuildError,
  maxRetries: number = 3,
  callbacks?: StreamCallbacks
): Promise<RecoveryResult> {
  console.log('🔧 Build Recovery: Starting auto-fix...');

  const errors: BuildError[] = [error];
  const fixes: string[] = [];
  let currentFiles = files;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    console.log(`   Attempt ${attempt}/${maxRetries}...`);

    callbacks?.onProgress?.(`🔧 Auto-fixing build error (attempt ${attempt}/${maxRetries})...`);

    try {
      // Use AI Debugger to analyze and fix the error
      const debugSession = await aiDebugger.debug({
        error: {
          message: error.message,
          file: error.file || 'unknown',
          line: error.line,
          code: error.code,
        },
        context: currentFiles.map(f => ({
          path: f.path,
          content: f.content,
        })),
        maxAttempts: 1, // Single attempt per retry
      });

      if (debugSession.status === 'fixed' && debugSession.fixes.length > 0) {
        console.log(`   ✅ AI Debugger found ${debugSession.fixes.length} fixes`);

        // Apply fixes to files
        for (const fix of debugSession.fixes) {
          const fileIndex = currentFiles.findIndex(f => f.path === fix.file);

          if (fileIndex !== -1) {
            // Apply the fix
            currentFiles[fileIndex] = {
              ...currentFiles[fileIndex],
              content: fix.newContent,
            };

            fixes.push(`${fix.file}: ${fix.description}`);
            console.log(`     Applied fix to ${fix.file}`);
          }
        }

        // Success! Return fixed files
        return {
          success: true,
          files: currentFiles,
          attempts: attempt,
          errors,
          fixes,
        };
      } else {
        console.log(`   ❌ AI Debugger couldn't fix the issue`);
      }
    } catch (debugError) {
      console.error(`   ❌ Debug attempt failed:`, debugError);
      errors.push({
        message: debugError instanceof Error ? debugError.message : 'Debug failed',
      });
    }

    // Small delay before next retry
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // All retries exhausted
  console.log(`❌ Build Recovery: Failed after ${maxRetries} attempts`);

  return {
    success: false,
    files: currentFiles,
    attempts: maxRetries,
    errors,
    fixes,
  };
}

/**
 * Classify error type for better handling
 */
export function classifyBuildError(errorMessage: string): {
  type: 'nextjs' | 'typescript' | 'dependency' | 'syntax' | 'unknown';
  autoFixable: boolean;
  priority: 'high' | 'medium' | 'low';
} {
  const message = errorMessage.toLowerCase();

  // Next.js specific errors
  if (
    message.includes('use client') ||
    message.includes('metadata') ||
    message.includes('server component') ||
    message.includes('client component')
  ) {
    return { type: 'nextjs', autoFixable: true, priority: 'high' };
  }

  // TypeScript errors
  if (
    message.includes('type') ||
    message.includes('cannot find name') ||
    message.includes('property') ||
    message.includes('does not exist')
  ) {
    return { type: 'typescript', autoFixable: true, priority: 'medium' };
  }

  // Dependency errors
  if (
    message.includes('cannot find module') ||
    message.includes('not found') ||
    message.includes('package')
  ) {
    return { type: 'dependency', autoFixable: true, priority: 'high' };
  }

  // Syntax errors
  if (
    message.includes('syntax error') ||
    message.includes('unexpected') ||
    message.includes('expected')
  ) {
    return { type: 'syntax', autoFixable: true, priority: 'high' };
  }

  return { type: 'unknown', autoFixable: false, priority: 'low' };
}

/**
 * Check if error is worth retrying
 */
export function shouldRetry(error: BuildError): boolean {
  const classification = classifyBuildError(error.message);
  return classification.autoFixable && classification.priority !== 'low';
}
