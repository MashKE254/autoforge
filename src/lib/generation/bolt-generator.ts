/**
 * Bolt.new-Style Single-Shot Application Generator
 * 
 * File: src/lib/generation/bolt-generator.ts
 * 
 * This replaces the complex blueprint → modules → assembly pipeline
 * with a single LLM call that generates the complete application.
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../prisma';

// ============================================================================
// TYPES
// ============================================================================

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface GenerationResult {
  success: boolean;
  files: GeneratedFile[];
  error?: string;
  tokensUsed?: number;
}

export interface StreamCallbacks {
  onFileStart?: (path: string) => void;
  onFileComplete?: (path: string, content: string) => void;
  onProgress?: (message: string) => void;
  onError?: (error: string) => void;
}

// ============================================================================
// PROMPTS
// ============================================================================

const SYSTEM_PROMPT = `You are an expert full-stack developer. You generate complete, working Next.js applications.

OUTPUT FORMAT:
You MUST output files in this exact format - one file at a time:

<file path="package.json">
{
  "name": "app",
  "version": "0.1.0",
  ...
}
</file>

<file path="app/page.tsx">
'use client';
// Complete working code here
</file>

CRITICAL RULES:
1. ALWAYS include these files:
   - package.json (with all dependencies)
   - app/page.tsx (the MAIN application - fully functional)
   - app/layout.tsx (root layout)
   - app/globals.css (Tailwind directives)
   - tailwind.config.js
   - tsconfig.json
   - next.config.mjs
   - postcss.config.js

2. app/page.tsx MUST:
   - Start with 'use client' for interactivity
   - Include ALL functionality described by the user
   - Be a COMPLETE working application, not a placeholder
   - Use Tailwind CSS for styling
   - Include proper TypeScript types
   - Handle all user interactions

3. Use these exact versions in package.json:
   - "next": "14.2.5"
   - "react": "18.3.1"
   - "react-dom": "18.3.1"
   - "tailwindcss": "3.4.4"
   - "typescript": "5.5.2"

4. DO NOT:
   - Output explanations or markdown outside of file tags
   - Use placeholder comments like "// TODO" or "// Add logic here"
   - Leave any functionality incomplete
   - Use external APIs unless specifically requested`;

function buildUserPrompt(userRequest: string): string {
  return `Create a complete, working Next.js application for:

"${userRequest}"

Generate ALL necessary files. The app/page.tsx MUST contain the complete, fully functional application with all UI and logic implemented.

Start generating files now:`;
}

// ============================================================================
// FILE PARSER
// ============================================================================

/**
 * Parse the LLM output to extract files
 */
export function parseFilesFromResponse(response: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const fileRegex = /<file\s+path=["']([^"']+)["']>([\s\S]*?)<\/file>/gi;
  
  let match;
  while ((match = fileRegex.exec(response)) !== null) {
    const path = match[1].trim();
    let content = match[2];
    
    content = content
      .replace(/^\n+/, '')
      .replace(/\n+$/, '')
      .trim();
    
    const language = detectLanguage(path);
    files.push({ path, content, language });
  }
  
  return files;
}

function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'json': 'json',
    'css': 'css',
    'html': 'html',
    'md': 'markdown',
    'mjs': 'javascript',
    'cjs': 'javascript',
  };
  return languageMap[ext] || 'plaintext';
}

// ============================================================================
// VALIDATOR
// ============================================================================

export function validateGeneratedFiles(files: GeneratedFile[]): string[] {
  const requiredFiles = [
    'package.json',
    'app/page.tsx',
    'app/layout.tsx',
    'app/globals.css',
    'tailwind.config.js',
    'tsconfig.json',
    'next.config.mjs',
    'postcss.config.js',
  ];
  
  const generatedPaths = new Set(files.map((f: GeneratedFile) => f.path));
  return requiredFiles.filter((f: string) => !generatedPaths.has(f));
}

export function addMissingEssentialFiles(
  files: GeneratedFile[], 
  projectName: string
): GeneratedFile[] {
  const fileMap = new Map<string, GeneratedFile>(
    files.map((f: GeneratedFile) => [f.path, f])
  );
  
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50) || 'my-app';
  const safeTitle = projectName.slice(0, 50).replace(/'/g, "\\'");
  
  if (!fileMap.has('package.json')) {
    fileMap.set('package.json', {
      path: 'package.json',
      content: JSON.stringify({
        name: safeName,
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint'
        },
        dependencies: {
          'next': '14.2.5',
          'react': '18.3.1',
          'react-dom': '18.3.1'
        },
        devDependencies: {
          '@types/node': '20.14.0',
          '@types/react': '18.3.3',
          '@types/react-dom': '18.3.0',
          'typescript': '5.5.2',
          'tailwindcss': '3.4.4',
          'autoprefixer': '10.4.19',
          'postcss': '8.4.38'
        }
      }, null, 2),
      language: 'json'
    });
  }
  
  if (!fileMap.has('tsconfig.json')) {
    fileMap.set('tsconfig.json', {
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'ES2017',
          lib: ['dom', 'dom.iterable', 'esnext'],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'bundler',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          incremental: true,
          plugins: [{ name: 'next' }],
          paths: { '@/*': ['./*'] }
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules']
      }, null, 2),
      language: 'json'
    });
  }
  
  if (!fileMap.has('next.config.mjs')) {
    fileMap.set('next.config.mjs', {
      path: 'next.config.mjs',
      content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`,
      language: 'javascript'
    });
  }
  
  if (!fileMap.has('tailwind.config.js')) {
    fileMap.set('tailwind.config.js', {
      path: 'tailwind.config.js',
      content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
`,
      language: 'javascript'
    });
  }
  
  if (!fileMap.has('postcss.config.js')) {
    fileMap.set('postcss.config.js', {
      path: 'postcss.config.js',
      content: `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`,
      language: 'javascript'
    });
  }
  
  if (!fileMap.has('app/globals.css')) {
    fileMap.set('app/globals.css', {
      path: 'app/globals.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;
`,
      language: 'css'
    });
  }
  
  if (!fileMap.has('app/layout.tsx')) {
    fileMap.set('app/layout.tsx', {
      path: 'app/layout.tsx',
      content: `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '${safeTitle}',
  description: 'Generated application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
      language: 'typescript'
    });
  }
  
  return Array.from(fileMap.values());
}

// ============================================================================
// MAIN GENERATOR CLASS
// ============================================================================

export class BoltGenerator {
  private client: Anthropic;
  
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  
  /**
   * Generate a complete application from a user prompt
   */
  async generate(
    prompt: string, 
    jobId?: string,
    callbacks?: StreamCallbacks
  ): Promise<GenerationResult> {
    console.log('🚀 Bolt-style generation starting...');
    console.log(`   Prompt: "${prompt.slice(0, 100)}..."`);
    
    try {
      if (jobId) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { 
            status: 'RUNNING',
            generationStartedAt: new Date()
          }
        });
      }
      
      callbacks?.onProgress?.('Starting AI generation...');
      
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        temperature: 0.7,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: buildUserPrompt(prompt)
        }]
      });
      
      const responseText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');
      
      callbacks?.onProgress?.('Parsing generated files...');
      
      let files = parseFilesFromResponse(responseText);
      
      console.log(`   Parsed ${files.length} files from response`);
      
      const missing = validateGeneratedFiles(files);
      if (missing.length > 0) {
        console.log(`   Adding ${missing.length} missing essential files: ${missing.join(', ')}`);
        files = addMissingEssentialFiles(files, prompt);
      }
      
      console.log('   Generated files:');
      files.forEach((f: GeneratedFile) => {
        console.log(`   - ${f.path} (${f.content.length} chars)`);
        callbacks?.onFileComplete?.(f.path, f.content);
      });
      
      const pageTsx = files.find((f: GeneratedFile) => f.path === 'app/page.tsx');
      if (!pageTsx) {
        throw new Error('AI failed to generate app/page.tsx');
      }
      
      if (jobId) {
        callbacks?.onProgress?.('Saving files to database...');
        
        await prisma.generatedFile.deleteMany({
          where: { generationJobId: jobId }
        });
        
        for (const file of files) {
          await prisma.generatedFile.create({
            data: {
              generationJobId: jobId,
              path: file.path,
              content: file.content,
              language: file.language
            }
          });
        }
        
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            completedModules: files.length,
            totalModules: files.length,
            generationCompletedAt: new Date()
          }
        });
        
        console.log(`✅ Saved ${files.length} files to database for job ${jobId}`);
      }
      
      callbacks?.onProgress?.('Generation complete!');
      
      return {
        success: true,
        files,
        tokensUsed: response.usage?.output_tokens
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Generation error:', errorMessage);
      
      callbacks?.onError?.(errorMessage);
      
      if (jobId) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            errorLog: errorMessage
          }
        });
      }
      
      return {
        success: false,
        files: [],
        error: errorMessage
      };
    }
  }
}

// Export singleton instance
export const boltGenerator = new BoltGenerator();