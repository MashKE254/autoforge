import {
  Anthropic,
  prisma
} from "./chunk-2RFTIJZX.mjs";
import {
  __name,
  init_esm
} from "./chunk-VWGL725N.mjs";

// src/lib/generation/saas-generator.ts
init_esm();
var SAAS_SYSTEM_PROMPT = `You are an expert SaaS Architect and Senior Full-Stack Engineer.
You do NOT build "MVPs" or "Prototypes". You build **Professional, Scalable, Production-Ready SaaS Applications**.

Your goal is to generate the complete source code for a high-value Micro-SaaS based on the user's request.

## OUTPUT FORMAT
You MUST output files in this exact format:

<file path="package.json">
{
  "name": "professional-saas",
  ...
}
</file>

## 💎 PROFESSIONAL ARCHITECTURE STANDARDS

1.  **Service Layer Pattern**: NEVER write business logic inside API routes (app/api/...).
    * Create a \`lib/services/\` folder (e.g., \`lib/services/ai-service.ts\`, \`lib/services/seo-service.ts\`).
    * API routes should only handle validation, auth checks, and calling the service.

2.  **Asynchronous Workflows**:
    * For any "Generation" or "Processing" task (like SEO writing), assume it takes time.
    * DO NOT make the user wait on a loading spinner for 60 seconds.
    * Implement a "Job" pattern: User submits request -> DB creates record (status: 'processing') -> UI polls for updates or uses webhooks.

3.  **Monetization First**:
    * Every core feature MUST check for \`subscription.status === 'active'\`.
    * Implement a "Credits" system if applicable (e.g., "10 SEO articles per month").

## 📂 MANDATORY FILE STRUCTURE

### 1. CONFIGURATION & INFRASTRUCTURE
- \`package.json\` (Next.js 14+, Tailwind, Prisma, Stripe, NextAuth, Lucide)
- \`.env.example\` (Complete list of required keys)
- \`prisma/schema.prisma\` (Must include User, Account, Subscription, AND domain-specific models like \`Post\`, \`Project\`, \`Analysis\`)
- \`middleware.ts\` (Route protection)

### 2. CORE LIBRARY (The "Brain")
- \`lib/prisma.ts\` (DB Client)
- \`lib/stripe.ts\` (Stripe Client & Price Config)
- \`lib/auth.ts\` (NextAuth Options)
- \`lib/services/[domain]-service.ts\` (The CORE business logic - e.g., calling OpenAI, scraping, processing)

### 3. API ROUTES (The "Interface")
- \`app/api/auth/[...nextauth]/route.ts\`
- \`app/api/stripe/checkout/route.ts\`
- \`app/api/stripe/webhook/route.ts\`
- \`app/api/[domain]/create/route.ts\` (Trigger job)
- \`app/api/[domain]/[id]/route.ts\` (Poll status/get result)

### 4. FRONTEND PAGES (The "Experience")
- \`app/page.tsx\` (High-conversion Landing Page with Hero, Features, Pricing)
- \`app/dashboard/page.tsx\` (Analytics & Overview)
- \`app/dashboard/[feature]/page.tsx\` (The main tool interface)
- \`app/dashboard/billing/page.tsx\` (Subscription management)
- \`app/dashboard/settings/page.tsx\` (User profile)

### 5. UI COMPONENTS
- \`components/ui/...\` (Shadcn-like primitives: Button, Card, Input, Dialog, Badge, Progress)
- \`components/pricing-table.tsx\` (Professional pricing tiers)
- \`components/dashboard-shell.tsx\` (Sidebar navigation)
- \`components/empty-state.tsx\` (Polished empty states)

## 🧠 STRIPE INTEGRATION (MANDATORY)

Use this robust webhook handler pattern:
\`\`\`typescript
// app/api/stripe/webhook/route.ts
// Handle 'checkout.session.completed' to create subscriptions
// Handle 'invoice.payment_succeeded' to renew credits
// Handle 'customer.subscription.deleted' to remove access
\`\`\`

## 🧠 PRISMA SCHEMA (MANDATORY)

\`\`\`prisma
model User {
  id            String    @id @default(cuid())
  // ... auth fields ...
  credits       Int       @default(0)
  subscription  Subscription?
  // ... relations ...
}

model Subscription {
  id     String   @id @default(cuid())
  status String   // 'active', 'past_due', 'canceled'
  planId String   // 'pro_monthly', 'enterprise_yearly'
  // ...
}
\`\`\`

## 🎨 UI/UX RULES
1.  **Professional Polish**: Use gradients, subtle borders (border-white/10), and glassmorphism where appropriate.
2.  **Loading States**: Always show Skeletons or Progress Bars during async operations.
3.  **Error Handling**: Never show raw JSON errors. Use Toasts or Alert banners.
4.  **Copywriting**: Use professional, benefit-driven copy on the landing page (e.g., "10x your workflow", "Enterprise-grade security").

DO NOT USE PLACEHOLDERS. IMPLEMENT THE LOGIC.
If the app requires OpenAI, WRITE THE CALL in \`lib/services/ai.ts\`.
If the app requires Data fetching, WRITE THE MOCK FETCH in \`lib/services/data.ts\`.
`;
function buildProfessionalSaaSUserPrompt(userRequest) {
  return `You are building a PROFESSIONAL MICRO-SAAS application.

USER REQUEST: "${userRequest}"

## YOUR TASK:
1.  **Analyze the Domain**: Identify the core "Value" of this SaaS (e.g., is it generating content? Analyzing data? managing workflows?).
2.  **Design the Data Model**: Create a Prisma schema that supports this specific value (e.g., if it's an SEO tool, we need \`Project\`, \`Keyword\`, \`Article\` models).
3.  **Architect the "Engine"**:
    * Create a Service file (\`lib/services/core.ts\`) that implements the "Hard Work".
    * If it involves AI, implement a structured prompt chain (not just one call).
    * If it involves data, simulate a "Deep Search" or "Analysis" step.
4.  **Build the UI**:
    * Landing Page: Must sell the value proposition.
    * Dashboard: Must look like a $100/mo tool (Tabs, Data Tables, Charts).
    * Creation Flow: A multi-step wizard or polished form.

## SPECIFIC REQUIREMENTS FOR THIS APP:
* **Authentication**: NextAuth (Google/GitHub).
* **Payments**: Stripe Subscriptions (Free, Pro, Enterprise).
* **Monetization**: Gate the core feature behind the 'Pro' plan.
* **Business Logic**: The core feature must be implemented in a dedicated Service file, not the API route.

GENERATE THE COMPLETE APPLICATION CODE NOW.`;
}
__name(buildProfessionalSaaSUserPrompt, "buildProfessionalSaaSUserPrompt");
var SaaSGenerator = class {
  static {
    __name(this, "SaaSGenerator");
  }
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
  /**
   * Generate a complete SaaS application
   */
  async generate(prompt, jobId, callbacks) {
    console.log("🏢 Professional SaaS generation starting...");
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
      callbacks?.onProgress?.("🏢 Architecting Professional SaaS solution...");
      let responseText = "";
      const stream = this.client.messages.stream({
        model: "claude-3-5-sonnet-20240620",
        // Use the smartest model available
        max_tokens: 8192,
        // Maximum output for full applications
        temperature: 0.2,
        // Lower temperature for more robust code
        system: SAAS_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: buildProfessionalSaaSUserPrompt(prompt)
        }]
      });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          responseText += event.delta.text;
          const fileMatch = responseText.match(/<file path="([^"]+)">/g);
          if (fileMatch) {
            const lastFile = fileMatch[fileMatch.length - 1];
            const path = lastFile.match(/<file path="([^"]+)">/)?.[1];
            if (path) {
              callbacks?.onProgress?.(`📄 Engineering: ${path}`);
            }
          }
        }
      }
      callbacks?.onProgress?.("📦 Compiling generated modules...");
      let files = this.parseFilesFromResponse(responseText);
      console.log(`   Parsed ${files.length} files from response`);
      files = this.ensureEssentialSaaSFiles(files, prompt);
      console.log("   Generated SaaS files:");
      files.forEach((f) => {
        console.log(`   - ${f.path} (${f.content.length} chars)`);
        callbacks?.onFileComplete?.(f.path, f.content);
      });
      if (jobId) {
        callbacks?.onProgress?.("💾 Deploying to workspace...");
        await prisma.$transaction(
          files.map(
            (file) => prisma.generatedFile.upsert({
              where: {
                generationJobId_path: {
                  generationJobId: jobId,
                  path: file.path
                }
              },
              update: {
                content: file.content,
                language: file.language,
                size: file.content.length
              },
              create: {
                generationJobId: jobId,
                path: file.path,
                content: file.content,
                language: file.language,
                size: file.content.length
              }
            })
          )
        );
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            generationCompletedAt: /* @__PURE__ */ new Date(),
            totalModules: files.length,
            completedModules: files.length
          }
        });
      }
      callbacks?.onProgress?.("✅ Professional SaaS Ready!");
      return {
        success: true,
        files
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ SaaS generation failed:", errorMessage);
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
  /**
   * Parse files from LLM response
   */
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
      "prisma": "prisma",
      "env": "plaintext",
      "md": "markdown"
    };
    return languageMap[ext] || "plaintext";
  }
  /**
   * Ensure essential SaaS files exist and inject boilerplate if missing
   */
  ensureEssentialSaaSFiles(files, prompt) {
    const fileMap = new Map(files.map((f) => [f.path, f]));
    const projectName = prompt.slice(0, 30).replace(/[^a-zA-Z0-9\s]/g, "").trim() || "professional-saas";
    const safeName = projectName.toLowerCase().replace(/\s+/g, "-");
    if (!fileMap.has("package.json")) {
      fileMap.set("package.json", {
        path: "package.json",
        content: JSON.stringify({
          name: safeName,
          version: "0.1.0",
          private: true,
          scripts: {
            dev: "next dev",
            build: "prisma generate && next build",
            start: "next start",
            postinstall: "prisma generate"
          },
          dependencies: {
            "next": "14.2.5",
            "react": "18.3.1",
            "react-dom": "18.3.1",
            "next-auth": "^4.24.0",
            "@auth/prisma-adapter": "^2.0.0",
            "@prisma/client": "^5.0.0",
            "stripe": "^14.0.0",
            "lucide-react": "^0.300.0",
            "clsx": "^2.0.0",
            "tailwind-merge": "^2.0.0",
            "openai": "^4.0.0",
            "zod": "^3.22.0",
            "react-hook-form": "^7.0.0",
            "@hookform/resolvers": "^3.0.0"
          },
          devDependencies: {
            "prisma": "^5.0.0",
            "typescript": "5.5.2",
            "tailwindcss": "3.4.4",
            "@types/node": "20.14.0",
            "@types/react": "18.3.3",
            "autoprefixer": "10.4.19",
            "postcss": "8.4.38"
          }
        }, null, 2),
        language: "json"
      });
    }
    if (!fileMap.has("lib/stripe.ts")) {
      fileMap.set("lib/stripe.ts", {
        path: "lib/stripe.ts",
        content: `import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    credits: 3,
    features: ['3 Generations/mo', 'Community support', 'Basic features'],
  },
  pro: {
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRICE_ID_PRO,
    credits: 100,
    features: ['100 Generations/mo', 'Priority support', 'Advanced analytics', 'Commercial usage'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 99,
    priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE,
    credits: 1000,
    features: ['Unlimited', 'Dedicated support', 'API Access', 'Custom integrations'],
  },
} as const;
`,
        language: "typescript"
      });
    }
    if (!fileMap.has(".env.example")) {
      fileMap.set(".env.example", {
        path: ".env.example",
        content: `# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="openssl-rand-base64-32"

# OAuth (Google)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_PRO="price_..."
STRIPE_PRICE_ID_ENTERPRISE="price_..."

# OpenAI (For AI Features)
OPENAI_API_KEY="sk-..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
`,
        language: "plaintext"
      });
    }
    return Array.from(fileMap.values());
  }
};
var saasGenerator = new SaaSGenerator();

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
  SaaSGenerator,
  WorkflowGenerator,
  AgentGenerator
};
//# sourceMappingURL=chunk-YHXRBZK6.mjs.map
