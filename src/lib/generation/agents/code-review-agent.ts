/**
 * CODE REVIEW AGENT
 *
 * Reviews all generated code for quality, best practices, and maintainability:
 * - Code style and formatting
 * - Best practices adherence
 * - DRY violations (code duplication)
 * - Naming conventions
 * - Code complexity
 * - Documentation completeness
 * - Type safety
 */

import Anthropic from '@anthropic-ai/sdk';
import { GeneratedFile } from '../bolt-generator';

export interface CodeReviewIssue {
  severity: 'blocker' | 'critical' | 'major' | 'minor';
  category: 'style' | 'best-practice' | 'duplication' | 'complexity' | 'naming' | 'types' | 'docs';
  file: string;
  line?: number;
  description: string;
  suggestion: string;
}

export interface CodeReviewReport {
  issues: CodeReviewIssue[];
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  reviewedFiles: GeneratedFile[];
  summary: string;
}

const CODE_REVIEW_PROMPT = `You are a senior code reviewer known for high standards and constructive feedback.

Review the code for:

1. **Code Quality**
   - Clean, readable code
   - Proper naming conventions
   - No magic numbers/strings
   - Appropriate abstractions

2. **Best Practices**
   - React best practices
   - TypeScript best practices
   - Next.js best practices
   - Security best practices

3. **Maintainability**
   - DRY (Don't Repeat Yourself)
   - Single Responsibility Principle
   - Low coupling, high cohesion
   - Clear separation of concerns

4. **Type Safety**
   - No 'any' types
   - Proper type annotations
   - Type inference where appropriate

5. **Documentation**
   - Clear function/component purposes
   - Complex logic explained
   - JSDoc for public APIs

Output JSON:
{
  "issues": [
    {
      "severity": "major",
      "category": "best-practice",
      "file": "path/file.ts",
      "line": 42,
      "description": "Using useState for server data",
      "suggestion": "Use React Query or tRPC for server state"
    }
  ],
  "score": 85
}`;

export class CodeReviewAgent {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY required');
    this.anthropic = new Anthropic({ apiKey });
  }

  async review(files: GeneratedFile[]): Promise<CodeReviewReport> {
    const issues: CodeReviewIssue[] = [];
    const reviewedFiles: GeneratedFile[] = [];

    for (const file of files) {
      if (!file.path.endsWith('.ts') && !file.path.endsWith('.tsx')) continue;

      const fileIssues = await this.reviewFile(file);
      issues.push(...fileIssues);
    }

    const blockers = issues.filter(i => i.severity === 'blocker').length;
    const critical = issues.filter(i => i.severity === 'critical').length;
    const major = issues.filter(i => i.severity === 'major').length;

    const score = Math.max(0, 100 - (blockers * 25 + critical * 15 + major * 5));

    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    return {
      issues,
      score,
      grade,
      reviewedFiles: files,
      summary: `Code Review: ${grade} (${score}/100) - ${issues.length} issues found`,
    };
  }

  private async reviewFile(file: GeneratedFile): Promise<CodeReviewIssue[]> {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `${CODE_REVIEW_PROMPT}\n\nReview:\n\n\`\`\`${file.language}\n${file.content}\n\`\`\``,
          },
        ],
      });

      const response = message.content[0];
      if (response.type !== 'text') return [];

      const jsonMatch = response.text.match(/```json\n([\s\S]+?)\n```/) || response.text.match(/\{[\s\S]+\}/);
      if (!jsonMatch) return [];

      const data = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      return (data.issues || []).map((i: any) => ({ ...i, file: file.path }));
    } catch (error) {
      console.error(`Code review failed for ${file.path}:`, error);
      return [];
    }
  }
}

export const codeReviewAgent = new CodeReviewAgent();
