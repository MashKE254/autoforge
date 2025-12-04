/**
 * Enhanced Bolt Generator with Premium UI v2
 * 
 * File: src/lib/generation/bolt-generator.ts
 * 
 * This generator creates STUNNING applications that:
 * - Look better than Bolt.new, v0.dev, Lovable
 * - Are worthy of Awwwards and Dribbble features
 * - Use bold, distinctive design choices
 * - Include rich animations and micro-interactions
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
// PREMIUM GLOBALS CSS - BUILD-SAFE VERSION
// ============================================================================

const PREMIUM_GLOBALS_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --bg-primary: 9 9 11;
    --bg-secondary: 24 24 27;
    --text-primary: 250 250 250;
    --text-secondary: 161 161 170;
    --accent: 139 92 246;
  }
  
  html {
    @apply scroll-smooth antialiased;
  }
  
  body {
    @apply bg-[#09090B] text-white;
  }
  
  ::selection {
    @apply bg-violet-500/30 text-white;
  }
  
  h1, h2, h3, h4, h5, h6 {
    @apply tracking-tight font-semibold;
  }
}

/* Premium scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Component classes */
@layer components {
  .glass {
    @apply bg-white/5 backdrop-blur-xl border border-white/10;
  }
  
  .gradient-text {
    @apply bg-gradient-to-r from-violet-400 via-pink-400 to-orange-400 bg-clip-text text-transparent;
  }
  
  .btn-primary {
    @apply relative inline-flex items-center justify-center gap-2 px-6 py-3 
           font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 
           rounded-xl shadow-lg shadow-violet-500/25
           hover:from-violet-500 hover:to-indigo-500 hover:shadow-xl hover:shadow-violet-500/30
           active:scale-95 transition-all duration-200;
  }
  
  .btn-secondary {
    @apply inline-flex items-center justify-center gap-2 px-6 py-3 
           font-semibold text-white bg-white/5 border border-white/10 
           rounded-xl hover:bg-white/10 hover:border-white/20
           active:scale-95 transition-all duration-200;
  }
  
  .card {
    @apply relative bg-zinc-900 rounded-2xl border border-white/10 
           hover:border-white/20 transition-all duration-300;
  }
  
  .input {
    @apply w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
           text-white placeholder-gray-500 
           focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 
           transition-all duration-200;
  }
}

/* Animations */
@layer utilities {
  .animate-fade-in {
    animation: fadeIn 0.5s ease-out forwards;
  }
  
  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out forwards;
  }
  
  .animate-scale-in {
    animation: scaleIn 0.4s ease-out forwards;
  }
  
  .animate-blob {
    animation: blob 7s infinite;
  }
  
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
  
  .animation-delay-200 { animation-delay: 200ms; }
  .animation-delay-400 { animation-delay: 400ms; }
  .animation-delay-600 { animation-delay: 600ms; }
  .animation-delay-2000 { animation-delay: 2000ms; }
  .animation-delay-4000 { animation-delay: 4000ms; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
`;

// ============================================================================
// CSS SANITIZATION - Fixes common build errors
// ============================================================================

function sanitizeGlobalsCss(content: string): string {
  let sanitized = content;
  
  // Remove Google Fonts @import (should use next/font instead)
  sanitized = sanitized.replace(/@import\s+url\([^)]+fonts\.googleapis\.com[^)]+\);?\s*/g, '');
  
  // Fix @import statements - convert to @tailwind directives
  sanitized = sanitized.replace(/@import\s+['"]tailwindcss\/base['"];?/g, '@tailwind base;');
  sanitized = sanitized.replace(/@import\s+['"]tailwindcss\/components['"];?/g, '@tailwind components;');
  sanitized = sanitized.replace(/@import\s+['"]tailwindcss\/utilities['"];?/g, '@tailwind utilities;');
  
  // Remove ALL @apply statements with non-existent classes
  // This regex finds @apply statements and removes problematic classes
  const problematicPatterns = [
    // Custom dark classes
    /bg-dark-\d+/g,
    /text-dark-\d+/g,
    /border-dark-\d+/g,
    // shadcn/ui classes
    /border-border/g,
    /bg-background/g,
    /text-foreground/g,
    /ring-ring/g,
    /bg-card/g,
    /text-card-foreground/g,
    /bg-popover/g,
    /text-popover-foreground/g,
    /bg-primary(?![/-])/g,  // bg-primary but not bg-primary-500
    /text-primary-foreground/g,
    /bg-secondary(?![/-])/g,
    /text-secondary-foreground/g,
    /bg-muted/g,
    /text-muted-foreground/g,
    /bg-accent(?![/-])/g,
    /text-accent-foreground/g,
    /bg-destructive/g,
    /text-destructive-foreground/g,
    /border-input/g,
    // Custom color classes that don't exist
    /bg-navy-\d+/g,
    /bg-trading-\w+/g,
    /bg-forex-\w+/g,
    /text-navy-\d+/g,
  ];
  
  // Replacement map for known problematic classes
  const replacements: Record<string, string> = {
    'border-border': 'border-white/10',
    'bg-background': 'bg-zinc-950',
    'text-foreground': 'text-white',
    'ring-ring': 'ring-violet-500',
    'bg-card': 'bg-zinc-900',
    'text-card-foreground': 'text-white',
    'bg-popover': 'bg-zinc-900',
    'text-popover-foreground': 'text-white',
    'bg-muted': 'bg-zinc-800',
    'text-muted-foreground': 'text-gray-400',
    'border-input': 'border-white/10',
  };
  
  // Apply specific replacements
  for (const [problematic, safe] of Object.entries(replacements)) {
    sanitized = sanitized.replace(new RegExp(problematic, 'g'), safe);
  }
  
  // Remove lines with remaining problematic patterns
  for (const pattern of problematicPatterns) {
    // Find @apply lines with these patterns and fix them
    sanitized = sanitized.replace(
      new RegExp(`(@apply[^;]*)(${pattern.source})([^;]*);`, 'g'),
      (match, before, _problem, after) => {
        const remaining = (before + after).trim();
        if (remaining === '@apply' || remaining === '@apply ;') {
          return ''; // Remove empty @apply
        }
        return remaining + ';';
      }
    );
  }
  
  // Remove any remaining bg-dark-* classes inline
  sanitized = sanitized.replace(/bg-dark-\d+/g, 'bg-zinc-900');
  sanitized = sanitized.replace(/text-dark-\d+/g, 'text-gray-400');
  sanitized = sanitized.replace(/border-dark-\d+/g, 'border-zinc-800');
  
  // Remove any * { @apply ... } that might cause issues
  sanitized = sanitized.replace(/\*\s*\{[^}]*@apply[^}]*\}/g, '');
  
  // Ensure @tailwind directives are at the top
  const hasBase = sanitized.includes('@tailwind base');
  const hasComponents = sanitized.includes('@tailwind components');
  const hasUtilities = sanitized.includes('@tailwind utilities');
  
  if (!hasBase || !hasComponents || !hasUtilities) {
    // Remove any existing @tailwind directives
    sanitized = sanitized.replace(/@tailwind\s+(base|components|utilities);?\s*/g, '');
    // Add them at the top
    sanitized = `@tailwind base;
@tailwind components;
@tailwind utilities;

${sanitized.trim()}`;
  }
  
  // Final cleanup - remove empty @layer blocks
  sanitized = sanitized.replace(/@layer\s+(base|components|utilities)\s*\{\s*\}/g, '');
  
  return sanitized;
}

// ============================================================================
// FILE SANITIZATION - Fix all generated files
// ============================================================================

function sanitizeGeneratedFiles(files: GeneratedFile[]): GeneratedFile[] {
  return files.map(file => {
    let content = file.content;
    
    // Sanitize globals.css
    if (file.path === 'app/globals.css') {
      content = sanitizeGlobalsCss(content);
    }
    
    // Sanitize TSX/JSX files - replace problematic classes in className
    if (file.path.endsWith('.tsx') || file.path.endsWith('.jsx')) {
      // Replace custom dark classes
      content = content.replace(/bg-dark-(\d+)/g, 'bg-zinc-900');
      content = content.replace(/text-dark-(\d+)/g, 'text-gray-400');
      content = content.replace(/border-dark-(\d+)/g, 'border-zinc-800');
      
      // Replace shadcn classes
      content = content.replace(/\bborder-border\b/g, 'border-white/10');
      content = content.replace(/\bbg-background\b/g, 'bg-zinc-950');
      content = content.replace(/\btext-foreground\b/g, 'text-white');
      content = content.replace(/\bbg-card\b/g, 'bg-zinc-900');
      content = content.replace(/\bbg-muted\b/g, 'bg-zinc-800');
      content = content.replace(/\btext-muted-foreground\b/g, 'text-gray-400');
    }
    
    return { ...file, content };
  });
}

// ============================================================================
// FILE PARSER
// ============================================================================

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
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    css: 'css',
    md: 'markdown',
    html: 'html',
    mjs: 'javascript',
    prisma: 'prisma',
    yml: 'yaml',
    yaml: 'yaml',
  };
  return map[ext] || 'plaintext';
}

// ============================================================================
// ENSURE ESSENTIAL FILES
// ============================================================================

function addMissingEssentialFiles(files: GeneratedFile[], prompt: string): GeneratedFile[] {
  const fileMap = new Map(files.map(f => [f.path, f]));
  const safeTitle = prompt.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'AutoForge App';
  
  // Ensure package.json exists and has all required fields
  if (!fileMap.has('package.json')) {
    fileMap.set('package.json', {
      path: 'package.json',
      content: JSON.stringify({
        name: safeTitle.toLowerCase().replace(/\s+/g, '-'),
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint',
        },
        engines: {
          node: '18.x',
        },
        dependencies: {
          next: '14.2.5',
          react: '18.3.1',
          'react-dom': '18.3.1',
          'lucide-react': '^0.400.0',
          clsx: '^2.1.1',
          'tailwind-merge': '^2.3.0',
        },
        devDependencies: {
          typescript: '5.5.2',
          '@types/node': '20.14.2',
          '@types/react': '18.3.3',
          '@types/react-dom': '18.3.0',
          tailwindcss: '3.4.4',
          postcss: '8.4.38',
          autoprefixer: '10.4.19',
          'source-map-js': '^1.2.0',
        },
      }, null, 2),
      language: 'json',
    });
  } else {
    // Ensure existing package.json has engines field
    try {
      const existing = fileMap.get('package.json')!;
      const pkg = JSON.parse(existing.content);
      if (!pkg.engines) {
        pkg.engines = { node: '18.x' };
      }
      if (!pkg.devDependencies?.['source-map-js']) {
        pkg.devDependencies = pkg.devDependencies || {};
        pkg.devDependencies['source-map-js'] = '^1.2.0';
      }
      fileMap.set('package.json', {
        ...existing,
        content: JSON.stringify(pkg, null, 2),
      });
    } catch (e) {
      console.warn('Could not parse package.json');
    }
  }
  
  // Ensure next.config.mjs
  if (!fileMap.has('next.config.mjs') && !fileMap.has('next.config.js')) {
    fileMap.set('next.config.mjs', {
      path: 'next.config.mjs',
      content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`,
      language: 'javascript',
    });
  }
  
  // Ensure tsconfig.json
  if (!fileMap.has('tsconfig.json')) {
    fileMap.set('tsconfig.json', {
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'es5',
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
          paths: { '@/*': ['./*'] },
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules'],
      }, null, 2),
      language: 'json',
    });
  }
  
  // Ensure tailwind.config.js with premium animations
  if (!fileMap.has('tailwind.config.js') && !fileMap.has('tailwind.config.ts')) {
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
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'scale-in': 'scaleIn 0.4s ease-out forwards',
        'blob': 'blob 7s infinite',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};
`,
      language: 'javascript',
    });
  }
  
  // Ensure postcss.config.js
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
      language: 'javascript',
    });
  }
  
  // Ensure premium globals.css (with sanitization)
  if (!fileMap.has('app/globals.css')) {
    fileMap.set('app/globals.css', {
      path: 'app/globals.css',
      content: PREMIUM_GLOBALS_CSS,
      language: 'css',
    });
  } else {
    // Sanitize existing globals.css to fix common errors
    const existing = fileMap.get('app/globals.css')!;
    fileMap.set('app/globals.css', {
      ...existing,
      content: sanitizeGlobalsCss(existing.content),
    });
  }
  
  // Ensure layout.tsx
  if (!fileMap.has('app/layout.tsx')) {
    fileMap.set('app/layout.tsx', {
      path: 'app/layout.tsx',
      content: `import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

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
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
`,
      language: 'typescript',
    });
  }
  
  // CRITICAL: Ensure app/page.tsx exists
  if (!fileMap.has('app/page.tsx')) {
    console.warn('⚠️ No app/page.tsx found! Adding fallback...');
    fileMap.set('app/page.tsx', {
      path: 'app/page.tsx',
      content: `'use client';

import { Sparkles, ArrowRight, Zap, Shield, Globe } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      {/* Atmospheric background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#09090B]" />
        <div className="absolute top-0 -left-4 w-96 h-96 bg-violet-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob animation-delay-4000" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-400 mb-8 animate-fade-in">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Built with AutoForge
          </div>
          
          {/* Headline */}
          <h1 className="text-5xl sm:text-7xl font-bold mb-6 tracking-tight animate-fade-in-up">
            ${safeTitle}
            <span className="block mt-2 bg-gradient-to-r from-violet-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              Powered by AI
            </span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up animation-delay-200">
            Experience the next generation of intelligent applications, 
            crafted with precision and designed for excellence.
          </p>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-400">
            <button className="px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-200 flex items-center gap-2">
              Get Started
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-200 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why Choose Us
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Built with cutting-edge technology and designed for the future
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: 'Lightning Fast', desc: 'Optimized for speed and performance' },
              { icon: Shield, title: 'Secure by Default', desc: 'Enterprise-grade security built in' },
              { icon: Globe, title: 'Global Scale', desc: 'Deploy anywhere in the world' },
            ].map((feature, i) => (
              <div
                key={i}
                className="group relative p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300"
                style={{ animationDelay: \`\${i * 100}ms\` }}
              >
                <div className="w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
`,
      language: 'typescript',
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
    console.log('🚀 Premium UI Generation starting...');
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
      
      callbacks?.onProgress?.('Starting Premium AI generation...');
      
      // Use streaming for better timeout handling
      const stream = await this.client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        temperature: 0.7,
        system: PREMIUM_UI_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: buildPremiumUserPrompt(prompt)
        }]
      });
      
      let responseText = '';
      
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          responseText += event.delta.text;
        }
      }
      
      callbacks?.onProgress?.('Parsing generated files...');
      
      let files = parseFilesFromResponse(responseText);
      
      console.log(`   Parsed ${files.length} files from response`);
      
      // Sanitize all generated files (fix CSS issues, replace bad classes)
      files = sanitizeGeneratedFiles(files);
      
      // Add any missing essential files
      files = addMissingEssentialFiles(files, prompt);
      
      console.log('   Generated files:');
      files.forEach((f: GeneratedFile) => {
        console.log(`   - ${f.path} (${f.content.length} chars)`);
        callbacks?.onFileComplete?.(f.path, f.content);
      });
      
      // Save files to database if jobId provided
      if (jobId) {
        callbacks?.onProgress?.('Saving to database...');
        
        await prisma.$transaction([
          prisma.generatedFile.deleteMany({ where: { generationJobId: jobId } }),
          prisma.generatedFile.createMany({
            data: files.map((f: GeneratedFile) => ({
              generationJobId: jobId,
              path: f.path,
              content: f.content,
              language: f.language,
            })),
          }),
          prisma.generationJob.update({
            where: { id: jobId },
            data: { 
              status: 'COMPLETED',
              generationCompletedAt: new Date(),
            },
          }),
        ]);
      }
      
      callbacks?.onProgress?.('Generation complete!');
      
      return {
        success: true,
        files,
        tokensUsed: (await stream.finalMessage()).usage?.input_tokens,
      };
      
    } catch (error) {
      console.error('Generation failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      callbacks?.onError?.(errorMessage);
      
      if (jobId) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { 
            status: 'FAILED',
          },
        });
      }
      
      return {
        success: false,
        files: [],
        error: errorMessage,
      };
    }
  }
}

// Export singleton instance
export const boltGenerator = new BoltGenerator();