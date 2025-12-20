/**
 * SECURITY AGENT
 *
 * Scans generated code for security vulnerabilities and fixes them:
 * - SQL injection vulnerabilities
 * - XSS (Cross-Site Scripting) attacks
 * - CSRF (Cross-Site Request Forgery)
 * - Authentication/authorization issues
 * - Insecure dependencies
 * - Exposed secrets and API keys
 * - Insecure data storage
 * - OWASP Top 10 compliance
 */

import Anthropic from '@anthropic-ai/sdk';
import { GeneratedFile } from '../bolt-generator';

export interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'sql-injection' | 'xss' | 'csrf' | 'auth' | 'secrets' | 'deps' | 'other';
  file: string;
  line?: number;
  description: string;
  fix: string;
  owaspCategory?: string;
}

export interface SecurityReport {
  issues: SecurityIssue[];
  score: number; // 0-100
  passesOWASP: boolean;
  fixedFiles: GeneratedFile[];
}

const SECURITY_SCAN_PROMPT = `You are a security expert specializing in OWASP Top 10 vulnerabilities.

Scan the code for security issues:

1. **SQL Injection** - Unsafe database queries
2. **XSS** - Unescaped user input in UI
3. **CSRF** - Missing CSRF tokens
4. **Broken Authentication** - Weak auth, exposed sessions
5. **Sensitive Data Exposure** - Unencrypted data, exposed secrets
6. **XML External Entities (XXE)**
7. **Broken Access Control** - Missing authorization checks
8. **Security Misconfiguration** - Default configs, verbose errors
9. **Using Components with Known Vulnerabilities**
10. **Insufficient Logging & Monitoring**

Output JSON:
{
  "issues": [
    {
      "severity": "critical",
      "type": "sql-injection",
      "file": "path/to/file.ts",
      "line": 42,
      "description": "Raw SQL query with user input",
      "fix": "Use parameterized queries or Prisma",
      "owaspCategory": "A1"
    }
  ],
  "score": 85
}`;

export class SecurityAgent {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY required');
    this.anthropic = new Anthropic({ apiKey });
  }

  async scan(files: GeneratedFile[]): Promise<SecurityReport> {
    const issues: SecurityIssue[] = [];
    const fixedFiles: GeneratedFile[] = [];

    // Scan each file
    for (const file of files) {
      if (!file.path.endsWith('.ts') && !file.path.endsWith('.tsx')) continue;

      const fileIssues = await this.scanFile(file);
      issues.push(...fileIssues);

      if (fileIssues.length > 0) {
        const fixed = await this.fixFile(file, fileIssues);
        if (fixed) fixedFiles.push(fixed);
      }
    }

    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;
    const score = Math.max(0, 100 - (criticalIssues * 20 + highIssues * 10));

    return {
      issues,
      score,
      passesOWASP: score >= 90 && criticalIssues === 0,
      fixedFiles,
    };
  }

  private async scanFile(file: GeneratedFile): Promise<SecurityIssue[]> {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `${SECURITY_SCAN_PROMPT}\n\nFile: ${file.path}\n\n\`\`\`${file.language}\n${file.content}\n\`\`\``,
          },
        ],
      });

      const response = message.content[0];
      if (response.type !== 'text') return [];

      const jsonMatch = response.text.match(/```json\n([\s\S]+?)\n```/) || response.text.match(/\{[\s\S]+\}/);
      if (!jsonMatch) return [];

      const data = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      return data.issues || [];
    } catch (error) {
      console.error(`Security scan failed for ${file.path}:`, error);
      return [];
    }
  }

  private async fixFile(file: GeneratedFile, issues: SecurityIssue[]): Promise<GeneratedFile | null> {
    try {
      const issuesDesc = issues.map((i, idx) =>
        `${idx + 1}. [${i.severity.toUpperCase()}] ${i.description}\n   Fix: ${i.fix}`
      ).join('\n\n');

      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: `Fix these security issues in the code:\n\n${issuesDesc}\n\nOriginal code:\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n\nOutput the complete fixed code.`,
          },
        ],
      });

      const response = message.content[0];
      if (response.type !== 'text') return null;

      let fixed = response.text;
      const codeMatch = fixed.match(/```(?:typescript|tsx|ts)?\n([\s\S]+?)\n```/);
      if (codeMatch) fixed = codeMatch[1];

      return { ...file, content: fixed.trim() };
    } catch (error) {
      console.error(`Security fix failed for ${file.path}:`, error);
      return null;
    }
  }
}

export const securityAgent = new SecurityAgent();
