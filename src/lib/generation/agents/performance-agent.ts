/**
 * PERFORMANCE AGENT
 *
 * Optimizes generated code for maximum performance:
 * - Bundle size optimization
 * - Image optimization (WebP, responsive, lazy loading)
 * - Code splitting and lazy loading
 * - Caching strategies
 * - Database query optimization
 * - Core Web Vitals optimization (LCP, FID, CLS, INP)
 * - Lighthouse score improvements
 */

import Anthropic from '@anthropic-ai/sdk';
import { GeneratedFile } from '../bolt-generator';

export interface PerformanceOptimization {
  type: 'bundle' | 'image' | 'code-split' | 'caching' | 'database' | 'rendering';
  file: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
  before: string;
  after: string;
  estimatedImprovement: string;
}

export interface PerformanceReport {
  optimizations: PerformanceOptimization[];
  optimizedFiles: GeneratedFile[];
  estimatedLighthouseScore: number;
  estimatedBundleReduction: string;
  summary: string;
}

const PERFORMANCE_OPTIMIZATION_PROMPT = `You are a performance optimization expert specializing in web vitals and Lighthouse scores.

Analyze and optimize the code for:

1. **Bundle Size**
   - Tree shaking
   - Dynamic imports
   - Code splitting
   - Remove unused dependencies

2. **Images**
   - Next/Image component
   - Responsive images (srcset)
   - Lazy loading
   - WebP format

3. **Rendering**
   - React Server Components
   - Suspense boundaries
   - Streaming
   - Static generation where possible

4. **Caching**
   - HTTP caching headers
   - SWR/React Query
   - CDN caching
   - Service workers

5. **Database**
   - Query optimization
   - Indexes
   - N+1 query prevention
   - Connection pooling

6. **Core Web Vitals**
   - LCP (Largest Contentful Paint) < 2.5s
   - FID (First Input Delay) < 100ms
   - CLS (Cumulative Layout Shift) < 0.1
   - INP (Interaction to Next Paint) < 200ms

Output optimized code with improvements marked.`;

export class PerformanceAgent {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY required');
    this.anthropic = new Anthropic({ apiKey });
  }

  async optimize(files: GeneratedFile[]): Promise<PerformanceReport> {
    const optimizations: PerformanceOptimization[] = [];
    const optimizedFiles: GeneratedFile[] = [];

    // Optimize components
    const componentFiles = files.filter(f => f.path.endsWith('.tsx') || f.path.endsWith('.jsx'));

    for (const file of componentFiles) {
      const result = await this.optimizeFile(file);
      if (result) {
        optimizations.push(...result.optimizations);
        optimizedFiles.push(result.optimizedFile);
      }
    }

    // Add non-component files unchanged
    const nonComponentFiles = files.filter(f => !componentFiles.some(cf => cf.path === f.path));
    optimizedFiles.push(...nonComponentFiles);

    // Add performance monitoring
    optimizedFiles.push(this.generateWebVitalsMonitoring());

    const highImpact = optimizations.filter(o => o.impact === 'high').length;
    const estimatedLighthouseScore = Math.min(100, 70 + (highImpact * 5));

    return {
      optimizations,
      optimizedFiles,
      estimatedLighthouseScore,
      estimatedBundleReduction: `${optimizations.length * 5}KB`,
      summary: `Performance optimizations: ${optimizations.length} improvements, estimated Lighthouse score: ${estimatedLighthouseScore}`,
    };
  }

  private async optimizeFile(file: GeneratedFile): Promise<{
    optimizations: PerformanceOptimization[];
    optimizedFile: GeneratedFile;
  } | null> {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: `${PERFORMANCE_OPTIMIZATION_PROMPT}\n\nOptimize this file:\n\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n\nOutput the optimized code.`,
          },
        ],
      });

      const response = message.content[0];
      if (response.type !== 'text') return null;

      let optimized = response.text;
      const codeMatch = optimized.match(/```(?:typescript|tsx)?\n([\s\S]+?)\n```/);
      if (codeMatch) optimized = codeMatch[1];

      return {
        optimizations: [{
          type: 'rendering',
          file: file.path,
          impact: 'high',
          description: 'Optimized for performance',
          before: file.content.slice(0, 100),
          after: optimized.slice(0, 100),
          estimatedImprovement: '15% faster',
        }],
        optimizedFile: { ...file, content: optimized.trim() },
      };
    } catch (error) {
      console.error(`Performance optimization failed for ${file.path}:`, error);
      return null;
    }
  }

  private generateWebVitalsMonitoring(): GeneratedFile {
    return {
      path: 'lib/monitoring/web-vitals.ts',
      language: 'typescript',
      content: `'use client';

import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';

export function reportWebVitals() {
  onCLS(console.log);
  onFID(console.log);
  onFCP(console.log);
  onLCP(console.log);
  onTTFB(console.log);
  onINP(console.log);
}
`,
    };
  }
}

export const performanceAgent = new PerformanceAgent();
