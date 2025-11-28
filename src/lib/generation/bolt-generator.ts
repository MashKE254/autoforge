/**
 * Bolt.new-Style Single-Shot Application Generator
 * 
 * File: src/lib/generation/bolt-generator.ts
 * 
 * This replaces the complex blueprint → modules → assembly pipeline
 * with a single LLM call that generates the complete application.
 * 
 * Uses PREMIUM UI PROMPT for industry-grade designs.
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../prisma';
import { PREMIUM_UI_SYSTEM_PROMPT, buildPremiumUserPrompt } from './premium-ui-prompt';

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
  
  const safeTitle = projectName.replace(/[<>"'&]/g, '');
  
  if (!fileMap.has('package.json')) {
    fileMap.set('package.json', {
      path: 'package.json',
      content: `{
  "name": "${safeTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "typescript": "5.5.2",
    "@types/node": "20.14.2",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.0",
    "tailwindcss": "3.4.4",
    "postcss": "8.4.38",
    "autoprefixer": "10.4.19"
  }
}`,
      language: 'json'
    });
  }
  
  if (!fileMap.has('tsconfig.json')) {
    fileMap.set('tsconfig.json', {
      path: 'tsconfig.json',
      content: `{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`,
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
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'scale-in': 'scaleIn 0.4s ease-out forwards',
      },
    },
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

@layer base {
  body {
    @apply bg-gray-50 text-gray-900 antialiased;
  }
}

@layer utilities {
  .animate-fade-in {
    animation: fadeIn 0.6s ease-out forwards;
  }
  
  .animate-slide-up {
    animation: slideUp 0.6s ease-out forwards;
  }
  
  .animate-scale-in {
    animation: scaleIn 0.4s ease-out forwards;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

html {
  scroll-behavior: smooth;
}

::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, #6366f1, #a855f7);
  border-radius: 5px;
}

::selection {
  background: #c4b5fd;
  color: #1e1b4b;
}
`,
      language: 'css'
    });
  }
  
  if (!fileMap.has('app/layout.tsx')) {
    fileMap.set('app/layout.tsx', {
      path: 'app/layout.tsx',
      content: `import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '${safeTitle}',
  description: 'Built with AutoForge - AI-Powered Code Generation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
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
      
      callbacks?.onProgress?.('Starting AI generation (Premium UI)...');
      
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        temperature: 0.7,
        system: PREMIUM_UI_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: buildPremiumUserPrompt(prompt)
        }]
      });
      
      const responseText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');
      
      callbacks?.onProgress?.('Parsing generated files...');
      
      let files = parseFilesFromResponse(responseText);
      
      console.log(`   Parsed ${files.length} files from response`);
      
      // Add any missing essential files
      files = addMissingEssentialFiles(files, prompt);
      
      console.log('   Generated files:');
      files.forEach((f: GeneratedFile) => {
        console.log(`   - ${f.path} (${f.content.length} chars)`);
        callbacks?.onFileComplete?.(f.path, f.content);
      });
      
      // Save files to database if jobId provided
      if (jobId) {
        callbacks?.onProgress?.('Saving files to database...');
        
        await prisma.$transaction(
          files.map((file: GeneratedFile) =>
            prisma.generatedFile.upsert({
              where: {
                generationJobId_path: {
                  generationJobId: jobId,
                  path: file.path,
                },
              },
              update: {
                content: file.content,
                language: file.language,
                size: file.content.length,
              },
              create: {
                generationJobId: jobId,
                path: file.path,
                content: file.content,
                language: file.language,
                size: file.content.length,
              },
            })
          )
        );
        
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            generationCompletedAt: new Date(),
            totalModules: files.length,
            completedModules: files.length,
          },
        });
      }
      
      return {
        success: true,
        files,
        tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens,
      };
      
    } catch (error) {
      console.error('❌ Generation error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (jobId) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            errorLog: errorMessage,
          },
        });
      }
      
      callbacks?.onError?.(errorMessage);
      
      return {
        success: false,
        files: [],
        error: errorMessage,
      };
    }
  }
}

// Create singleton instance
export const boltGenerator = new BoltGenerator();
