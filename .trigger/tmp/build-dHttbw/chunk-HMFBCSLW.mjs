import {
  Anthropic,
  prisma
} from "./chunk-2RFTIJZX.mjs";
import {
  __name,
  init_esm
} from "./chunk-VWGL725N.mjs";

// src/lib/generation/workflow-generator.ts
init_esm();
var WORKFLOW_SYSTEM_PROMPT = `You are an expert workflow automation architect. You create production-ready workflow systems using Inngest and Next.js.

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
function buildWorkflowUserPrompt(userRequest) {
  return `Create a complete workflow automation system for:

"${userRequest}"

Generate ALL necessary files including package.json, Inngest client, workflow functions, API routes, and a dashboard UI.

Generate ALL files now:`;
}
__name(buildWorkflowUserPrompt, "buildWorkflowUserPrompt");
var WorkflowGenerator = class {
  static {
    __name(this, "WorkflowGenerator");
  }
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
  async generate(prompt, jobId, callbacks) {
    console.log("🔄 Workflow generation starting...");
    console.log(`   Prompt: "${prompt.slice(0, 100)}..."`);
    try {
      if (jobId) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: "RUNNING",
            generationStartedAt: /* @__PURE__ */ new Date()
          }
        });
      }
      callbacks?.onProgress?.("🔄 Generating workflow system (streaming)...");
      let responseText = "";
      const stream = this.client.messages.stream({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16e3,
        temperature: 0.7,
        system: WORKFLOW_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: buildWorkflowUserPrompt(prompt)
        }]
      });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          responseText += event.delta.text;
        }
      }
      callbacks?.onProgress?.("📦 Parsing workflow files...");
      let files = this.parseFilesFromResponse(responseText);
      console.log(`   Parsed ${files.length} files from response`);
      files = this.ensureEssentialFiles(files);
      console.log("   Generated workflow files:");
      files.forEach((f) => {
        console.log(`   - ${f.path} (${f.content.length} chars)`);
        callbacks?.onFileComplete?.(f.path, f.content);
      });
      if (jobId) {
        callbacks?.onProgress?.("💾 Saving workflow files...");
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
            status: "COMPLETED",
            completedModules: files.length,
            totalModules: files.length,
            generationCompletedAt: /* @__PURE__ */ new Date()
          }
        });
        console.log(`✅ Saved ${files.length} workflow files to database`);
      }
      callbacks?.onProgress?.("✅ Workflow generation complete!");
      return {
        success: true,
        files
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Workflow generation error:", errorMessage);
      callbacks?.onError?.(errorMessage);
      if (jobId) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: "FAILED",
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
  parseFilesFromResponse(response) {
    const files = [];
    const fileRegex = /<file\s+path=["']([^"']+)["']>([\s\S]*?)<\/file>/gi;
    let match;
    while ((match = fileRegex.exec(response)) !== null) {
      const path = match[1].trim();
      let content = match[2];
      content = content.replace(/^\n+/, "").replace(/\n+$/, "").trim();
      const language = this.detectLanguage(path);
      files.push({ path, content, language });
    }
    return files;
  }
  detectLanguage(path) {
    const ext = path.split(".").pop()?.toLowerCase() || "";
    const languageMap = {
      "ts": "typescript",
      "tsx": "typescript",
      "js": "javascript",
      "jsx": "javascript",
      "json": "json",
      "css": "css",
      "mjs": "javascript",
      "prisma": "prisma"
    };
    return languageMap[ext] || "plaintext";
  }
  ensureEssentialFiles(files) {
    const fileMap = new Map(files.map((f) => [f.path, f]));
    if (!fileMap.has("inngest/client.ts")) {
      fileMap.set("inngest/client.ts", {
        path: "inngest/client.ts",
        content: `import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "workflow-app",
});`,
        language: "typescript"
      });
    }
    if (!fileMap.has("package.json")) {
      fileMap.set("package.json", {
        path: "package.json",
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
        language: "json"
      });
    }
    if (!fileMap.has("tsconfig.json")) {
      fileMap.set("tsconfig.json", {
        path: "tsconfig.json",
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
        language: "json"
      });
    }
    if (!fileMap.has("tailwind.config.js")) {
      fileMap.set("tailwind.config.js", {
        path: "tailwind.config.js",
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
        language: "javascript"
      });
    }
    if (!fileMap.has("app/globals.css")) {
      fileMap.set("app/globals.css", {
        path: "app/globals.css",
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;`,
        language: "css"
      });
    }
    if (!fileMap.has("app/layout.tsx")) {
      fileMap.set("app/layout.tsx", {
        path: "app/layout.tsx",
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
        language: "typescript"
      });
    }
    if (!fileMap.has("next.config.mjs")) {
      fileMap.set("next.config.mjs", {
        path: "next.config.mjs",
        content: `/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;`,
        language: "javascript"
      });
    }
    if (!fileMap.has("app/api/inngest/route.ts")) {
      fileMap.set("app/api/inngest/route.ts", {
        path: "app/api/inngest/route.ts",
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
        language: "typescript"
      });
    }
    return Array.from(fileMap.values());
  }
};
var workflowGenerator = new WorkflowGenerator();

// src/lib/generation/agent-generator.ts
init_esm();
var AGENT_SYSTEM_PROMPT = `You are an expert AI systems architect. You create production-ready multi-agent AI systems using LangGraph and the Vercel AI SDK.

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
function buildAgentUserPrompt(userRequest) {
  return `Create a complete AI agent system for:

"${userRequest}"

Generate ALL necessary files including package.json, agent definitions, tools, API routes, and a chat UI.

Generate ALL files now:`;
}
__name(buildAgentUserPrompt, "buildAgentUserPrompt");
var AgentGenerator = class {
  static {
    __name(this, "AgentGenerator");
  }
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
  async generate(prompt, jobId, callbacks) {
    console.log("🤖 Agent network generation starting...");
    console.log(`   Prompt: "${prompt.slice(0, 100)}..."`);
    try {
      if (jobId) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: "RUNNING",
            generationStartedAt: /* @__PURE__ */ new Date()
          }
        });
      }
      callbacks?.onProgress?.("🤖 Generating AI agent system (streaming)...");
      let responseText = "";
      const stream = this.client.messages.stream({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16e3,
        // Reduced for faster response
        temperature: 0.7,
        system: AGENT_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: buildAgentUserPrompt(prompt)
        }]
      });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          responseText += event.delta.text;
        }
      }
      callbacks?.onProgress?.("📦 Parsing agent files...");
      let files = this.parseFilesFromResponse(responseText);
      console.log(`   Parsed ${files.length} files from response`);
      files = this.ensureEssentialFiles(files);
      console.log("   Generated agent files:");
      files.forEach((f) => {
        console.log(`   - ${f.path} (${f.content.length} chars)`);
        callbacks?.onFileComplete?.(f.path, f.content);
      });
      if (jobId) {
        callbacks?.onProgress?.("💾 Saving agent files...");
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
            status: "COMPLETED",
            completedModules: files.length,
            totalModules: files.length,
            generationCompletedAt: /* @__PURE__ */ new Date()
          }
        });
        console.log(`✅ Saved ${files.length} agent files to database`);
      }
      callbacks?.onProgress?.("✅ Agent network generation complete!");
      return {
        success: true,
        files
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Agent generation error:", errorMessage);
      callbacks?.onError?.(errorMessage);
      if (jobId) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: "FAILED",
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
  parseFilesFromResponse(response) {
    const files = [];
    const fileRegex = /<file\s+path=["']([^"']+)["']>([\s\S]*?)<\/file>/gi;
    let match;
    while ((match = fileRegex.exec(response)) !== null) {
      const path = match[1].trim();
      let content = match[2];
      content = content.replace(/^\n+/, "").replace(/\n+$/, "").trim();
      const language = this.detectLanguage(path);
      files.push({ path, content, language });
    }
    return files;
  }
  detectLanguage(path) {
    const ext = path.split(".").pop()?.toLowerCase() || "";
    const languageMap = {
      "ts": "typescript",
      "tsx": "typescript",
      "js": "javascript",
      "jsx": "javascript",
      "json": "json",
      "css": "css",
      "mjs": "javascript"
    };
    return languageMap[ext] || "plaintext";
  }
  ensureEssentialFiles(files) {
    const fileMap = new Map(files.map((f) => [f.path, f]));
    if (!fileMap.has("package.json")) {
      fileMap.set("package.json", {
        path: "package.json",
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
        language: "json"
      });
    }
    if (!fileMap.has("tsconfig.json")) {
      fileMap.set("tsconfig.json", {
        path: "tsconfig.json",
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
        language: "json"
      });
    }
    if (!fileMap.has("tailwind.config.js")) {
      fileMap.set("tailwind.config.js", {
        path: "tailwind.config.js",
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
        language: "javascript"
      });
    }
    if (!fileMap.has("app/globals.css")) {
      fileMap.set("app/globals.css", {
        path: "app/globals.css",
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;`,
        language: "css"
      });
    }
    if (!fileMap.has("app/layout.tsx")) {
      fileMap.set("app/layout.tsx", {
        path: "app/layout.tsx",
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
        language: "typescript"
      });
    }
    if (!fileMap.has("next.config.mjs")) {
      fileMap.set("next.config.mjs", {
        path: "next.config.mjs",
        content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@langchain/langgraph', '@langchain/anthropic'],
  },
};

export default nextConfig;`,
        language: "javascript"
      });
    }
    return Array.from(fileMap.values());
  }
};
var agentGenerator = new AgentGenerator();

export {
  WorkflowGenerator,
  AgentGenerator
};
//# sourceMappingURL=chunk-HMFBCSLW.mjs.map
