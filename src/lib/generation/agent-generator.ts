/**
 * AI Agent Network Generator (with Streaming)
 * 
 * File: src/lib/generation/agent-generator.ts
 * 
 * Updated to use streaming API to avoid timeout issues.
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../prisma';
import { GeneratedFile, GenerationResult, StreamCallbacks } from './bolt-generator';

// ============================================================================
// AGENT SYSTEM PROMPT
// ============================================================================

const AGENT_SYSTEM_PROMPT = `You are an expert AI systems architect. You create production-ready multi-agent AI systems using LangGraph and the Vercel AI SDK.

OUTPUT FORMAT:
You MUST output files in this exact format:

<file path="package.json">
{
  "name": "agent-network",
  ...
}
</file>

<file path="lib/agents/research-agent.ts">
// Agent implementation
</file>

AGENT ARCHITECTURE:
1. LangGraph.js for agent orchestration and state machines
2. Vercel AI SDK for LLM interactions and streaming
3. Tool definitions using Zod schemas
4. Memory using in-memory store or vector database
5. Next.js API routes for agent endpoints

REQUIRED FILES FOR AGENT PROJECTS:
- package.json (with @langchain/langgraph, ai, zod dependencies)
- lib/agents/*.ts (individual agent definitions)
- lib/tools/*.ts (tool definitions)
- lib/graphs/*.ts (LangGraph workflow definitions)
- app/api/agent/route.ts (agent API endpoint)
- app/page.tsx (agent chat UI)
- app/layout.tsx (root layout)
- app/globals.css (Tailwind styles)
- tailwind.config.js
- tsconfig.json
- next.config.mjs

LANGGRAPH PATTERN EXAMPLE:
\`\`\`typescript
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ToolNode } from "@langchain/langgraph/prebuilt";

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
});

const searchTool = tool(
  async ({ query }) => {
    return \`Results for: \${query}\`;
  },
  {
    name: "search",
    description: "Search the web",
    schema: z.object({ query: z.string() }),
  }
);

const tools = [searchTool];
const toolNode = new ToolNode(tools);
const model = new ChatAnthropic({ model: "claude-sonnet-4-20250514" }).bindTools(tools);

async function agentNode(state) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

const workflow = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", (state) => {
    const last = state.messages[state.messages.length - 1];
    return last.tool_calls?.length ? "tools" : END;
  })
  .addEdge("tools", "agent");

export const agentGraph = workflow.compile();
\`\`\`

CRITICAL RULES:
1. Use LangGraph.js (NOT Python)
2. Use @langchain/langgraph, @langchain/anthropic, @langchain/core
3. Include proper TypeScript types
4. Create a complete chat UI
5. Generate COMPLETE working code - no stubs or TODOs

PACKAGE.JSON MUST INCLUDE:
- "@langchain/langgraph": "^0.2.0"
- "@langchain/anthropic": "^0.3.0"
- "@langchain/core": "^0.3.0"
- "ai": "^3.4.0"
- "zod": "^3.23.0"
- "next": "14.2.5"
- "react": "18.3.1"
- "tailwindcss": "3.4.4"
`;

function buildAgentUserPrompt(userRequest: string): string {
  return `Create a complete AI agent system for:

"${userRequest}"

Generate ALL necessary files including package.json, agent definitions, tools, API routes, and a chat UI.

Generate ALL files now:`;
}

// ============================================================================
// AGENT GENERATOR CLASS (WITH STREAMING)
// ============================================================================

export class AgentGenerator {
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
    console.log('🤖 Agent network generation starting...');
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
      
      callbacks?.onProgress?.('🤖 Generating AI agent system (streaming)...');
      
      // Use streaming to avoid timeout
      let responseText = '';
      
      const stream = this.client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000, // Reduced for faster response
        temperature: 0.7,
        system: AGENT_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: buildAgentUserPrompt(prompt)
        }]
      });
      
      // Collect streamed response
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          responseText += event.delta.text;
        }
      }
      
      callbacks?.onProgress?.('📦 Parsing agent files...');
      
      let files = this.parseFilesFromResponse(responseText);
      
      console.log(`   Parsed ${files.length} files from response`);
      
      // Ensure essential files exist
      files = this.ensureEssentialFiles(files);
      
      console.log('   Generated agent files:');
      files.forEach((f: GeneratedFile) => {
        console.log(`   - ${f.path} (${f.content.length} chars)`);
        callbacks?.onFileComplete?.(f.path, f.content);
      });
      
      if (jobId) {
        callbacks?.onProgress?.('💾 Saving agent files...');
        
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
        
        console.log(`✅ Saved ${files.length} agent files to database`);
      }
      
      callbacks?.onProgress?.('✅ Agent network generation complete!');
      
      return {
        success: true,
        files,
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Agent generation error:', errorMessage);
      
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
    };
    return languageMap[ext] || 'plaintext';
  }
  
  private ensureEssentialFiles(files: GeneratedFile[]): GeneratedFile[] {
    const fileMap = new Map(files.map(f => [f.path, f]));
    
    // Ensure package.json exists with correct dependencies
    if (!fileMap.has('package.json')) {
      fileMap.set('package.json', {
        path: 'package.json',
        content: JSON.stringify({
          name: "agent-network",
          version: "0.1.0",
          private: true,
          scripts: {
            dev: "next dev",
            build: "next build",
            start: "next start"
          },
          dependencies: {
            "@langchain/langgraph": "^0.2.20",
            "@langchain/anthropic": "^0.3.8",
            "@langchain/core": "^0.3.18",
            "ai": "^3.4.0",
            "zod": "^3.23.8",
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
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
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
  title: 'AI Agent',
  description: 'AI Agent Application',
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
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@langchain/langgraph', '@langchain/anthropic'],
  },
};

export default nextConfig;`,
        language: 'javascript'
      });
    }
    
    return Array.from(fileMap.values());
  }
}

// Export singleton instance
export const agentGenerator = new AgentGenerator();