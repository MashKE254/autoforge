/**
 * SAAS UPGRADE GENERATOR - AutoForge 2.0
 *
 * File: src/lib/generation/saas-upgrade-generator.ts
 *
 * Transforms personal tools into full SaaS applications by:
 * 1. Analyzing existing personal tool code
 * 2. Extracting business logic and data models
 * 3. Generating SaaS infrastructure (Clerk, Supabase, Stripe)
 * 4. Merging business logic into multi-tenant structure
 * 5. Adding monetization features
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../prisma';
import type { GeneratedFile, GenerationResult, StreamCallbacks } from './bolt-generator';

// ============================================================================
// SAAS UPGRADE SYSTEM PROMPT
// ============================================================================

const SAAS_UPGRADE_SYSTEM_PROMPT = `You are a WORLD-CLASS full-stack engineer upgrading PERSONAL TOOLS to FULL SAAS APPLICATIONS.

## YOUR MISSION

Transform a simple, single-user personal tool into a production-grade, multi-tenant SaaS application.

## CONTEXT PROVIDED

You will receive:
1. **Original Prompt**: The user's request that created the personal tool
2. **Personal Tool Files**: All code from the existing personal tool
3. **Data Models**: Extracted TypeScript interfaces from the personal tool

## TRANSFORMATION PROCESS

### 1. PRESERVE BUSINESS LOGIC ✅

**Keep These Exactly As-Is**:
- Core functionality and features
- UI components (adapt for multi-user context)
- Validation rules and business rules
- Utility functions
- Component structure

**Example**: If the personal tool is a habit tracker with streak calculations, keep the streak logic exactly the same.

### 2. ADD SAAS INFRASTRUCTURE 🏗️

#### Authentication (Clerk):
\`\`\`typescript
// middleware.ts
import { authMiddleware } from '@clerk/nextjs/server';

export default authMiddleware({
  publicRoutes: ['/', '/pricing', '/sign-in(.*)', '/sign-up(.*)'],
});

export const config = {
  matcher: ['/((?!.+\\\\.[\\\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
\`\`\`

\`\`\`typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
\`\`\`

\`\`\`typescript
// app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn routing="path" path="/sign-in" />
    </div>
  );
}
\`\`\`

\`\`\`typescript
// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignUp routing="path" path="/sign-up" />
    </div>
  );
}
\`\`\`

#### Multi-Tenant Database (Supabase):

**CRITICAL**: Add \`user_id\` to ALL data tables.

\`\`\`sql
-- Example: If personal tool had "tasks" in localStorage,
-- create Supabase table with user_id

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,  -- ✅ Clerk user ID
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own tasks"
  ON tasks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON tasks
  FOR DELETE
  USING (auth.uid() = user_id);
\`\`\`

\`\`\`typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component - ignore
          }
        },
      },
    }
  );
}
\`\`\`

\`\`\`typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
\`\`\`

**Convert localStorage → Supabase**:

\`\`\`typescript
// BEFORE (Personal Tool):
import { storage } from '@/lib/storage';
const tasks = storage.get<Task[]>('tasks') || [];
storage.set('tasks', newTasks);

// AFTER (SaaS):
import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

const { userId } = await auth();
const supabase = await createClient();

const { data: tasks } = await supabase
  .from('tasks')
  .select('*')
  .eq('user_id', userId);

await supabase.from('tasks').insert({
  user_id: userId,
  title: 'New task',
});
\`\`\`

#### Payments (Stripe):

\`\`\`typescript
// lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});
\`\`\`

\`\`\`typescript
// app/api/stripe/checkout/route.ts
import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { priceId } = await req.json();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: \`\${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true\`,
    cancel_url: \`\${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true\`,
    metadata: { userId },
  });

  return NextResponse.json({ url: session.url });
}
\`\`\`

#### Marketing Pages:

\`\`\`typescript
// app/page.tsx - Landing Page
export default function LandingPage() {
  return (
    <div>
      <Hero />
      <Features />
      <Pricing />
      <CTA />
    </div>
  );
}
\`\`\`

\`\`\`typescript
// app/pricing/page.tsx
export default function PricingPage() {
  return (
    <div>
      <h1>Choose Your Plan</h1>
      <PricingCards />
    </div>
  );
}
\`\`\`

### 3. FILE STRUCTURE

\`\`\`
app/
  (marketing)/          # Public pages
    page.tsx           # Landing page
    pricing/page.tsx   # Pricing
    layout.tsx         # Marketing layout
  (app)/               # Authenticated app
    dashboard/         # Main tool (from personal tool)
      page.tsx
    settings/page.tsx  # User settings
    billing/page.tsx   # Billing management
    layout.tsx         # App layout with sidebar
  sign-in/[[...sign-in]]/page.tsx
  sign-up/[[...sign-up]]/page.tsx
  api/
    stripe/
      checkout/route.ts
      webhook/route.ts
  layout.tsx           # Root layout (ClerkProvider)
  globals.css

lib/
  supabase/
    server.ts
    client.ts
  stripe.ts
  storage.ts           # REMOVE (replaced by Supabase)

components/
  marketing/
    hero.tsx
    features.tsx
    pricing-card.tsx
  ui/                  # Keep from personal tool
    button.tsx
    card.tsx
    ...
  [tool-specific]/     # Keep from personal tool

middleware.ts          # Clerk auth

supabase/
  migrations/
    001_initial.sql    # Database schema

MIGRATION_GUIDE.md     # Instructions for user
\`\`\`

### 4. MIGRATION GUIDE

Generate a \`MIGRATION_GUIDE.md\` file:

\`\`\`markdown
# Migration Guide: Personal Tool → SaaS

## Overview
Your personal tool has been upgraded to a full SaaS application!

## What Changed

### Data Storage
- **Before**: localStorage (browser only)
- **After**: Supabase PostgreSQL (cloud database)

### Authentication
- **Before**: No authentication (single user)
- **After**: Clerk (multi-user with sign-in/sign-up)

### Payments
- **Added**: Stripe subscriptions

## Setup Steps

1. **Supabase Setup**
   \\\`\\\`\\\`bash
   # Run migrations
   npx supabase migration up
   \\\`\\\`\\\`

2. **Environment Variables**
   \\\`\\\`\\\`env
   # Clerk
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=

   # Stripe
   STRIPE_SECRET_KEY=
   STRIPE_WEBHOOK_SECRET=
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   \\\`\\\`\\\`

3. **Migrating Existing Data** (if you have localStorage data)
   - Export localStorage data from browser console
   - Import into Supabase using provided script

## Testing

1. Sign up for a new account
2. Test all features
3. Test subscription flow
4. Verify data isolation (users can't see each other's data)

## Deployment

Deploy to Vercel with AutoForge's "Go Live" feature.
\`\`\`

## OUTPUT FORMAT

Use the exact same format as before:

<file path="package.json">
{content}
</file>

<file path="app/page.tsx">
{content}
</file>

## CRITICAL RULES

1. ✅ **Preserve ALL business logic** from the personal tool
2. ✅ **Add user_id to ALL database operations**
3. ✅ **Generate COMPLETE, WORKING code** (no TODOs)
4. ✅ **Include migration guide**
5. ✅ **Add Clerk authentication** to all protected routes
6. ✅ **Use Supabase RLS** for data security
7. ✅ **Include Stripe** subscription flow
8. ✅ **Create beautiful landing page** with pricing

## TECH STACK (SAME AS BOLTGENERATOR)

- Framework: Next.js 14 (App Router)
- Auth: Clerk
- Database: Supabase (PostgreSQL)
- Payments: Stripe
- Styling: Tailwind CSS
- Icons: lucide-react
- Forms: react-hook-form + zod
- State: React hooks + Zustand (if needed)

BUILD THE ULTIMATE SAAS UPGRADE!`;

// ============================================================================
// SAAS UPGRADE GENERATOR CLASS
// ============================================================================

export class SaaSUpgradeGenerator {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY!,
    });
  }

  /**
   * Upgrade a personal tool to SaaS
   */
  async upgradeTool(
    personalJobId: string,
    callbacks?: StreamCallbacks
  ): Promise<GenerationResult> {
    try {
      console.log('\n🚀 SAAS UPGRADE GENERATION');
      console.log(`   Personal Job ID: ${personalJobId}`);

      callbacks?.onProgress?.('Loading personal tool...');

      // 1. Fetch personal tool
      const personalJob = await prisma.generationJob.findUnique({
        where: { id: personalJobId },
        include: { files: true },
      });

      if (!personalJob) {
        throw new Error(`Personal tool job ${personalJobId} not found`);
      }

      if (personalJob.generationMode !== 'PERSONAL') {
        throw new Error(`Job ${personalJobId} is not a personal tool`);
      }

      console.log(`   Original Prompt: "${personalJob.prompt.slice(0, 100)}..."`);
      console.log(`   Files: ${personalJob.files.length}`);

      callbacks?.onProgress?.('Analyzing personal tool code...');

      // 2. Analyze personal tool
      const analysis = await this.analyzePersonalTool(personalJob.files);

      console.log(`\n📊 Analysis:`);
      console.log(`   Data Models: ${analysis.dataModels.length}`);
      console.log(`   Components: ${analysis.components.length}`);
      console.log(`   Features: ${analysis.features.length}`);

      callbacks?.onProgress?.('Generating SaaS infrastructure...');

      // 3. Generate SaaS upgrade
      const userPrompt = this.buildUpgradePrompt(
        personalJob.prompt,
        personalJob.files,
        analysis
      );

      const stream = await this.client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 64000, // Full SaaS needs more tokens
        temperature: 0.7,
        system: SAAS_UPGRADE_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: userPrompt,
        }],
      });

      // Collect response
      let responseText = '';
      let stopReason = '';

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          responseText += event.delta.text;
        }
        if (event.type === 'message_stop') {
          stopReason = (event as any).message?.stop_reason || 'unknown';
        }
      }

      // Parse files
      const files = this.parseFiles(responseText);

      console.log(`\n✅ SaaS Upgrade Generated`);
      console.log(`   Files: ${files.length}`);
      console.log(`   Stop Reason: ${stopReason}`);

      if (files.length === 0) {
        throw new Error('No files were generated from the upgrade');
      }

      callbacks?.onProgress?.(`Generated ${files.length} SaaS files`);

      return {
        success: true,
        files,
        tokensUsed: (await stream.finalMessage()).usage.output_tokens,
      };

    } catch (error) {
      console.error('❌ SaaS Upgrade Error:', error);
      callbacks?.onError?.(error instanceof Error ? error.message : 'Unknown error');

      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Analyze personal tool to extract data models, components, and features
   */
  private async analyzePersonalTool(files: Array<{ path: string; content: string }>) {
    const dataModels: string[] = [];
    const components: string[] = [];
    const features: string[] = [];

    for (const file of files) {
      // Extract TypeScript interfaces and types
      const interfaceMatches = file.content.matchAll(/interface\s+(\w+)\s*{([^}]+)}/g);
      for (const match of interfaceMatches) {
        dataModels.push(`interface ${match[1]} {${match[2]}}`);
      }

      // Extract type aliases
      const typeMatches = file.content.matchAll(/type\s+(\w+)\s*=\s*{([^}]+)}/g);
      for (const match of typeMatches) {
        dataModels.push(`type ${match[1]} = {${match[2]}}`);
      }

      // Extract component names
      if (file.path.includes('components/')) {
        const componentName = file.path.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, '');
        if (componentName) {
          components.push(componentName);
        }
      }

      // Extract feature descriptions from comments
      const featureComments = file.content.match(/\/\/\s*Feature:\s*(.+)/g);
      if (featureComments) {
        features.push(...featureComments.map(c => c.replace('//', '').trim()));
      }
    }

    return {
      dataModels: [...new Set(dataModels)],
      components: [...new Set(components)],
      features: [...new Set(features)],
    };
  }

  /**
   * Build upgrade prompt
   */
  private buildUpgradePrompt(
    originalPrompt: string,
    files: Array<{ path: string; content: string }>,
    analysis: { dataModels: string[]; components: string[]; features: string[] }
  ): string {
    // Build files listing
    const filesListing = files
      .map(f => `<file path="${f.path}">\n${f.content}\n</file>`)
      .join('\n\n');

    return `Upgrade this personal tool to a full SaaS application.

## ORIGINAL USER REQUEST
${originalPrompt}

## DATA MODELS FOUND
${analysis.dataModels.length > 0 ? analysis.dataModels.join('\n\n') : 'None found'}

## COMPONENTS FOUND
${analysis.components.length > 0 ? analysis.components.join(', ') : 'None found'}

## PERSONAL TOOL FILES

${filesListing}

## YOUR TASK

1. Analyze the personal tool's business logic
2. Generate a complete SaaS application that:
   - Preserves ALL features and functionality
   - Adds Clerk authentication
   - Converts localStorage → Supabase with user_id
   - Adds Stripe subscriptions
   - Includes landing page and pricing
   - Includes migration guide

Generate ALL files now.`;
  }

  /**
   * Parse files from response
   */
  private parseFiles(responseText: string): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;

    let match;
    while ((match = fileRegex.exec(responseText)) !== null) {
      const path = match[1];
      const content = match[2].trim();
      const language = this.inferLanguage(path);

      files.push({ path, content, language });
    }

    return files;
  }

  /**
   * Infer language from file path
   */
  private inferLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();

    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'json': 'json',
      'md': 'markdown',
      'css': 'css',
      'sql': 'sql',
      'env': 'bash',
    };

    return languageMap[ext || ''] || 'text';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const saasUpgradeGenerator = new SaaSUpgradeGenerator();
