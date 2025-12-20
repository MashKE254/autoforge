/**
 * AI DEBUGGER
 *
 * Live debugging assistant that monitors WebContainer errors and provides fixes:
 * - Monitors console errors in real-time
 * - Analyzes error stack traces
 * - Proposes fixes with explanations
 * - Applies fixes automatically
 * - Learns from successful fixes
 * - Provides proactive suggestions
 *
 * This is a GAME CHANGER - competitors leave users stranded with errors.
 * We actively help debug and fix issues in real-time.
 */

import Anthropic from '@anthropic-ai/sdk';
import { GeneratedFile } from '../bolt-generator';

// ============================================================================
// TYPES
// ============================================================================

export interface DebugError {
  type: 'runtime' | 'build' | 'type' | 'syntax' | 'network';
  message: string;
  stack?: string;
  file?: string;
  line?: number;
  column?: number;
  timestamp: number;
}

export interface DebugFix {
  confidence: 'high' | 'medium' | 'low';
  description: string;
  changes: Array<{
    file: string;
    before: string;
    after: string;
    explanation: string;
  }>;
  alternativeFixes?: string[];
}

export interface DebugSession {
  id: string;
  errors: DebugError[];
  fixes: Array<{
    error: DebugError;
    fix: DebugFix;
    applied: boolean;
    successful?: boolean;
  }>;
  startTime: number;
}

// ============================================================================
// ERROR ANALYSIS PROMPT
// ============================================================================

const ERROR_ANALYSIS_PROMPT = `You are an expert debugger specializing in Next.js, React, and TypeScript.

Analyze the error and provide a detailed fix.

## Common Error Patterns

### Type Errors
\`\`\`
Error: Property 'user' does not exist on type 'Session | null'
Fix: Add optional chaining: session?.user
Or: Add type guard: if (!session) return null;
\`\`\`

### Runtime Errors
\`\`\`
Error: Cannot read property 'map' of undefined
Fix: Add null check: data?.map() or default value: (data || []).map()
\`\`\`

### Build Errors
\`\`\`
Error: Module not found: Can't resolve '@/lib/utils'
Fix: Check tsconfig paths, ensure file exists, verify import path
\`\`\`

### Network Errors
\`\`\`
Error: fetch failed (ECONNREFUSED)
Fix: Check API endpoint, verify server is running, check CORS
\`\`\`

### React Errors
\`\`\`
Error: Hydration failed
Fix: Ensure server and client render the same content
Avoid: Browser-only APIs (localStorage, window) in SSR
\`\`\`

## Analysis Format

Provide:
1. **Root Cause**: What caused the error
2. **Fix**: Specific code changes needed
3. **Explanation**: Why this fix works
4. **Prevention**: How to avoid this in the future

Output JSON:
{
  "confidence": "high",
  "description": "Optional chaining needed for nullable session",
  "changes": [
    {
      "file": "app/dashboard/page.tsx",
      "before": "session.user.id",
      "after": "session?.user?.id",
      "explanation": "Session may be null before auth completes"
    }
  ],
  "alternativeFixes": ["Add loading state while session loads", "Redirect to login if no session"]
}`;

// ============================================================================
// AI DEBUGGER CLASS
// ============================================================================

export class AIDebugger {
  private anthropic: Anthropic;
  private sessions: Map<string, DebugSession> = new Map();

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required for AIDebugger');
    }
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Start a new debug session
   */
  startSession(id: string): DebugSession {
    const session: DebugSession = {
      id,
      errors: [],
      fixes: [],
      startTime: Date.now(),
    };

    this.sessions.set(id, session);
    return session;
  }

  /**
   * Report an error to the debugger
   */
  async reportError(
    sessionId: string,
    error: DebugError,
    files: GeneratedFile[]
  ): Promise<DebugFix | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session ${sessionId} not found`);
    }

    // Add error to session
    session.errors.push(error);

    // Analyze and propose fix
    const fix = await this.analyzeError(error, files);

    if (fix) {
      session.fixes.push({
        error,
        fix,
        applied: false,
      });
    }

    return fix;
  }

  /**
   * Analyze an error and propose a fix
   */
  private async analyzeError(
    error: DebugError,
    files: GeneratedFile[]
  ): Promise<DebugFix | null> {
    try {
      // Extract relevant context
      const errorFile = files.find(f => error.file && f.path.includes(error.file));
      const errorContext = this.extractErrorContext(error, errorFile);

      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `${ERROR_ANALYSIS_PROMPT}\n\n## ERROR\n\nType: ${error.type}\nMessage: ${error.message}\nFile: ${error.file || 'unknown'}\nLine: ${error.line || 'unknown'}\n\nStack Trace:\n${error.stack || 'No stack trace'}\n\n## CODE CONTEXT\n\n${errorContext}\n\nAnalyze this error and provide a fix.`,
          },
        ],
      });

      const response = message.content[0];
      if (response.type !== 'text') return null;

      // Parse fix from response
      const jsonMatch = response.text.match(/```json\n([\s\S]+?)\n```/) || response.text.match(/\{[\s\S]+\}/);
      if (!jsonMatch) return null;

      const fix = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      return fix;
    } catch (error) {
      console.error('Error analysis failed:', error);
      return null;
    }
  }

  /**
   * Apply a fix to the codebase
   */
  async applyFix(
    sessionId: string,
    fixIndex: number,
    files: GeneratedFile[]
  ): Promise<GeneratedFile[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session ${sessionId} not found`);
    }

    const fixEntry = session.fixes[fixIndex];
    if (!fixEntry) {
      throw new Error(`Fix ${fixIndex} not found in session`);
    }

    const { fix } = fixEntry;
    const updatedFiles = [...files];

    // Apply each change
    for (const change of fix.changes) {
      const fileIndex = updatedFiles.findIndex(f => f.path.includes(change.file));
      if (fileIndex >= 0) {
        const file = updatedFiles[fileIndex];
        const updatedContent = file.content.replace(change.before, change.after);

        updatedFiles[fileIndex] = {
          ...file,
          content: updatedContent,
        };
      }
    }

    fixEntry.applied = true;

    return updatedFiles;
  }

  /**
   * Mark a fix as successful or failed
   */
  markFixResult(sessionId: string, fixIndex: number, successful: boolean): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const fixEntry = session.fixes[fixIndex];
    if (fixEntry) {
      fixEntry.successful = successful;

      // Learn from successful fixes (future enhancement: store patterns)
      if (successful) {
        console.log('✅ Fix successful:', fixEntry.fix.description);
      } else {
        console.log('❌ Fix failed:', fixEntry.fix.description);
      }
    }
  }

  /**
   * Get proactive suggestions for preventing errors
   */
  async getProactiveSuggestions(files: GeneratedFile[]): Promise<string[]> {
    const suggestions: string[] = [];

    // Common patterns that lead to errors
    for (const file of files) {
      if (!file.path.endsWith('.tsx') && !file.path.endsWith('.ts')) continue;

      // Check for common anti-patterns
      if (file.content.includes('session.user') && !file.content.includes('session?.user')) {
        suggestions.push(`${file.path}: Consider using optional chaining for session.user`);
      }

      if (file.content.includes('.map(') && !file.content.includes('?.map(') && !file.content.includes('|| []')) {
        suggestions.push(`${file.path}: Add null checks before .map() calls`);
      }

      if (file.content.includes('localStorage') && file.path.includes('/app/')) {
        suggestions.push(`${file.path}: Avoid localStorage in Server Components`);
      }

      if (file.content.includes('any')) {
        suggestions.push(`${file.path}: Replace 'any' types with proper types`);
      }
    }

    return suggestions;
  }

  /**
   * Extract relevant code context around an error
   */
  private extractErrorContext(error: DebugError, file?: GeneratedFile): string {
    if (!file || !error.line) {
      return 'No code context available';
    }

    const lines = file.content.split('\n');
    const startLine = Math.max(0, (error.line || 0) - 5);
    const endLine = Math.min(lines.length, (error.line || 0) + 5);

    const context = lines.slice(startLine, endLine).map((line, i) => {
      const lineNum = startLine + i + 1;
      const marker = lineNum === error.line ? '→' : ' ';
      return `${marker} ${lineNum}: ${line}`;
    }).join('\n');

    return `\`\`\`${file.language}\n${context}\n\`\`\``;
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): {
    totalErrors: number;
    fixesProposed: number;
    fixesApplied: number;
    successRate: number;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        totalErrors: 0,
        fixesProposed: 0,
        fixesApplied: 0,
        successRate: 0,
      };
    }

    const fixesApplied = session.fixes.filter(f => f.applied).length;
    const successfulFixes = session.fixes.filter(f => f.successful === true).length;

    return {
      totalErrors: session.errors.length,
      fixesProposed: session.fixes.length,
      fixesApplied,
      successRate: fixesApplied > 0 ? (successfulFixes / fixesApplied) * 100 : 0,
    };
  }

  /**
   * End a debug session
   */
  endSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

// Export singleton
export const aiDebugger = new AIDebugger();
