/**
 * Workflow Automation Generator (with Streaming)
 * 
 * File: src/lib/generation/workflow-generator.ts
 * 
 * Updated to use streaming API to avoid timeout issues.
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

<file path="inngest/client.ts">
// Inngest client configuration
</file>

WORKFLOW ARCHITECTURE:
1. Inngest for workflow orchestration
2. Next.js API routes for webhooks and triggers
3. TypeScript for type safety

REQUIRED FILES:
- package.json (with inngest dependency)
- inngest/client.ts (Inngest client setup)
- inngest/functions/*.ts (workflow definitions)
- app/api/inngest/route.ts (Inngest webhook handler)
- app/page.tsx (workflow dashboard UI)
- app/layout.tsx (root layout)
- app/globals.css (Tailwind styles)
- tailwind.config.js
- tsconfig.json
- next.config.mjs

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
3. Include a dashboard UI to trigger/monitor workflows
4. Generate COMPLETE working code - no stubs

PACKAGE.JSON MUST INCLUDE:
- "inngest": "^3.22.0"
- "next": "14.2.5"
- "react": "18.3.1"
- "tailwindcss": "3.4.4"
`;

function buildWorkflowUserPrompt(userRequest: string): string {
  return `Create a complete workflow automation system for:

"${userRequest}"

Generate ALL necessary files including package.json, Inngest client, workflow functions, API routes, and a dashboard UI.

Generate ALL files now:`;
}

// ============================================================================
// WORKFLOW GENERATOR CLASS (WITH STREAMING)
// ============================================================================

export class WorkflowGenerator {
  private client: Anthropic;
  
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
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
      
      // Ensure essential files exist
      files = this.ensureEssentialFiles(files);
      
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
  
  private ensureEssentialFiles(files: GeneratedFile[]): GeneratedFile[] {
    const fileMap = new Map(files.map(f => [f.path, f]));
    
    // Ensure Inngest client
    if (!fileMap.has('inngest/client.ts')) {
      fileMap.set('inngest/client.ts', {
        path: 'inngest/client.ts',
        content: `import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "workflow-app",
});`,
        language: 'typescript'
      });
    }
    
    // Ensure package.json
    if (!fileMap.has('package.json')) {
      fileMap.set('package.json', {
        path: 'package.json',
        content: JSON.stringify({
          name: "workflow-app",
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
            "tailwindcss": "3.4.4"
          },
          devDependencies: {
            "typescript": "^5.5.2",
            "@types/node": "^20.0.0",
            "@types/react": "^18.3.0"
          }
        }, null, 2),
        language: 'json'
      });
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
    
    // Ensure globals.css
    if (!fileMap.has('app/globals.css')) {
      fileMap.set('app/globals.css', {
        path: 'app/globals.css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;`,
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
  title: 'Workflow Dashboard',
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
    
    // Ensure next.config.mjs
    if (!fileMap.has('next.config.mjs')) {
      fileMap.set('next.config.mjs', {
        path: 'next.config.mjs',
        content: `/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;`,
        language: 'javascript'
      });
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