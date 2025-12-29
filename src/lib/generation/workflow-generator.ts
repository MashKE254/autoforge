/**
 * Workflow Automation Generator (COMPLETE - FIXED)
 * 
 * File: src/lib/generation/workflow-generator.ts
 * 
 * FIXES INCLUDED:
 * 1. Added app/page.tsx fallback in ensureEssentialFiles
 * 2. Added source-map-js to devDependencies for WebContainer compatibility
 * 3. Fixed next.config.mjs (removed deprecated experimental.appDir)
 * 4. Added postcss.config.js fallback
 * 5. Enhanced system prompt to always generate app/page.tsx
 * 6. Added Recharts import reminder to prevent missing import errors
 */

import Anthropic from '@anthropic-ai/sdk';

import { prisma } from '../prisma';
import { GeneratedFile, GenerationResult, StreamCallbacks } from './bolt-generator';

// ============================================================================
// WORKFLOW SYSTEM PROMPT
// ============================================================================

const WORKFLOW_SYSTEM_PROMPT = `You are an expert workflow automation architect. You create production-ready workflow systems using Inngest and Next.js.

OUTPUT FORMAT:
You MUST output files in this exact format:

<file path="package.json">
{
  "name": "workflow-app",
  ...
}
</file>

<file path="app/page.tsx">
// Dashboard UI - THIS FILE IS REQUIRED
</file>

<file path="inngest/client.ts">
// Inngest client configuration
</file>

WORKFLOW ARCHITECTURE:
1. Inngest for workflow orchestration
2. Next.js API routes for webhooks and triggers
3. TypeScript for type safety

REQUIRED FILES (YOU MUST GENERATE ALL OF THESE):
- package.json (with inngest dependency)
- app/page.tsx (CRITICAL: workflow dashboard UI - NEVER SKIP THIS)
- app/layout.tsx (root layout)
- app/globals.css (Tailwind styles)
- inngest/client.ts (Inngest client setup)
- inngest/functions/*.ts (workflow definitions)
- app/api/inngest/route.ts (Inngest webhook handler)
- tailwind.config.js
- tsconfig.json
- next.config.mjs
- postcss.config.js

INNGEST WORKFLOW EXAMPLE:
\`\`\`typescript
import { inngest } from "./client";

export const myWorkflow = inngest.createFunction(
  { id: "my-workflow", name: "My Workflow" },
  { event: "app/event.trigger" },
  async ({ event, step }) => {
    // Step 1
    const result1 = await step.run("step-1", async () => {
      return { data: "from step 1" };
    });

    // Step 2 - can use result from step 1
    await step.run("step-2", async () => {
      console.log(result1.data);
    });

    // Optional: wait/delay
    await step.sleep("wait-1-day", "1d");

    // Step 3
    await step.run("step-3", async () => {
      // Final step
    });
  }
);
\`\`\`

INNGEST CLIENT:
\`\`\`typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "my-app",
});
\`\`\`

API ROUTE FOR INNGEST:
\`\`\`typescript
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { myWorkflow } from "@/inngest/functions/my-workflow";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [myWorkflow],
});
\`\`\`

CRITICAL RULES:
1. Use Inngest for workflow orchestration
2. Every step must use step.run() for durability
3. ALWAYS include app/page.tsx with a dashboard UI to trigger/monitor workflows
4. Generate COMPLETE working code - no stubs

PACKAGE.JSON MUST INCLUDE:
- "inngest": "^3.22.0"
- "next": "14.2.5"
- "react": "18.3.1"
- "tailwindcss": "3.4.4"
- "source-map-js": "^1.2.0" (in devDependencies - required for WebContainer)

RECHARTS IMPORT RULE (CRITICAL):
If you use Recharts for charts, you MUST import ALL components you use:
\`\`\`typescript
// CORRECT - import everything you use
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  LineChart,
  Line
} from 'recharts';
\`\`\`

NEVER use a Recharts component without importing it first!
`;

function buildWorkflowUserPrompt(userRequest: string): string {
  return `Create a complete workflow automation system for:

"${userRequest}"

CRITICAL: You MUST generate app/page.tsx with a dashboard UI. This is the main entry point.

Generate ALL necessary files including:
1. package.json (include recharts if using charts, and source-map-js in devDependencies)
2. app/page.tsx (DASHBOARD UI - REQUIRED! If using Recharts, import ALL components you use)
3. app/layout.tsx
4. app/globals.css
5. Inngest client
6. Workflow functions
7. API routes
8. Config files (tailwind, tsconfig, next.config, postcss)

Generate ALL files now, starting with package.json and app/page.tsx:`;
}

// ============================================================================
// WORKFLOW GENERATOR CLASS (WITH STREAMING)
// ============================================================================

export class WorkflowGenerator {
  private client: Anthropic;
  
  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  
  async generate(
    prompt: string,
    jobId?: string,
    callbacks?: StreamCallbacks
  ): Promise<GenerationResult> {
    console.log('🔄 Workflow generation starting...');
    console.log(`   Prompt: "${prompt.slice(0, 100)}..."`);
    
    try {
      if (jobId) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: 'RUNNING',
            generationStartedAt: new Date(),
          }
        });
      }
      
      callbacks?.onProgress?.('🔄 Generating workflow system (streaming)...');
      
      // Use streaming to avoid timeout
      let responseText = '';
      
      const stream = this.client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        temperature: 0.7,
        system: WORKFLOW_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: buildWorkflowUserPrompt(prompt)
        }]
      });
      
      // Collect streamed response
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          responseText += event.delta.text;
        }
      }
      
      callbacks?.onProgress?.('📦 Parsing workflow files...');
      
      let files = this.parseFilesFromResponse(responseText);
      
      console.log(`   Parsed ${files.length} files from response`);
      
      // Ensure essential files exist (including app/page.tsx!)
      files = this.ensureEssentialFiles(files, prompt);
      
      console.log('   Generated workflow files:');
      files.forEach((f: GeneratedFile) => {
        console.log(`   - ${f.path} (${f.content.length} chars)`);
        callbacks?.onFileComplete?.(f.path, f.content);
      });
      
      if (jobId) {
        callbacks?.onProgress?.('💾 Saving workflow files...');
        
        await prisma.generatedFile.deleteMany({
          where: { generationJobId: jobId }
        });
        
        for (const file of files) {
          await prisma.generatedFile.create({
            data: {
              generationJobId: jobId,
              path: file.path,
              content: file.content,
              language: file.language,
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
        
        console.log(`✅ Saved ${files.length} workflow files to database`);
      }
      
      callbacks?.onProgress?.('✅ Workflow generation complete!');
      
      return {
        success: true,
        files,
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Workflow generation error:', errorMessage);
      
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
  
  private parseFilesFromResponse(response: string): GeneratedFile[] {
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
      
      const language = this.detectLanguage(path);
      files.push({ path, content, language });
    }
    
    return files;
  }
  
  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'json': 'json',
      'css': 'css',
      'mjs': 'javascript',
      'prisma': 'prisma',
    };
    return languageMap[ext] || 'plaintext';
  }
  
  private ensureEssentialFiles(files: GeneratedFile[], originalPrompt: string): GeneratedFile[] {
    const fileMap = new Map(files.map(f => [f.path, f]));
    
    // Extract a title from the prompt for naming
    const titleMatch = originalPrompt.match(/(?:build|create|make)\s+(?:a\s+)?([^.!?\n]+)/i);
    const appTitle = titleMatch ? titleMatch[1].trim().slice(0, 50) : 'Workflow Dashboard';
    const safeName = appTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    // =========================================================================
    // CRITICAL: Ensure app/page.tsx exists
    // =========================================================================
    if (!fileMap.has('app/page.tsx')) {
      console.warn('⚠️ No app/page.tsx generated, adding fallback dashboard');
      fileMap.set('app/page.tsx', {
        path: 'app/page.tsx',
        content: `'use client';

import { useState } from 'react';

interface WorkflowRun {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
}

export default function WorkflowDashboard() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [isTriggering, setIsTriggering] = useState(false);

  const triggerWorkflow = async () => {
    setIsTriggering(true);
    
    // Simulate triggering a workflow
    const newRun: WorkflowRun = {
      id: \`run-\${Date.now()}\`,
      status: 'running',
      startedAt: new Date().toISOString(),
    };
    
    setRuns(prev => [newRun, ...prev]);
    
    // Simulate completion after 3 seconds
    setTimeout(() => {
      setRuns(prev => prev.map(run => 
        run.id === newRun.id 
          ? { ...run, status: 'completed', completedAt: new Date().toISOString() }
          : run
      ));
      setIsTriggering(false);
    }, 3000);
  };

  const getStatusColor = (status: WorkflowRun['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">${appTitle}</h1>
              <p className="text-gray-400 text-sm mt-1">Workflow Automation Dashboard</p>
            </div>
            <button
              onClick={triggerWorkflow}
              disabled={isTriggering}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-lg hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25"
            >
              {isTriggering ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Running...
                </span>
              ) : (
                'Trigger Workflow'
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Runs', value: runs.length, color: 'from-blue-500 to-cyan-500' },
            { label: 'Completed', value: runs.filter(r => r.status === 'completed').length, color: 'from-green-500 to-emerald-500' },
            { label: 'Running', value: runs.filter(r => r.status === 'running').length, color: 'from-yellow-500 to-orange-500' },
            { label: 'Failed', value: runs.filter(r => r.status === 'failed').length, color: 'from-red-500 to-pink-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className={\`text-3xl font-bold bg-gradient-to-r \${stat.color} bg-clip-text text-transparent\`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Workflow Runs Table */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">Recent Runs</h2>
          </div>
          
          {runs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-gray-400">No workflow runs yet</p>
              <p className="text-gray-500 text-sm mt-1">Click &quot;Trigger Workflow&quot; to start your first run</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {runs.map((run) => (
                <div key={run.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={\`w-2 h-2 rounded-full \${
                      run.status === 'running' ? 'bg-blue-500 animate-pulse' :
                      run.status === 'completed' ? 'bg-green-500' :
                      run.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                    }\`} />
                    <div>
                      <p className="text-white font-medium">{run.id}</p>
                      <p className="text-gray-500 text-sm">
                        Started {new Date(run.startedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <span className={\`px-3 py-1 rounded-full text-xs font-medium \${getStatusColor(run.status)}\`}>
                    {run.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Getting Started</h3>
          <div className="space-y-3 text-gray-400 text-sm">
            <p>1. This dashboard simulates workflow automation. In production, connect to Inngest.</p>
            <p>2. Run <code className="px-2 py-1 bg-white/10 rounded text-violet-400">npx inngest-cli@latest dev</code> to start the Inngest dev server.</p>
            <p>3. Your workflows are defined in <code className="px-2 py-1 bg-white/10 rounded text-violet-400">inngest/functions/</code></p>
            <p>4. Trigger events via API or this dashboard.</p>
          </div>
        </div>
      </main>
    </div>
  );
}`,
        language: 'typescript'
      });
    }
    
    // Ensure Inngest client
    if (!fileMap.has('inngest/client.ts')) {
      fileMap.set('inngest/client.ts', {
        path: 'inngest/client.ts',
        content: `import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "${safeName}",
});`,
        language: 'typescript'
      });
    }
    
    // Ensure package.json with source-map-js
    if (!fileMap.has('package.json')) {
      fileMap.set('package.json', {
        path: 'package.json',
        content: JSON.stringify({
          name: safeName,
          version: "0.1.0",
          private: true,
          scripts: {
            dev: "next dev",
            build: "next build",
            start: "next start"
          },
          dependencies: {
            "inngest": "^3.22.0",
            "next": "14.2.5",
            "react": "18.3.1",
            "react-dom": "18.3.1",
            "lucide-react": "^0.400.0"
          },
          devDependencies: {
            "typescript": "^5.5.2",
            "@types/node": "^20.0.0",
            "@types/react": "^18.3.0",
            "@types/react-dom": "^18.3.0",
            "tailwindcss": "3.4.4",
            "postcss": "8.4.38",
            "autoprefixer": "10.4.19",
            "source-map-js": "^1.2.0"
          }
        }, null, 2),
        language: 'json'
      });
    } else {
      // If package.json exists, ensure it has source-map-js
      const existingPkg = fileMap.get('package.json')!;
      try {
        const pkg = JSON.parse(existingPkg.content);
        if (!pkg.devDependencies) {
          pkg.devDependencies = {};
        }
        if (!pkg.devDependencies['source-map-js']) {
          pkg.devDependencies['source-map-js'] = '^1.2.0';
        }
        if (!pkg.devDependencies['postcss']) {
          pkg.devDependencies['postcss'] = '8.4.38';
        }
        if (!pkg.devDependencies['autoprefixer']) {
          pkg.devDependencies['autoprefixer'] = '10.4.19';
        }
        existingPkg.content = JSON.stringify(pkg, null, 2);
      } catch (e) {
        // JSON parsing failed, keep original
      }
    }
    
    // Ensure tsconfig.json
    if (!fileMap.has('tsconfig.json')) {
      fileMap.set('tsconfig.json', {
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: "es5",
            lib: ["dom", "dom.iterable", "esnext"],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: "esnext",
            moduleResolution: "bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: "preserve",
            incremental: true,
            plugins: [{ name: "next" }],
            paths: { "@/*": ["./*"] }
          },
          include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
          exclude: ["node_modules"]
        }, null, 2),
        language: 'json'
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
        language: 'javascript'
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
        language: 'javascript'
      });
    }
    
    // Ensure globals.css
    if (!fileMap.has('app/globals.css')) {
      fileMap.set('app/globals.css', {
        path: 'app/globals.css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: system-ui, -apple-system, sans-serif;
}`,
        language: 'css'
      });
    }
    
    // Ensure layout.tsx
    if (!fileMap.has('app/layout.tsx')) {
      fileMap.set('app/layout.tsx', {
        path: 'app/layout.tsx',
        content: `import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${appTitle}',
  description: 'Workflow Automation System',
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
}`,
        language: 'typescript'
      });
    }
    
    // Ensure next.config.mjs (WITHOUT deprecated experimental.appDir)
    if (!fileMap.has('next.config.mjs')) {
      fileMap.set('next.config.mjs', {
        path: 'next.config.mjs',
        content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;`,
        language: 'javascript'
      });
    } else {
      // Remove experimental.appDir if present
      const existingConfig = fileMap.get('next.config.mjs')!;
      if (existingConfig.content.includes('appDir')) {
        existingConfig.content = existingConfig.content
          .replace(/experimental:\s*\{\s*appDir:\s*true,?\s*\},?/g, '')
          .replace(/experimental:\s*\{\s*\},?/g, '');
      }
    }
    
    // Ensure API route exists
    if (!fileMap.has('app/api/inngest/route.ts')) {
      fileMap.set('app/api/inngest/route.ts', {
        path: 'app/api/inngest/route.ts',
        content: `import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
// Import your workflow functions here
// import { myWorkflow } from "@/inngest/functions/my-workflow";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Add your workflow functions here
  ],
});`,
        language: 'typescript'
      });
    }
    
    return Array.from(fileMap.values());
  }
}

// Export singleton instance
export const workflowGenerator = new WorkflowGenerator();