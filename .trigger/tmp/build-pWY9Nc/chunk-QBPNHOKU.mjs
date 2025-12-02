import {
  Anthropic,
  prisma
} from "./chunk-2ZV322QJ.mjs";
import {
  __name,
  init_esm
} from "./chunk-VWGL725N.mjs";

// src/lib/generation/saas-generator.ts
init_esm();
var SAAS_SYSTEM_PROMPT = `You are an expert SaaS architect. You create complete, production-ready SaaS applications with billing, authentication, and all necessary infrastructure.

OUTPUT FORMAT:
You MUST output files in this exact format:

<file path="package.json">
{
  "name": "saas-app",
  ...
}
</file>

<file path="app/page.tsx">
// Landing page
</file>

## CRITICAL: MULTI-PAGE SAAS STRUCTURE

You MUST generate ALL these pages and components:

### PUBLIC PAGES:
- app/page.tsx (Landing page with pricing)
- app/pricing/page.tsx (Detailed pricing page)
- app/login/page.tsx (Login form)
- app/signup/page.tsx (Signup form)

### AUTHENTICATED PAGES:
- app/dashboard/page.tsx (Main dashboard)
- app/dashboard/settings/page.tsx (User settings)
- app/dashboard/billing/page.tsx (Billing management)
- app/dashboard/layout.tsx (Dashboard layout with sidebar)

### API ROUTES:
- app/api/auth/[...nextauth]/route.ts (NextAuth configuration)
- app/api/stripe/checkout/route.ts (Create checkout session)
- app/api/stripe/portal/route.ts (Customer portal)
- app/api/stripe/webhook/route.ts (Stripe webhooks)
- app/api/user/route.ts (User CRUD operations)

### COMPONENTS:
- components/ui/button.tsx
- components/ui/card.tsx
- components/ui/input.tsx
- components/ui/badge.tsx
- components/pricing-card.tsx
- components/dashboard-nav.tsx
- components/user-menu.tsx

### CONFIG FILES:
- package.json (with ALL dependencies)
- prisma/schema.prisma (User, Subscription, etc.)
- lib/stripe.ts (Stripe client)
- lib/auth.ts (Auth utilities)
- middleware.ts (Route protection)

## STRIPE INTEGRATION PATTERNS

### Checkout Session Creation:
\`\`\`typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Create checkout session
const session = await stripe.checkout.sessions.create({
  customer_email: user.email,
  line_items: [
    {
      price: priceId, // From Stripe dashboard
      quantity: 1,
    },
  ],
  mode: 'subscription',
  success_url: \`\${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true\`,
  cancel_url: \`\${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true\`,
  metadata: {
    userId: user.id,
  },
});
\`\`\`

### Webhook Handler:
\`\`\`typescript
import { headers } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 });
  }
  
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      // Create/update subscription in database
      await prisma.subscription.create({
        data: {
          userId: session.metadata?.userId!,
          stripeSubscriptionId: session.subscription as string,
          stripePriceId: session.line_items?.data[0]?.price?.id,
          status: 'active',
        },
      });
      break;
      
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: { status: subscription.status },
      });
      break;
  }
  
  return new Response('OK', { status: 200 });
}
\`\`\`

### Customer Portal:
\`\`\`typescript
const portalSession = await stripe.billingPortal.sessions.create({
  customer: user.stripeCustomerId,
  return_url: \`\${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing\`,
});
// Redirect to portalSession.url
\`\`\`

## PRISMA SCHEMA FOR SAAS:

\`\`\`prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Stripe
  stripeCustomerId String? @unique
  
  // Relations
  subscription  Subscription?
  accounts      Account[]
  sessions      Session[]
}

model Subscription {
  id                   String   @id @default(cuid())
  userId               String   @unique
  stripeSubscriptionId String   @unique
  stripePriceId        String?
  stripeCurrentPeriodEnd DateTime?
  status               String   // 'active', 'canceled', 'past_due', etc.
  plan                 String   @default("free") // 'free', 'pro', 'enterprise'
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// NextAuth models
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
\`\`\`

## MIDDLEWARE FOR ROUTE PROTECTION:

\`\`\`typescript
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
\`\`\`

## REQUIRED DEPENDENCIES:

\`\`\`json
{
  "dependencies": {
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "next-auth": "^4.24.0",
    "@auth/prisma-adapter": "^2.0.0",
    "@prisma/client": "^5.0.0",
    "stripe": "^14.0.0",
    "lucide-react": "^0.300.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "typescript": "5.5.2",
    "tailwindcss": "3.4.4",
    "@types/node": "20.14.0",
    "@types/react": "18.3.3"
  }
}
\`\`\`

## ENVIRONMENT VARIABLES TEMPLATE:

Generate an .env.example file:
\`\`\`
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# OAuth Providers
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_ID=""
GITHUB_SECRET=""

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Stripe Price IDs
STRIPE_PRICE_ID_PRO="price_..."
STRIPE_PRICE_ID_ENTERPRISE="price_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
\`\`\`

## CRITICAL RULES:
1. Generate ALL pages listed above - this is a multi-page app
2. Include complete Stripe integration with webhooks
3. Use proper TypeScript types throughout
4. Include proper error handling
5. Make the UI polished with Tailwind CSS
6. Include loading states and error states
7. Generate reusable components
8. Include proper SEO metadata
9. DO NOT use placeholder comments - implement everything
10. The pricing page must show actual pricing tiers`;
function buildSaaSUserPrompt(userRequest) {
  return `Create a complete, production-ready SaaS application for:

"${userRequest}"

This MUST be a full SaaS with:
1. Landing page with pricing tiers
2. User authentication (NextAuth with Google/GitHub)
3. Dashboard for authenticated users
4. Stripe integration for subscriptions
5. Billing management page
6. User settings page
7. All necessary API routes

Generate ALL necessary files including the complete Prisma schema, Stripe integration, and all pages.

The application should be immediately deployable and monetizable.

Start generating files now:`;
}
__name(buildSaaSUserPrompt, "buildSaaSUserPrompt");
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
    console.log("🏢 SaaS generation starting...");
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
      callbacks?.onProgress?.("🏢 Generating complete SaaS application...");
      let responseText = "";
      const stream = this.client.messages.stream({
        model: "claude-sonnet-4-20250514",
        max_tokens: 64e3,
        // Large output for full SaaS
        temperature: 0.7,
        system: SAAS_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: buildSaaSUserPrompt(prompt)
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
              callbacks?.onProgress?.(`📄 Generating: ${path}`);
            }
          }
        }
      }
      callbacks?.onProgress?.("📦 Parsing generated files...");
      let files = this.parseFilesFromResponse(responseText);
      console.log(`   Parsed ${files.length} files from response`);
      files = this.ensureEssentialSaaSFiles(files, prompt);
      console.log("   Generated SaaS files:");
      files.forEach((f) => {
        console.log(`   - ${f.path} (${f.content.length} chars)`);
        callbacks?.onFileComplete?.(f.path, f.content);
      });
      if (jobId) {
        callbacks?.onProgress?.("💾 Saving to database...");
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
      callbacks?.onProgress?.("✅ SaaS application generated successfully!");
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
   * Ensure essential SaaS files exist
   */
  ensureEssentialSaaSFiles(files, prompt) {
    const fileMap = new Map(files.map((f) => [f.path, f]));
    const projectName = prompt.slice(0, 30).replace(/[^a-zA-Z0-9\s]/g, "").trim() || "saas-app";
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
            "tailwind-merge": "^2.0.0"
          },
          devDependencies: {
            "prisma": "^5.0.0",
            "typescript": "5.5.2",
            "tailwindcss": "3.4.4",
            "@types/node": "20.14.0",
            "@types/react": "18.3.3",
            "@types/react-dom": "18.3.0",
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
    features: ['Basic features', 'Community support', '1 project'],
  },
  pro: {
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRICE_ID_PRO,
    features: ['All Free features', 'Priority support', 'Unlimited projects', 'Advanced analytics'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 99,
    priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE,
    features: ['All Pro features', 'Dedicated support', 'Custom integrations', 'SLA guarantee'],
  },
} as const;

export type PlanType = keyof typeof PLANS;
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
NEXTAUTH_SECRET="your-nextauth-secret-generate-with-openssl-rand-base64-32"

# OAuth Providers (configure in provider dashboard)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_ID=""
GITHUB_SECRET=""

# Stripe (from Stripe Dashboard)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Stripe Price IDs (create products in Stripe Dashboard)
STRIPE_PRICE_ID_PRO="price_..."
STRIPE_PRICE_ID_ENTERPRISE="price_..."

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
`,
        language: "plaintext"
      });
    }
    if (!fileMap.has("middleware.ts")) {
      fileMap.set("middleware.ts", {
        path: "middleware.ts",
        content: `import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};
`,
        language: "typescript"
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
  theme: {
    extend: {},
  },
  plugins: [],
};
`,
        language: "javascript"
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
    if (!fileMap.has("next.config.mjs")) {
      fileMap.set("next.config.mjs", {
        path: "next.config.mjs",
        content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`,
        language: "javascript"
      });
    }
    if (!fileMap.has("postcss.config.js")) {
      fileMap.set("postcss.config.js", {
        path: "postcss.config.js",
        content: `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`,
        language: "javascript"
      });
    }
    if (!fileMap.has("app/globals.css")) {
      fileMap.set("app/globals.css", {
        path: "app/globals.css",
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}
`,
        language: "css"
      });
    }
    if (!fileMap.has("app/layout.tsx")) {
      fileMap.set("app/layout.tsx", {
        path: "app/layout.tsx",
        content: `import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '${projectName}',
  description: 'A production-ready SaaS application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
`,
        language: "typescript"
      });
    }
    if (!fileMap.has("app/providers.tsx")) {
      fileMap.set("app/providers.tsx", {
        path: "app/providers.tsx",
        content: `'use client';

import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
`,
        language: "typescript"
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
//# sourceMappingURL=chunk-QBPNHOKU.mjs.map
