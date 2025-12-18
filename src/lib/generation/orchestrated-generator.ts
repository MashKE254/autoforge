/**
 * ORCHESTRATED APPLICATION GENERATOR
 * 
 * File: src/lib/generation/orchestrated-generator.ts
 * 
 * This generator can build COMPLETE complex applications from a single prompt
 * by breaking down the work into intelligent passes:
 * 
 * Pass 1: Architecture & Planning - Analyze prompt, create file structure
 * Pass 2: Core Infrastructure - package.json, configs, layouts, types
 * Pass 3: Database & API - Prisma schema, API routes
 * Pass 4: UI Components - Reusable components library
 * Pass 5: Pages & Features - Main application pages
 * Pass 6: Integration - Connect everything, add state management
 * 
 * Each pass builds on the previous, creating a complete production app.
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
  passes?: number;
}

export interface StreamCallbacks {
  onPassStart?: (passNumber: number, passName: string) => void;
  onPassComplete?: (passNumber: number, filesGenerated: number) => void;
  onFileComplete?: (path: string, content: string) => void;
  onProgress?: (message: string) => void;
  onError?: (error: string) => void;
}

interface ArchitecturePlan {
  appName: string;
  description: string;
  features: string[];
  pages: { path: string; description: string }[];
  components: { name: string; description: string }[];
  apiRoutes: { path: string; description: string }[];
  dataModels: { name: string; fields: string[] }[];
}

// ============================================================================
// SYSTEM PROMPTS FOR EACH PASS
// ============================================================================

const ARCHITECTURE_PROMPT = `You are a WORLD-CLASS software architect designing PRODUCTION-GRADE applications that exceed bolt.new and lovable.dev quality.

AutoForge is NOT for MVPs. Design a COMPLETE, PROFESSIONAL system architecture.

CRITICAL JSON RULES:
- Return ONLY valid JSON (no markdown, no code blocks)
- NO trailing commas before ] or }
- NO comments in the JSON
- Properly escape all quotes in strings
- Use double quotes for all keys and string values

OUTPUT FORMAT (valid JSON only):
{
  "appName": "app-name-kebab-case",
  "description": "Professional one-sentence description",
  "features": ["feature1", "feature2", "feature3"],
  "pages": [
    { "path": "app/page.tsx", "description": "Landing/Dashboard" },
    { "path": "app/dashboard/page.tsx", "description": "Main dashboard with stats" },
    { "path": "app/dashboard/[resource]/page.tsx", "description": "Resource management" },
    { "path": "app/dashboard/analytics/page.tsx", "description": "Analytics dashboard" },
    { "path": "app/dashboard/settings/page.tsx", "description": "User settings" },
    { "path": "app/(auth)/sign-in/[[...sign-in]]/page.tsx", "description": "Clerk sign-in" },
    { "path": "app/(auth)/sign-up/[[...sign-up]]/page.tsx", "description": "Clerk sign-up" }
  ],
  "components": [
    { "name": "Sidebar", "description": "Navigation sidebar with active states" },
    { "name": "Header", "description": "Top bar with user menu" },
    { "name": "DataTable", "description": "Advanced table with sorting/filtering" },
    { "name": "StatsCard", "description": "Dashboard stat card" },
    { "name": "CreateForm", "description": "Create resource form with validation" },
    { "name": "EditDialog", "description": "Edit resource modal" }
  ],
  "apiRoutes": [
    { "path": "app/api/resources/route.ts", "description": "Resource CRUD with auth" },
    { "path": "app/api/resources/[id]/route.ts", "description": "Single resource operations" },
    { "path": "app/api/analytics/route.ts", "description": "Analytics data endpoint" }
  ],
  "dataModels": [
    { "name": "users", "fields": ["id uuid", "clerk_user_id text", "email text", "name text", "created_at timestamp", "updated_at timestamp"] },
    { "name": "resources", "fields": ["id uuid", "user_id uuid FK", "title text", "description text", "status text", "created_at timestamp", "updated_at timestamp"] }
  ]
}

CRITICAL REQUIREMENTS:
- Design for 30-50+ total files
- Include authentication pages (Clerk)
- Include dashboard with sidebar navigation
- Include analytics/reporting pages
- Design complete data model with relationships
- Plan for loading states, error states, empty states
- Include comprehensive component library (buttons, cards, inputs, dialogs, tables, etc.)
- API routes must have full CRUD operations
- Database must have proper relationships and indexes`;

const INFRASTRUCTURE_PROMPT = `You are a WORLD-CLASS full-stack engineer building PRODUCTION-GRADE infrastructure that exceeds bolt.new and lovable.dev quality.

AutoForge builds PROFESSIONAL, INDUSTRY-GRADE applications - NOT MVPs.

OUTPUT FORMAT - Generate files using this exact format:
<file path="package.json">
{content}
</file>

MANDATORY REQUIREMENTS:
- Complete implementations (NO TODOs, NO placeholders)
- Production-ready error handling
- Type-safe throughout (no 'any' types)
- Professional UI with animations
- Comprehensive validation
- Proper database schema
- Full authentication flow

REQUIRED FILES:
1. package.json - with ALL needed dependencies
2. tsconfig.json - TypeScript config
3. tailwind.config.js - Tailwind with custom animations
4. postcss.config.js - PostCSS config
5. next.config.mjs - Next.js config
6. app/globals.css - Global styles (use @tailwind directives, NO custom classes like bg-dark-100)
7. app/layout.tsx - Root layout with fonts
8. lib/utils.ts - Utility functions (cn helper)
9. types/index.ts - TypeScript types based on the data models

CSS RULES (CRITICAL):
- Use @tailwind base; NOT @import
- Use bg-zinc-900, bg-zinc-950, NOT bg-dark-100 or bg-background
- Use border-white/10, NOT border-border
- Use text-white, text-gray-400, NOT text-foreground
- NO Google Fonts @import in CSS (use next/font in layout.tsx)

Include these dependencies:
- next, react, react-dom
- lucide-react (icons)
- recharts (charts)
- clsx, tailwind-merge (utilities)
- date-fns (dates)
- zustand (state management)`;

const COMPONENTS_PROMPT = `You are a senior UI engineer. Generate reusable UI components for a Next.js application.

OUTPUT FORMAT:
<file path="components/ui/button.tsx">
{content}
</file>

Generate these components:
1. components/ui/button.tsx - Button variants (primary, secondary, ghost)
2. components/ui/card.tsx - Card container with header, content, footer
3. components/ui/input.tsx - Form input with label
4. components/ui/select.tsx - Select dropdown
5. components/ui/badge.tsx - Status badges
6. components/ui/table.tsx - Data table with headers and rows
7. components/ui/modal.tsx - Modal dialog
8. components/ui/tabs.tsx - Tab navigation
9. components/ui/toast.tsx - Toast notifications
10. components/sidebar.tsx - Application sidebar with navigation
11. components/header.tsx - Page header with title and actions
12. components/stats-card.tsx - Metric card with icon, value, change

STYLE RULES:
- Dark theme: bg-zinc-900, bg-zinc-800, border-white/10
- Use Tailwind classes only (no custom classes)
- Include hover, focus, disabled states
- Make components composable with className prop
- Use forwardRef for form elements
- Include TypeScript props interfaces`;

const API_ROUTES_PROMPT = `You are a senior backend engineer. Generate API routes for a Next.js application.

OUTPUT FORMAT:
<file path="app/api/accounts/route.ts">
{content}
</file>

Rules:
- Use Next.js 14 App Router conventions
- Include GET, POST, PUT, DELETE as needed
- Return proper JSON responses with status codes
- Include error handling
- Use mock data (no real database yet)
- Include TypeScript types
- Add realistic mock data that makes sense for the app

Example structure:
\`\`\`typescript
import { NextRequest, NextResponse } from 'next/server';

// Mock data
const items = [
  { id: '1', name: 'Item 1', ... },
];

export async function GET() {
  return NextResponse.json({ data: items });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // Process and return
  return NextResponse.json({ data: newItem }, { status: 201 });
}
\`\`\``;

const PAGES_PROMPT = `You are a senior frontend engineer. Generate the main pages for a Next.js application.

OUTPUT FORMAT:
<file path="app/page.tsx">
{content}
</file>

Rules:
- Use 'use client' for interactive pages
- Import and use the components from components/ui/
- Fetch data from the API routes
- Include loading and error states
- Use the sidebar + main content layout pattern
- Dark theme with zinc/violet colors
- Include realistic mock data inline as fallback
- Make pages fully functional with state management

Layout pattern:
\`\`\`tsx
'use client';

import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';

export default function PageName() {
  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header title="Page Title" />
        <div className="p-6">
          {/* Page content */}
        </div>
      </main>
    </div>
  );
}
\`\`\``;

const INTEGRATION_PROMPT = `You are a senior full-stack engineer. Generate the integration layer to connect all parts of the application.

OUTPUT FORMAT:
<file path="lib/store.ts">
{content}
</file>

Generate:
1. lib/store.ts - Zustand store for global state
2. lib/api.ts - API client functions to call the routes
3. hooks/use-data.ts - Custom hooks for data fetching
4. Any missing connection code

Rules:
- Use Zustand for state management
- Create typed API client functions
- Include loading, error, success states
- Make sure all pages can actually fetch and display data`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseFilesFromResponse(response: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const fileRegex = /<file\s+path=["']([^"']+)["']>([\s\S]*?)<\/file>/gi;
  
  let match;
  while ((match = fileRegex.exec(response)) !== null) {
    const path = match[1].trim();
    const content = match[2].replace(/^\n+/, '').replace(/\n+$/, '').trim();
    
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      json: 'json', css: 'css', md: 'markdown', prisma: 'prisma',
    };
    
    files.push({ path, content, language: langMap[ext] || 'plaintext' });
  }
  
  return files;
}

function parseArchitecturePlan(response: string): ArchitecturePlan | null {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      let jsonStr = jsonMatch[0];

      // Fix common JSON errors
      // 1. Remove trailing commas before ] or }
      jsonStr = jsonStr.replace(/,(\s*[\]}])/g, '$1');

      // 2. Fix unescaped quotes in strings (basic attempt)
      // This is tricky, but we can try to fix obvious cases

      // 3. Remove comments if any
      jsonStr = jsonStr.replace(/\/\/[^\n]*/g, '');
      jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '');

      try {
        return JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('JSON parsing failed after cleanup:', parseError);

        // Fallback: Try to extract basic structure manually
        console.warn('⚠️ Using fallback architecture plan extraction');

        // Extract appName
        const nameMatch = jsonStr.match(/"appName"\s*:\s*"([^"]+)"/);
        const descMatch = jsonStr.match(/"description"\s*:\s*"([^"]+)"/);

        if (nameMatch && descMatch) {
          return {
            appName: nameMatch[1],
            description: descMatch[1],
            features: [
              'Core functionality',
              'User management',
              'Dashboard and analytics',
              'API integrations'
            ],
            pages: [
              { path: 'app/page.tsx', description: 'Landing page' },
              { path: 'app/dashboard/page.tsx', description: 'Main dashboard' },
              { path: 'app/(auth)/sign-in/[[...sign-in]]/page.tsx', description: 'Sign in' },
              { path: 'app/(auth)/sign-up/[[...sign-up]]/page.tsx', description: 'Sign up' }
            ],
            components: [
              { name: 'Sidebar', description: 'Navigation sidebar' },
              { name: 'Header', description: 'Top bar' },
              { name: 'DataTable', description: 'Data table' },
              { name: 'StatsCard', description: 'Stats card' }
            ],
            apiRoutes: [
              { path: 'app/api/data/route.ts', description: 'Main data API' },
              { path: 'app/api/data/[id]/route.ts', description: 'Single item API' }
            ],
            dataModels: [
              { name: 'users', fields: ['id uuid', 'clerk_user_id text', 'email text', 'name text', 'created_at timestamp'] },
              { name: 'data', fields: ['id uuid', 'user_id uuid', 'title text', 'content text', 'created_at timestamp'] }
            ]
          };
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse architecture plan:', e);
  }

  // Ultimate fallback
  console.warn('⚠️ Using minimal fallback architecture plan');
  return {
    appName: 'generated-app',
    description: 'Generated application',
    features: ['Core features', 'User management', 'Data handling'],
    pages: [
      { path: 'app/page.tsx', description: 'Home page' },
      { path: 'app/dashboard/page.tsx', description: 'Dashboard' }
    ],
    components: [
      { name: 'Layout', description: 'Main layout' },
      { name: 'Navigation', description: 'Navigation' }
    ],
    apiRoutes: [
      { path: 'app/api/data/route.ts', description: 'Data API' }
    ],
    dataModels: [
      { name: 'users', fields: ['id uuid', 'email text', 'created_at timestamp'] }
    ]
  };
}

function sanitizeFiles(files: GeneratedFile[]): GeneratedFile[] {
  return files.map(file => {
    let content = file.content;
    
    // Fix CSS files
    if (file.path.endsWith('.css')) {
      // Remove Google Fonts imports
      content = content.replace(/@import\s+url\([^)]+fonts\.googleapis\.com[^)]+\);?\s*/g, '');
      
      // Fix Tailwind imports
      content = content.replace(/@import\s+['"]tailwindcss\/base['"];?/g, '@tailwind base;');
      content = content.replace(/@import\s+['"]tailwindcss\/components['"];?/g, '@tailwind components;');
      content = content.replace(/@import\s+['"]tailwindcss\/utilities['"];?/g, '@tailwind utilities;');
      
      // Replace problematic classes
      content = content.replace(/bg-dark-\d+/g, 'bg-zinc-900');
      content = content.replace(/border-border/g, 'border-white/10');
      content = content.replace(/bg-background/g, 'bg-zinc-950');
      content = content.replace(/text-foreground/g, 'text-white');
      content = content.replace(/bg-card/g, 'bg-zinc-900');
      content = content.replace(/bg-muted/g, 'bg-zinc-800');
      content = content.replace(/text-muted-foreground/g, 'text-gray-400');
    }
    
    // Fix TSX/JSX files
    if (file.path.endsWith('.tsx') || file.path.endsWith('.jsx')) {
      content = content.replace(/bg-dark-\d+/g, 'bg-zinc-900');
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

function mergeFiles(existing: GeneratedFile[], newFiles: GeneratedFile[]): GeneratedFile[] {
  const fileMap = new Map(existing.map(f => [f.path, f]));
  
  for (const file of newFiles) {
    fileMap.set(file.path, file);
  }
  
  return Array.from(fileMap.values());
}

// ============================================================================
// MAIN ORCHESTRATED GENERATOR
// ============================================================================

export class OrchestratedGenerator {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }

  /**
   * Retry API calls with exponential backoff when hitting rate limits
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    callbacks?: StreamCallbacks
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if it's a rate limit error (429)
        const isRateLimit = error?.status === 429 || error?.error?.type === 'rate_limit_error';

        if (!isRateLimit || attempt === maxRetries) {
          throw error; // Not a rate limit or out of retries
        }

        // Extract retry-after header or use exponential backoff
        const retryAfter = error?.headers?.['retry-after'] || Math.pow(2, attempt) * 10;
        const waitSeconds = typeof retryAfter === 'string' ? parseInt(retryAfter) : retryAfter;

        callbacks?.onProgress?.(
          `⏳ Rate limit hit. Waiting ${waitSeconds}s before retry (${attempt + 1}/${maxRetries})...`
        );

        await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
      }
    }

    throw lastError;
  }

  /**
   * Add delay between passes to avoid rate limits
   */
  private async delayBetweenPasses(passNumber: number, callbacks?: StreamCallbacks): Promise<void> {
    // Add 2-second delay between passes to avoid hitting rate limits
    if (passNumber > 1) {
      callbacks?.onProgress?.('⏳ Brief pause to avoid rate limits...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  /**
   * Generate a complete application from a complex prompt
   */
  async generate(
    prompt: string,
    jobId?: string,
    callbacks?: StreamCallbacks
  ): Promise<GenerationResult> {
    console.log('🚀 Orchestrated Generation starting...');
    console.log(`   Prompt: "${prompt.slice(0, 100)}..."`);
    
    let allFiles: GeneratedFile[] = [];
    let totalTokens = 0;
    
    try {
      if (jobId) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { status: 'RUNNING', generationStartedAt: new Date() }
        });
      }
      
      // ========== PASS 1: Architecture Planning ==========
      await this.delayBetweenPasses(1, callbacks);
      callbacks?.onPassStart?.(1, 'Architecture Planning');
      callbacks?.onProgress?.('Pass 1/6: Analyzing requirements and planning architecture...');

      const archResponse = await this.retryWithBackoff(
        () => this.client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000, // Reduced to stay under 8K rate limit
          temperature: 0.3,
          system: ARCHITECTURE_PROMPT,
          messages: [{ role: 'user', content: `Create an architecture plan for:\n\n${prompt}` }]
        }),
        3,
        callbacks
      );
      
      const archText = archResponse.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text).join('');
      
      const plan = parseArchitecturePlan(archText);
      if (!plan) {
        throw new Error('Failed to create architecture plan');
      }
      
      console.log('   Architecture plan created:', plan.appName);
      console.log('   - Pages:', plan.pages.length);
      console.log('   - Components:', plan.components.length);
      console.log('   - API Routes:', plan.apiRoutes.length);
      
      totalTokens += archResponse.usage?.input_tokens || 0;
      callbacks?.onPassComplete?.(1, 0);
      
      // ========== PASS 2: Infrastructure ==========
      await this.delayBetweenPasses(2, callbacks);
      callbacks?.onPassStart?.(2, 'Infrastructure');
      callbacks?.onProgress?.('Pass 2/6: Generating infrastructure (package.json, configs, types)...');

      const infraContext = `
App: ${plan.appName}
Description: ${plan.description}
Features: ${plan.features.join(', ')}
Data Models: ${plan.dataModels.map(m => `${m.name}(${m.fields.join(', ')})`).join('; ')}
`;

      const infraResponse = await this.retryWithBackoff(
        () => this.client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 6000, // Reduced from 8000 to stay under 8K rate limit
          temperature: 0.2,
          system: INFRASTRUCTURE_PROMPT,
          messages: [{ role: 'user', content: `Generate infrastructure for:\n${infraContext}` }]
        }),
        3,
        callbacks
      );
      
      const infraText = infraResponse.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text).join('');
      
      let infraFiles = parseFilesFromResponse(infraText);
      infraFiles = sanitizeFiles(infraFiles);
      allFiles = mergeFiles(allFiles, infraFiles);
      
      console.log('   Infrastructure files:', infraFiles.length);
      totalTokens += infraResponse.usage?.input_tokens || 0;
      callbacks?.onPassComplete?.(2, infraFiles.length);
      
      // ========== PASS 3: UI Components ==========
      await this.delayBetweenPasses(3, callbacks);
      callbacks?.onPassStart?.(3, 'UI Components');
      callbacks?.onProgress?.('Pass 3/6: Building reusable UI components...');

      const componentsContext = `
App: ${plan.appName}
Components needed: ${plan.components.map(c => `${c.name}: ${c.description}`).join('\n')}
`;

      const compResponse = await this.retryWithBackoff(
        () => this.client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 7000, // Reduced from 12000 to stay under 8K rate limit
          temperature: 0.3,
          system: COMPONENTS_PROMPT,
          messages: [{ role: 'user', content: `Generate UI components for:\n${componentsContext}` }]
        }),
        3,
        callbacks
      );
      
      const compText = compResponse.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text).join('');
      
      let compFiles = parseFilesFromResponse(compText);
      compFiles = sanitizeFiles(compFiles);
      allFiles = mergeFiles(allFiles, compFiles);
      
      console.log('   Component files:', compFiles.length);
      totalTokens += compResponse.usage?.input_tokens || 0;
      callbacks?.onPassComplete?.(3, compFiles.length);
      
      // ========== PASS 4: API Routes ==========
      await this.delayBetweenPasses(4, callbacks);
      callbacks?.onPassStart?.(4, 'API Routes');
      callbacks?.onProgress?.('Pass 4/6: Creating API endpoints...');

      const apiContext = `
App: ${plan.appName}
Data Models: ${JSON.stringify(plan.dataModels, null, 2)}
API Routes needed:
${plan.apiRoutes.map(r => `- ${r.path}: ${r.description}`).join('\n')}
`;

      const apiResponse = await this.retryWithBackoff(
        () => this.client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 7000, // Reduced from 10000 to stay under 8K rate limit
          temperature: 0.3,
          system: API_ROUTES_PROMPT,
          messages: [{ role: 'user', content: `Generate API routes for:\n${apiContext}` }]
        }),
        3,
        callbacks
      );
      
      const apiText = apiResponse.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text).join('');
      
      let apiFiles = parseFilesFromResponse(apiText);
      apiFiles = sanitizeFiles(apiFiles);
      allFiles = mergeFiles(allFiles, apiFiles);
      
      console.log('   API route files:', apiFiles.length);
      totalTokens += apiResponse.usage?.input_tokens || 0;
      callbacks?.onPassComplete?.(4, apiFiles.length);
      
      // ========== PASS 5: Pages ==========
      await this.delayBetweenPasses(5, callbacks);
      callbacks?.onPassStart?.(5, 'Pages');
      callbacks?.onProgress?.('Pass 5/6: Building application pages...');

      const pagesContext = `
App: ${plan.appName}
Description: ${plan.description}

Available components (import from @/components/):
${plan.components.map(c => `- ${c.name}: ${c.description}`).join('\n')}

Available API routes:
${plan.apiRoutes.map(r => `- ${r.path}: ${r.description}`).join('\n')}

Pages to generate:
${plan.pages.map(p => `- ${p.path}: ${p.description}`).join('\n')}

Features to implement:
${plan.features.join('\n')}
`;

      const pagesResponse = await this.retryWithBackoff(
        () => this.client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 7000, // Reduced from 16000 to stay under 8K rate limit
          temperature: 0.4,
          system: PAGES_PROMPT,
          messages: [{ role: 'user', content: `Generate pages for:\n${pagesContext}` }]
        }),
        3,
        callbacks
      );
      
      const pagesText = pagesResponse.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text).join('');
      
      let pagesFiles = parseFilesFromResponse(pagesText);
      pagesFiles = sanitizeFiles(pagesFiles);
      allFiles = mergeFiles(allFiles, pagesFiles);
      
      console.log('   Page files:', pagesFiles.length);
      totalTokens += pagesResponse.usage?.input_tokens || 0;
      callbacks?.onPassComplete?.(5, pagesFiles.length);
      
      // ========== PASS 6: Integration ==========
      await this.delayBetweenPasses(6, callbacks);
      callbacks?.onPassStart?.(6, 'Integration');
      callbacks?.onProgress?.('Pass 6/6: Connecting everything together...');

      const integrationContext = `
App: ${plan.appName}
Data Models: ${JSON.stringify(plan.dataModels, null, 2)}
API Routes: ${plan.apiRoutes.map(r => r.path).join(', ')}
Pages: ${plan.pages.map(p => p.path).join(', ')}
`;

      const intResponse = await this.retryWithBackoff(
        () => this.client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 5000, // Reduced from 6000 to stay under 8K rate limit
          temperature: 0.3,
          system: INTEGRATION_PROMPT,
          messages: [{ role: 'user', content: `Generate integration layer for:\n${integrationContext}` }]
        }),
        3,
        callbacks
      );
      
      const intText = intResponse.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text).join('');
      
      let intFiles = parseFilesFromResponse(intText);
      intFiles = sanitizeFiles(intFiles);
      allFiles = mergeFiles(allFiles, intFiles);
      
      console.log('   Integration files:', intFiles.length);
      totalTokens += intResponse.usage?.input_tokens || 0;
      callbacks?.onPassComplete?.(6, intFiles.length);
      
      // ========== FINALIZE ==========
      callbacks?.onProgress?.('Finalizing application...');
      
      // Ensure essential files exist
      allFiles = this.ensureEssentialFiles(allFiles, plan.appName);
      
      console.log(`\n✅ Generation complete!`);
      console.log(`   Total files: ${allFiles.length}`);
      console.log(`   Total tokens: ${totalTokens}`);
      
      // Save to database
      if (jobId) {
        await prisma.$transaction([
          prisma.generatedFile.deleteMany({ where: { generationJobId: jobId } }),
          prisma.generatedFile.createMany({
            data: allFiles.map(f => ({
              generationJobId: jobId,
              path: f.path,
              content: f.content,
              language: f.language,
            })),
          }),
          prisma.generationJob.update({
            where: { id: jobId },
            data: { status: 'COMPLETED', generationCompletedAt: new Date() },
          }),
        ]);
      }
      
      return {
        success: true,
        files: allFiles,
        tokensUsed: totalTokens,
        passes: 6,
      };
      
    } catch (error) {
      console.error('Orchestrated generation failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      callbacks?.onError?.(errorMessage);
      
      if (jobId) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { status: 'FAILED', errorLog: errorMessage },
        });
      }
      
      return { success: false, files: [], error: errorMessage };
    }
  }
  
  private ensureEssentialFiles(files: GeneratedFile[], appName: string): GeneratedFile[] {
    const fileMap = new Map(files.map(f => [f.path, f]));
    
    // Ensure package.json has engines
    if (fileMap.has('package.json')) {
      try {
        const pkg = JSON.parse(fileMap.get('package.json')!.content);
        pkg.engines = { node: '18.x' };
        fileMap.set('package.json', {
          path: 'package.json',
          content: JSON.stringify(pkg, null, 2),
          language: 'json',
        });
      } catch (e) {}
    }
    
    // Ensure globals.css is safe
    if (!fileMap.has('app/globals.css')) {
      fileMap.set('app/globals.css', {
        path: 'app/globals.css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-zinc-950 text-white antialiased;
  }
}`,
        language: 'css',
      });
    }
    
    // Ensure layout.tsx exists
    if (!fileMap.has('app/layout.tsx')) {
      fileMap.set('app/layout.tsx', {
        path: 'app/layout.tsx',
        content: `import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '${appName}',
  description: 'Built with AutoForge',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}`,
        language: 'typescript',
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
};`,
        language: 'javascript',
      });
    }
    
    // Ensure tailwind.config.js
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
  theme: { extend: {} },
  plugins: [],
};`,
        language: 'javascript',
      });
    }
    
    return Array.from(fileMap.values());
  }
}

// Export singleton
export const orchestratedGenerator = new OrchestratedGenerator();