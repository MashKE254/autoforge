/**
 * BOLT GENERATOR - AutoForge 2.0
 * 
 * File: src/lib/generation/bolt-generator.ts
 * 
 * Single-pass application generator that creates complete Next.js applications
 * using the AutoForge Managed Stack:
 * - Clerk for authentication (NOT NextAuth)
 * - Supabase for database (NOT raw Prisma)
 * - Stripe for payments
 * - Tailwind CSS for styling
 * 
 * This generator produces code that works INSTANTLY when deployed
 * with AutoForge's managed infrastructure.
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../prisma';
import { PRODUCTION_PATTERNS } from './production-patterns';
import {
  AI_ASSISTANT_PATTERNS,
  WORKFLOW_AUTOMATION_PATTERNS,
  BOT_PATTERNS,
  AI_AGENT_PATTERNS,
} from './ai-systems-patterns';


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
  onProgress?: (message: string) => void;
  onFileComplete?: (path: string, content: string) => void;
  onError?: (error: string) => void;
}

// ============================================================================
// MANAGED STACK SYSTEM PROMPT
// ============================================================================

const MANAGED_STACK_SYSTEM_PROMPT = `You are a WORLD-CLASS full-stack engineer building PRODUCTION-GRADE applications that EXCEED the quality of bolt.new, lovable.dev, and v0.dev.

AutoForge is NOT for MVPs. AutoForge builds PROFESSIONAL, INDUSTRY-GRADE systems and platforms used by real companies.

## CRITICAL REQUIREMENTS

1. Generate 30-50+ files minimum for complex applications
2. **GENERATE ALL PAGES** - If the user asks for multiple pages/features, you MUST generate every single one
3. Complete, working implementations (NO TODOs, NO placeholders)
4. Production-ready error handling, loading states, validation
5. Proper architecture with separation of concerns
6. Type-safe throughout (strict TypeScript)
7. Real API integrations (not fake/mock implementations)
8. Beautiful, professional UI with animations and polish
9. Comprehensive database schemas
10. Full authentication flows
11. Complete CRUD operations for ALL entities
12. **DO NOT STOP** until all pages, components, and features are generated

## CODE QUALITY & SYNTAX RULES (CRITICAL - ZERO TOLERANCE)

Your code goes through AST-based syntax validation. ANY syntax error will cause build failure.

### Common Mistakes to AVOID:

❌ **Invalid property access:**
\`\`\`typescript
// WRONG - Invalid syntax
prev.(Array.isArray(tasks) ? tasks : [])

// CORRECT
const prevTasks = Array.isArray(prev) ? prev : [];
\`\`\`

❌ **Unclosed JSX tags:**
\`\`\`typescript
// WRONG - Unclosed div
<div>
  <span>Content

// CORRECT - All tags closed
<div>
  <span>Content</span>
</div>
\`\`\`

❌ **Bracket mismatches:**
\`\`\`typescript
// WRONG - Mismatched brackets
const data = { name: 'test', items: [1, 2, 3};

// CORRECT - All brackets match
const data = { name: 'test', items: [1, 2, 3] };
\`\`\`

❌ **Invalid spread/destructuring:**
\`\`\`typescript
// WRONG - Can't spread into expression
{...item.isActive && <Badge />}

// CORRECT - Proper conditional rendering
{item.isActive && <Badge {...item} />}
\`\`\`

❌ **Async/await errors:**
\`\`\`typescript
// WRONG - Missing await
const data = supabase.from('tasks').select();

// CORRECT - Proper async handling
const { data } = await supabase.from('tasks').select();
\`\`\`

### Self-Check Before Submitting:

✅ All brackets match: () [] {}
✅ All JSX tags are closed properly
✅ No invalid property access patterns
✅ Proper async/await usage
✅ Valid TypeScript syntax throughout
✅ No expression syntax errors

### If You Make a Mistake:

STOP and regenerate the entire file with correct syntax. Do NOT submit files with syntax errors.

## COMPONENT GENERATION RULES (CRITICAL - ZERO TOLERANCE)

**EVERY component you import MUST have a corresponding file in your generation.**

### Pre-Flight Checklist (Before Finishing):

✅ **Scan ALL files for imports** - Every \`import { Component } from './path'\` must have a file
✅ **No placeholder components** - Every component must be FULLY implemented
✅ **No "TODO" comments** - Everything must be production-ready
✅ **All components are interactive** - Buttons work, forms submit, data updates

### What Makes a Component "Complete":

**✅ CORRECT Example:**
\`\`\`tsx
// components/tasks/task-list.tsx
'use client';
import { useState } from 'react';
import { TaskCard } from './task-card';

export function TaskList() {
  // Demo data built-in for WebContainer
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Design dashboard', status: 'in-progress', priority: 'high' },
    { id: '2', title: 'Fix login bug', status: 'todo', priority: 'urgent' },
    { id: '3', title: 'Write docs', status: 'done', priority: 'low' },
  ]);

  const handleStatusChange = (id: string, newStatus: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  return (
    <div className="space-y-4">
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onStatusChange={handleStatusChange}
        />
      ))}
    </div>
  );
}
\`\`\`

**❌ WRONG - This creates placeholders:**
\`\`\`tsx
// app/dashboard/page.tsx
import { TaskList } from '@/components/tasks/task-list'; // ← File doesn't exist!

// This will generate:
// "Component: TaskList - This is a placeholder"
\`\`\`

**❌ WRONG - Incomplete implementation:**
\`\`\`tsx
export function TaskList() {
  // TODO: Implement task list
  return <div>Coming soon</div>;
}
\`\`\`

### Component Requirements:

**1. Full UI Implementation:**
- Complete JSX structure with proper styling
- All child components must also be generated
- Proper responsive design with Tailwind

**2. Built-in Demo Data:**
- Use \`useState\` with realistic mock data
- Data should demonstrate all features
- At least 3-5 items to show functionality

**3. Full Interactivity:**
- onClick handlers that DO something
- Forms that submit and update state
- Buttons that trigger actions
- Smooth animations and transitions

**4. Proper TypeScript:**
- Full type definitions (no \`any\` unless WebContainer mocks)
- Proper prop interfaces
- Type-safe state management

### Import Verification Protocol:

**BEFORE you finish generation:**

1. **List all imports** you've used across ALL files
2. **Verify each imported component has a file** in your generation
3. **If a component is missing**, generate it NOW with full implementation
4. **Double-check** - scan the file list one more time

**Example self-check:**
\`\`\`
Files I'm importing:
- TaskList from './task-list' ← Need to generate components/tasks/task-list.tsx
- TaskCard from './task-card' ← Need to generate components/tasks/task-card.tsx
- CreateTaskDialog from './create-task-dialog' ← Need to generate components/tasks/create-task-dialog.tsx

Files I've generated:
✅ components/tasks/task-list.tsx (complete with demo data)
✅ components/tasks/task-card.tsx (complete with interactions)
✅ components/tasks/create-task-dialog.tsx (complete form)

All imports accounted for! ✅
\`\`\`

## MANDATORY TECH STACK

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode - no 'any' types)
- **Styling**: Tailwind CSS (dark theme, zinc/violet palette)
- **Authentication**: Clerk (NOT NextAuth)
- **Database**: Supabase (PostgreSQL via @supabase/ssr)
- **Payments**: Stripe (when needed)
- **State**: Zustand (client), React Query (server)
- **Icons**: lucide-react
- **Charts**: Recharts (for analytics)
- **Forms**: react-hook-form + zod
- **Tables**: @tanstack/react-table

## OUTPUT FORMAT

<file path="package.json">
{content}
</file>

<file path="app/page.tsx">
{content}
</file>

## AUTHENTICATION WITH CLERK

NEVER use NextAuth. ALWAYS use Clerk:

### Server Components:
\`\`\`tsx
import { currentUser, auth } from '@clerk/nextjs/server';

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  return <div>Hello {user?.firstName}</div>;
}
\`\`\`

### Client Components:
\`\`\`tsx
'use client';
import { useUser, useAuth } from '@clerk/nextjs';

export function Profile() {
  const { user, isLoaded } = useUser();
  const { userId } = useAuth();
  
  if (!isLoaded) return <div>Loading...</div>;
  
  return <div>Hello {user?.firstName}</div>;
}
\`\`\`

### API Routes:
\`\`\`tsx
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return NextResponse.json({ userId });
}
\`\`\`

### User Button:
\`\`\`tsx
import { UserButton } from '@clerk/nextjs';

export function Header() {
  return (
    <header>
      <UserButton afterSignOutUrl="/" />
    </header>
  );
}
\`\`\`

## DATABASE WITH SUPABASE

Use Supabase client, NOT raw Prisma:

### Server-side Client (lib/supabase/server.ts):
\`\`\`tsx
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

### Client-side Client (lib/supabase/client.ts):
\`\`\`tsx
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
\`\`\`

### Using in Server Components:
\`\`\`tsx
import { createClient } from '@/lib/supabase/server';

export default async function ProjectsPage() {
  const supabase = await createClient();
  
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching projects:', error);
    return <div>Error loading projects</div>;
  }
    
  return <ProjectList projects={projects || []} />;
}
\`\`\`

### Using in Client Components:
\`\`\`tsx
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ProjectList() {
  const [projects, setProjects] = useState([]);
  const supabase = createClient();
  
  useEffect(() => {
    async function fetchProjects() {
      const { data } = await supabase
        .from('projects')
        .select('*');
      setProjects(data || []);
    }
    fetchProjects();
  }, []);
  
  return <div>{/* render projects */}</div>;
}
\`\`\`

## STRIPE PAYMENTS

\`\`\`tsx
// app/api/stripe/checkout/route.ts
import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { priceId } = await request.json();
  
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

## REQUIRED FILES FOR EVERY APP

1. \`package.json\` - with correct dependencies
2. \`middleware.ts\` - Clerk route protection
3. \`app/layout.tsx\` - ClerkProvider wrapper
4. \`app/sign-in/[[...sign-in]]/page.tsx\` - Sign in page
5. \`app/sign-up/[[...sign-up]]/page.tsx\` - Sign up page
6. \`lib/supabase/server.ts\` - Server-side Supabase client
7. \`lib/supabase/client.ts\` - Client-side Supabase client
8. \`app/globals.css\` - Tailwind styles
9. \`tailwind.config.js\` - Tailwind configuration
10. \`tsconfig.json\` - TypeScript configuration
11. \`next.config.mjs\` - Next.js configuration

## DEPENDENCIES (package.json)

\`\`\`json
{
  "dependencies": {
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "@clerk/nextjs": "^5.0.0",
    "@supabase/ssr": "^0.4.0",
    "@supabase/supabase-js": "^2.45.0",
    "stripe": "^14.0.0",
    "lucide-react": "^0.400.0",
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.0.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "typescript": "5.5.2",
    "@types/node": "20.14.2",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.0",
    "tailwindcss": "3.4.4",
    "postcss": "8.4.38",
    "autoprefixer": "10.4.19",
    "source-map-js": "^1.2.0"
  }
}
\`\`\`

## MIDDLEWARE (middleware.ts)

\`\`\`tsx
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/pricing',
  '/about',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
\`\`\`

## ROOT LAYOUT (app/layout.tsx)

**CRITICAL: Layout files are Server Components - NEVER add "use client" to layout.tsx files!**

\`\`\`tsx
import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'App Name',
  description: 'App description',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
\`\`\`

## UI DESIGN PRINCIPLES

Build APPLICATIONS like Linear, Notion, Figma - NOT marketing websites.

**Layout Pattern (Sidebar + Main):**
\`\`\`tsx
<div className="flex h-screen bg-zinc-950">
  <aside className="w-64 border-r border-white/10 p-4">
    {/* Sidebar content */}
  </aside>
  <main className="flex-1 overflow-auto p-6">
    {/* Main content */}
  </main>
</div>
\`\`\`

**Color Palette:**
- Background: bg-zinc-950, bg-zinc-900
- Borders: border-white/10, border-white/5
- Text: text-white, text-gray-400, text-gray-500
- Accent: violet-500, violet-600, indigo-500

**Component Patterns:**
- Cards: bg-zinc-900 border border-white/10 rounded-xl
- Buttons: bg-violet-600 hover:bg-violet-500 rounded-lg
- Inputs: bg-white/5 border border-white/10 rounded-lg

## CSS RULES (CRITICAL)

1. Use @tailwind directives, NOT @import
2. Use border-white/10, NOT border-border
3. Use bg-zinc-900, NOT bg-background
4. Use text-white, NOT text-foreground
5. NO Google Fonts @import in CSS (use next/font)

## REQUIRED FILE STRUCTURE (PRODUCTION-GRADE)

You MUST generate a comprehensive file structure. For complex applications, generate 30-50+ files.

### Core Configuration (REQUIRED):
- package.json (with ALL dependencies)
- tsconfig.json
- tailwind.config.js
- postcss.config.js
- next.config.js
- .env.example (with ALL env vars needed)
- middleware.ts (Clerk auth protection)

### App Directory Structure:
app/
  layout.tsx (with ClerkProvider, fonts, metadata)
  page.tsx (landing or dashboard)
  globals.css

  (auth)/
    sign-in/[[...sign-in]]/page.tsx
    sign-up/[[...sign-up]]/page.tsx

  dashboard/
    page.tsx
    layout.tsx (with sidebar navigation)

  [additional-routes]/
    page.tsx
    loading.tsx
    error.tsx

  api/
    [endpoint]/route.ts (with auth checks)

### Library Code (lib/):
lib/
  supabase/
    server.ts (server client)
    client.ts (browser client)

  db/
    schema.sql (Supabase schema)
    types.ts (database types)

  actions/
    [resource].ts (server actions with zod validation)

  stores/
    [store].ts (Zustand stores for client state)

  utils/
    cn.ts (className utility)
    formatters.ts (date, currency, etc.)
    validators.ts (zod schemas)

  hooks/
    use-[hook].ts (custom React hooks)

### Components (components/):
components/
  ui/
    button.tsx
    card.tsx
    input.tsx
    select.tsx
    dialog.tsx
    table.tsx
    badge.tsx
    avatar.tsx
    skeleton.tsx
    toast.tsx
    tabs.tsx
    dropdown-menu.tsx

  [feature]/
    [component].tsx (feature-specific components)

  layout/
    sidebar.tsx
    header.tsx
    navigation.tsx

  forms/
    [form-name].tsx (with react-hook-form + zod)

  tables/
    [table-name].tsx (with @tanstack/react-table)

  charts/
    [chart-name].tsx (with Recharts)

### Types (types/):
types/
  index.ts (shared types)
  database.ts (database types)
  api.ts (API types)

## PRODUCTION-GRADE REQUIREMENTS

### 1. COMPLETE IMPLEMENTATIONS
- NO "// TODO: implement this later"
- NO placeholder functions
- NO mock data that says "replace with real data"
- REAL implementations that work immediately

### 2. ERROR HANDLING
Every API route and server action MUST have:
- try/catch blocks
- Proper error messages
- HTTP status codes
- Type-safe error responses

Example:
\`\`\`ts
export async function createPost(data: CreatePostInput) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const validated = createPostSchema.parse(data);
    const supabase = await createClient();

    const { data: post, error } = await supabase
      .from('posts')
      .insert(validated)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: post };
  } catch (error) {
    console.error('Create post failed:', error);
    return { success: false, error: 'Failed to create post' };
  }
}
\`\`\`

### 3. LOADING STATES
Every page MUST have:
- loading.tsx with Skeleton components
- Suspense boundaries where appropriate
- Loading indicators for client mutations

### 4. EMPTY STATES
Every list/table MUST have:
- Empty state UI when no data
- Call-to-action button
- Helpful message

### 5. VALIDATION
Every form MUST have:
- Zod schema for validation
- react-hook-form integration
- Error message display
- Disabled submit during loading

### 6. TYPE SAFETY
- NO 'any' types
- Proper TypeScript interfaces
- Database types generated/inferred
- API response types

### 7. DATABASE SCHEMA
Generate complete SQL schema with:
- Proper foreign keys
- Indexes on frequently queried columns
- created_at, updated_at timestamps
- RLS (Row Level Security) policies for Supabase

Example schema.sql:
\`\`\`sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Posts table
create table posts (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  title text not null,
  content text,
  status text default 'draft',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes
create index posts_user_id_idx on posts(user_id);
create index posts_created_at_idx on posts(created_at desc);

-- RLS
alter table posts enable row level security;

create policy "Users can read own posts"
  on posts for select
  using (auth.uid()::text = user_id);
\`\`\`

### 8. PROFESSIONAL UI
- Consistent spacing (gap-4, gap-6, gap-8)
- Proper hover states (hover:bg-zinc-800)
- Focus states (focus:ring-2 focus:ring-violet-500)
- Smooth transitions (transition-colors duration-200)
- Loading skeletons (animate-pulse)
- Icons from lucide-react
- Responsive design (sm:, md:, lg: breakpoints)

### 9. NAVIGATION
- Sidebar with logo at top
- Navigation items with icons
- Active state highlighting
- UserButton at bottom
- Mobile-responsive (hamburger menu)

### 10. DATA TABLES
Use @tanstack/react-table with:
- Sorting
- Filtering
- Pagination
- Row selection
- Column visibility toggles
- Responsive design

## WHAT NOT TO DO

- NEVER use NextAuth (use Clerk)
- NEVER use raw Prisma Client (use Supabase client)
- NEVER use border-border, bg-background, text-foreground
- NEVER create marketing websites (build applications)
- NEVER forget the middleware.ts file
- NEVER forget the ClerkProvider in layout.tsx
- NEVER generate less than 20 files for complex apps
- NEVER use placeholder/TODO comments
- NEVER skip error handling
- NEVER skip loading states
- NEVER skip type safety
`;

// ============================================================================
// PREMIUM UI PROMPT BUILDER
// ============================================================================

function buildUserPrompt(userRequest: string, singleUser: boolean = false, preview: boolean = false): string {
  // AI Systems Detection
  const isAIAssistant = /\b(ai assistant|chatbot|chat|llm|gpt|claude|openai|ai-powered chat|conversational ai|cybersecurity education|educational assistant)\b/i.test(userRequest);
  const isWorkflow = /\b(workflow|automation|zapier|trigger|action|n8n|make|integromat|automate)\b/i.test(userRequest);
  const isBot = /\b(bot|discord bot|slack bot|telegram bot|whatsapp bot)\b/i.test(userRequest);
  const isAIAgent = /\b(ai agent|autonomous agent|agentic|langchain|langgraph|tool calling|autonomous)\b/i.test(userRequest);

  // App Types Detection
  const isDashboard = /\b(dashboard|analytics|admin|panel|metrics|monitoring|reporting)\b/i.test(userRequest);
  const isKanban = /\b(kanban|board|trello|task|project management|todo)\b/i.test(userRequest);
  const isCRM = /\b(crm|customer|contacts|leads|sales|pipeline)\b/i.test(userRequest);
  const isInventory = /\b(inventory|stock|warehouse|products|catalog)\b/i.test(userRequest);
  const needsAuth = /\b(auth|login|signup|user|account|profile|dashboard)\b/i.test(userRequest);
  const needsPayments = /\b(payment|stripe|subscription|billing|checkout|pricing)\b/i.test(userRequest);

  let appHint = '';
  let aiSystemsPatterns = '';
  
  if (isDashboard) {
    appHint = `
APPLICATION TYPE: Dashboard/Analytics
- Use sidebar + main content layout
- Include stats cards at the top
- Add charts using recharts (LineChart, BarChart, AreaChart)
- Include a data table with recent items
- Add date range filters
- Include UserButton from Clerk in header`;
  } else if (isKanban) {
    appHint = `
APPLICATION TYPE: Project/Task Management
- Use sidebar navigation with projects list
- Main content shows Kanban columns (To Do, In Progress, Review, Done)
- Task cards with title, priority indicator, assignee avatar
- Add new task button on each column
- Include task count badges
- Include UserButton from Clerk in header`;
  } else if (isCRM) {
    appHint = `
APPLICATION TYPE: CRM/Contacts
- Sidebar with navigation (Dashboard, Contacts, Deals, Tasks)
- Main data table with contacts/leads
- Status badges (Lead, Qualified, Customer)
- Quick actions (Email, Call, Edit)
- Search and filter bar
- Include UserButton from Clerk in header`;
  } else if (isInventory) {
    appHint = `
APPLICATION TYPE: Inventory/Catalog
- Product table with image, name, SKU, quantity, price
- Low stock warnings
- Category filters
- Add/Edit product modal
- Search functionality
- Include UserButton from Clerk in header`;
  }

  // AI Systems - Inject Real Patterns
  if (isAIAssistant) {
    aiSystemsPatterns += AI_ASSISTANT_PATTERNS;
    appHint = `
APPLICATION TYPE: AI Assistant / Chatbot

✅ GENERATE A REAL, WORKING AI ASSISTANT:
- Full Anthropic API integration (streaming + non-streaming)
- Database-backed conversation history
- Server actions for message handling
- Beautiful chat UI with typing indicators
- Support for specialized assistants (cybersecurity, education, etc.)
- Optional: RAG for knowledge-base powered responses
- Optional: Multi-modal support (images, files)

NO MOCKS! Generate production-ready AI chat with real API calls.`;
  }

  if (isWorkflow) {
    aiSystemsPatterns += WORKFLOW_AUTOMATION_PATTERNS;
    appHint += `

APPLICATION TYPE: Workflow Automation

✅ GENERATE A REAL WORKFLOW ENGINE (BETTER THAN ZAPIER):
- Complete workflow executor with database storage
- Visual workflow builder (drag-and-drop)
- Triggers: webhook, schedule, manual, events
- Actions: HTTP, email, database, AI tasks, transformations
- Conditions and loops
- Detailed execution history
- Better than Zapier (self-hosted, unlimited, AI-native)

Generate production-ready workflow automation system.`;
  }

  if (isBot) {
    aiSystemsPatterns += BOT_PATTERNS;
    appHint += `

APPLICATION TYPE: Bot (Discord/Slack/Telegram)

✅ GENERATE A REAL BOT:
- Full platform integration (Discord.js, Slack Bolt, Telegraf)
- AI-powered responses with conversation memory
- Proper event handling and commands
- Error handling and retries
- Production-ready deployment scripts

Generate working bots with real platform SDKs.`;
  }

  if (isAIAgent) {
    aiSystemsPatterns += AI_AGENT_PATTERNS;
    appHint += `

APPLICATION TYPE: Autonomous AI Agent

✅ GENERATE A REAL AUTONOMOUS AGENT:
- Tool-calling AI agent with Claude
- Extensible tool system (web search, calculator, database, email, etc.)
- Multi-step task execution
- Self-correction and retries
- Task automation and research capabilities

Generate production-ready autonomous agents.`;
  }

  // Add auth/payment hints
  let featureHints = '';
  if (needsAuth) {
    featureHints += `
AUTHENTICATION:
- Use Clerk for all authentication
- Add sign-in and sign-up pages
- Protect dashboard routes with middleware
- Show UserButton in authenticated areas`;
  }
  
  if (needsPayments) {
    featureHints += `
PAYMENTS:
- Include Stripe integration
- Add pricing page with plans
- Create checkout API route
- Add billing/subscription management`;
  }

  return `Build a PRODUCTION-GRADE, PROFESSIONAL APPLICATION for:

"${userRequest}"
${appHint}
${featureHints}
${aiSystemsPatterns ? '\n\n## AI SYSTEMS IMPLEMENTATION PATTERNS\n\n' + aiSystemsPatterns : ''}

## CRITICAL: THIS MUST BE INDUSTRY-GRADE

AutoForge is NOT for MVPs. This must be a COMPLETE, PROFESSIONAL application that exceeds bolt.new and lovable.dev quality.

## MANDATORY FILE GENERATION

Generate AT LEAST 30-50 files including:

### Configuration (7 files):
1. package.json (with ALL dependencies: @clerk/nextjs, @supabase/ssr, @tanstack/react-table, recharts, react-hook-form, zod, zustand, lucide-react, etc.)
2. tsconfig.json
3. tailwind.config.js
4. postcss.config.js
5. next.config.js
6. .env.example (list ALL environment variables)
7. middleware.ts (Clerk auth)

### App Routes (10+ files):
8. app/layout.tsx (with ClerkProvider)
9. app/page.tsx
10. app/globals.css
11. app/(auth)/sign-in/[[...sign-in]]/page.tsx
12. app/(auth)/sign-up/[[...sign-up]]/page.tsx
13. app/dashboard/page.tsx
14. app/dashboard/layout.tsx (with sidebar)
15. app/dashboard/loading.tsx
16-20. Additional feature pages based on requirements

### Library Code (10+ files):
21. lib/supabase/server.ts
22. lib/supabase/client.ts
23. lib/db/schema.sql (complete database schema)
24. lib/db/types.ts
25. lib/utils/cn.ts
26. lib/utils/formatters.ts
27. lib/validators.ts (zod schemas)
28-30. lib/actions/ server actions

### Components (15+ files):
31. components/ui/button.tsx
32. components/ui/card.tsx
33. components/ui/input.tsx
34. components/ui/select.tsx
35. components/ui/dialog.tsx
36. components/ui/table.tsx
37. components/ui/badge.tsx
38. components/ui/skeleton.tsx
39. components/layout/sidebar.tsx
40. components/layout/header.tsx
41-45. Feature-specific components

### API Routes (5+ files):
46-50. app/api/[endpoints]/route.ts

## PRODUCTION REQUIREMENTS

1. **Complete Implementations**: NO TODOs, NO placeholders, REAL working code
2. **Error Handling**: Every function has try/catch, proper error messages
3. **Type Safety**: NO 'any' types, proper interfaces everywhere
4. **Loading States**: Every page has loading.tsx, forms have loading states
5. **Empty States**: Every list shows helpful empty state
6. **Validation**: All forms use react-hook-form + zod
7. **Database Schema**: Complete SQL schema in lib/db/schema.sql
8. **Professional UI**: Consistent spacing, hover states, transitions, icons
9. **Responsive**: Works on mobile, tablet, desktop
10. **Authentication**: Full Clerk integration with protected routes

## UI QUALITY STANDARDS

- Modern, polished design like Linear or Notion
- Smooth animations and transitions
- Consistent color palette (zinc/violet)
- Professional typography and spacing
- Icons from lucide-react
- Loading skeletons (not spinners)
- Toast notifications for actions
- Hover effects on interactive elements
- Focus states for accessibility

${preview ? `
## ⚠️ PREVIEW MODE - SPECIAL INSTRUCTIONS

This is a FREE PREVIEW with MOCK DATA. Generate a WebContainer-compatible app with:

### MOCK DATA REQUIREMENTS:
1. **NO External Integrations**: Skip Supabase, Clerk, Stripe, external APIs
2. **Hardcoded Data Arrays**: Generate realistic mock data directly in components
3. **localStorage ONLY**: Use localStorage for any data persistence
4. **No Auth**: Skip all authentication (no sign-in/sign-up pages, no middleware)
5. **No API Routes**: Skip all /api routes - use mock data in components instead

### EXAMPLE MOCK DATA PATTERN:
\`\`\`typescript
// Instead of fetching from Supabase:
const mockProjects = [
  { id: '1', title: 'Project Alpha', status: 'active', createdAt: '2024-01-15' },
  { id: '2', title: 'Project Beta', status: 'completed', createdAt: '2024-01-10' },
  // ... 5-10 realistic items
];
\`\`\`

### FILES TO GENERATE:
- package.json (only: react, next, tailwindcss, lucide-react, recharts, date-fns)
- App pages with mock data
- UI components (fully functional)
- NO Supabase files
- NO Clerk files
- NO API routes
- NO middleware.ts
- NO .env.example

### WHAT TO KEEP:
- ✅ Full UI implementation
- ✅ All interactions and animations
- ✅ Charts and visualizations (with mock data)
- ✅ Forms and validation (save to localStorage)
- ✅ Navigation and routing
- ✅ Responsive design

The preview should look and feel EXACTLY like the real app, just with fake data.
` : ''}

Generate ALL files immediately. Make this BETTER than what bolt.new or lovable.dev would create.`;
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
    sql: 'sql',
  };
  return map[ext] || 'plaintext';
}

// ============================================================================
// CSS SANITIZATION
// ============================================================================

function sanitizeGlobalsCss(css: string): string {
  let sanitized = css;
  
  // Remove Google Fonts imports
  sanitized = sanitized.replace(/@import\s+url\([^)]+fonts\.googleapis\.com[^)]+\);?\s*/g, '');
  
  // Fix Tailwind imports - convert @import to @tailwind
  sanitized = sanitized.replace(/@import\s+['"]tailwindcss\/base['"];?/g, '@tailwind base;');
  sanitized = sanitized.replace(/@import\s+['"]tailwindcss\/components['"];?/g, '@tailwind components;');
  sanitized = sanitized.replace(/@import\s+['"]tailwindcss\/utilities['"];?/g, '@tailwind utilities;');
  
  // Remove problematic shadcn/custom classes from CSS
  sanitized = sanitized.replace(
    /--[\w-]+:\s*[^;]*(?:bg-dark|border-border|bg-background|text-foreground)[^;]*;/g, 
    ''
  );
  
  // Replace theme variables that reference non-existent classes
  sanitized = sanitized.replace(
    /@apply\s+[^;]*(?:bg-dark-\d+|border-border|bg-background|text-foreground|bg-card|bg-muted|text-muted-foreground)[^;]*/g,
    (match) => {
      const remaining = match
        .replace(/bg-dark-\d+/g, 'bg-zinc-900')
        .replace(/border-border/g, 'border-white/10')
        .replace(/bg-background/g, 'bg-zinc-950')
        .replace(/text-foreground/g, 'text-white')
        .replace(/bg-card/g, 'bg-zinc-900')
        .replace(/bg-muted/g, 'bg-zinc-800')
        .replace(/text-muted-foreground/g, 'text-gray-400');
      return remaining + ';';
    }
  );
  
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
// FILE SANITIZATION
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
// ESSENTIAL FILES - CLERK + SUPABASE STACK
// ============================================================================

const CLERK_MIDDLEWARE = `import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/pricing',
  '/about',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
`;

const CLERK_SIGN_IN_PAGE = `import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <SignIn 
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-zinc-900 border border-white/10 shadow-xl',
            headerTitle: 'text-white',
            headerSubtitle: 'text-gray-400',
            socialButtonsBlockButton: 'bg-white/5 border border-white/10 text-white hover:bg-white/10',
            formFieldLabel: 'text-gray-400',
            formFieldInput: 'bg-white/5 border-white/10 text-white',
            footerActionLink: 'text-violet-400 hover:text-violet-300',
          },
        }}
      />
    </div>
  );
}
`;

const CLERK_SIGN_UP_PAGE = `import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <SignUp 
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-zinc-900 border border-white/10 shadow-xl',
            headerTitle: 'text-white',
            headerSubtitle: 'text-gray-400',
            socialButtonsBlockButton: 'bg-white/5 border border-white/10 text-white hover:bg-white/10',
            formFieldLabel: 'text-gray-400',
            formFieldInput: 'bg-white/5 border-white/10 text-white',
            footerActionLink: 'text-violet-400 hover:text-violet-300',
          },
        }}
      />
    </div>
  );
}
`;

const SUPABASE_SERVER_CLIENT = `import { createServerClient } from '@supabase/ssr';
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
            // The \`setAll\` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
`;

const SUPABASE_BROWSER_CLIENT = `import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
`;

const STRIPE_CLIENT = `import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
});
`;

const UTILS_FILE = `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

function addMissingEssentialFiles(files: GeneratedFile[], prompt: string, singleUser: boolean = false): GeneratedFile[] {
  const fileMap = new Map(files.map(f => [f.path, f]));
  const safeTitle = prompt.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'AutoForge App';
  
  // Ensure package.json with Clerk + Supabase stack
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
          '@clerk/nextjs': '^5.0.0',
          '@supabase/ssr': '^0.4.0',
          '@supabase/supabase-js': '^2.45.0',
          'lucide-react': '^0.400.0',
          clsx: '^2.1.1',
          'tailwind-merge': '^2.3.0',
          recharts: '^2.12.0',
          zustand: '^4.5.0',
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
    // Ensure existing package.json has required dependencies
    try {
      const existing = fileMap.get('package.json')!;
      const pkg = JSON.parse(existing.content);
      
      // Ensure engines
      if (!pkg.engines) {
        pkg.engines = { node: '18.x' };
      }
      
      // Ensure Clerk (SKIP for single-user apps)
      pkg.dependencies = pkg.dependencies || {};
      if (!singleUser && !pkg.dependencies['@clerk/nextjs']) {
        pkg.dependencies['@clerk/nextjs'] = '^5.0.0';
      }

      // Ensure Supabase
      if (!pkg.dependencies['@supabase/ssr']) {
        pkg.dependencies['@supabase/ssr'] = '^0.4.0';
      }
      if (!pkg.dependencies['@supabase/supabase-js']) {
        pkg.dependencies['@supabase/supabase-js'] = '^2.45.0';
      }
      
      // Ensure source-map-js for WebContainer
      pkg.devDependencies = pkg.devDependencies || {};
      if (!pkg.devDependencies['source-map-js']) {
        pkg.devDependencies['source-map-js'] = '^1.2.0';
      }
      
      // Remove NextAuth if present (we use Clerk)
      delete pkg.dependencies['next-auth'];
      delete pkg.dependencies['@auth/prisma-adapter'];
      
      fileMap.set('package.json', {
        ...existing,
        content: JSON.stringify(pkg, null, 2),
      });
    } catch (e) {
      console.warn('Could not parse package.json');
    }
  }
  
  // Ensure Clerk middleware (SKIP for single-user apps)
  if (!singleUser && !fileMap.has('middleware.ts')) {
    fileMap.set('middleware.ts', {
      path: 'middleware.ts',
      content: CLERK_MIDDLEWARE,
      language: 'typescript',
    });
  }

  // Ensure Clerk sign-in page (SKIP for single-user apps)
  if (!singleUser && !fileMap.has('app/sign-in/[[...sign-in]]/page.tsx')) {
    fileMap.set('app/sign-in/[[...sign-in]]/page.tsx', {
      path: 'app/sign-in/[[...sign-in]]/page.tsx',
      content: CLERK_SIGN_IN_PAGE,
      language: 'typescript',
    });
  }

  // Ensure Clerk sign-up page (SKIP for single-user apps)
  if (!singleUser && !fileMap.has('app/sign-up/[[...sign-up]]/page.tsx')) {
    fileMap.set('app/sign-up/[[...sign-up]]/page.tsx', {
      path: 'app/sign-up/[[...sign-up]]/page.tsx',
      content: CLERK_SIGN_UP_PAGE,
      language: 'typescript',
    });
  }
  
  // Ensure Supabase server client
  if (!fileMap.has('lib/supabase/server.ts')) {
    fileMap.set('lib/supabase/server.ts', {
      path: 'lib/supabase/server.ts',
      content: SUPABASE_SERVER_CLIENT,
      language: 'typescript',
    });
  }
  
  // Ensure Supabase browser client
  if (!fileMap.has('lib/supabase/client.ts')) {
    fileMap.set('lib/supabase/client.ts', {
      path: 'lib/supabase/client.ts',
      content: SUPABASE_BROWSER_CLIENT,
      language: 'typescript',
    });
  }
  
  // Ensure Stripe client (if needed)
  if (!fileMap.has('lib/stripe.ts')) {
    fileMap.set('lib/stripe.ts', {
      path: 'lib/stripe.ts',
      content: STRIPE_CLIENT,
      language: 'typescript',
    });
  }
  
  // Ensure utils
  if (!fileMap.has('lib/utils.ts')) {
    fileMap.set('lib/utils.ts', {
      path: 'lib/utils.ts',
      content: UTILS_FILE,
      language: 'typescript',
    });
  }
  
  // Ensure next.config.mjs
  if (!fileMap.has('next.config.mjs') && !fileMap.has('next.config.js')) {
    fileMap.set('next.config.mjs', {
      path: 'next.config.mjs',
      content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
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
  
  // Ensure tailwind.config.js
  if (!fileMap.has('tailwind.config.js') && !fileMap.has('tailwind.config.ts')) {
    fileMap.set('tailwind.config.js', {
      path: 'tailwind.config.js',
      content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        foreground: '#fafafa',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
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
  if (!fileMap.has('postcss.config.js') && !fileMap.has('postcss.config.mjs')) {
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
  
  // Ensure globals.css
  if (!fileMap.has('app/globals.css')) {
    fileMap.set('app/globals.css', {
      path: 'app/globals.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #09090b;
  --foreground: #fafafa;
}

html {
  color-scheme: dark;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, sans-serif;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgb(255 255 255 / 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgb(255 255 255 / 0.2);
}

/* Focus styles */
:focus-visible {
  outline: 2px solid rgb(139 92 246 / 0.5);
  outline-offset: 2px;
}

/* Smooth transitions */
* {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
`,
      language: 'css',
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
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  
  /**
   * Generate a complete application from a user prompt
   *
   * @param singleUser - If true, generates production-grade code WITHOUT Clerk auth (for single-user apps)
   */
  async generate(
    prompt: string,
    jobId?: string,
    callbacks?: StreamCallbacks,
    singleUser: boolean = false,
    preview: boolean = false
  ): Promise<GenerationResult> {
    console.log('🚀 AutoForge 2.0 Generation starting...');
    console.log(`   Prompt: "${prompt.slice(0, 100)}..."`);

    if (preview) {
      console.log(`   Mode: PREVIEW (free, mock data, no integrations)`);
    } else {
      console.log(`   Stack: ${singleUser ? 'Supabase (single-user)' : 'Clerk + Supabase + Stripe'}`);
    }

    try {
      // CRITICAL: Verify job still exists (race condition protection)
      if (jobId) {
        const jobExists = await prisma.generationJob.findUnique({
          where: { id: jobId },
          select: { id: true, status: true }
        });

        if (!jobExists) {
          console.log(`⚠️  Job ${jobId} was deleted (likely duplicate) - aborting generation`);
          throw new Error('Job was deleted due to duplicate detection');
        }

        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: 'RUNNING',
            generationStartedAt: new Date()
          }
        });
      }

      callbacks?.onProgress?.('Starting AI generation with managed stack...');

      // Build system prompt based on mode
      const systemPrompt = singleUser
        ? MANAGED_STACK_SYSTEM_PROMPT.replace(/## AUTHENTICATION WITH CLERK[\s\S]*?(?=##|$)/g, '## AUTHENTICATION\n\nNO AUTHENTICATION - This is a single-user application. Do not generate any auth pages or Clerk integration.\n\n') + '\n\n' + PRODUCTION_PATTERNS
        : MANAGED_STACK_SYSTEM_PROMPT + '\n\n' + PRODUCTION_PATTERNS;

      // Use streaming for better timeout handling
      const stream = await this.client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 64000, // CRITICAL: High limit for complete multi-page applications (30-50+ files)
        temperature: 0.7,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: buildUserPrompt(prompt, singleUser, preview)
        }]
      });
      
      let responseText = '';
      let stopReason = '';

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          responseText += event.delta.text;
        }
        if (event.type === 'message_stop') {
          // @ts-ignore - stopReason exists on final message
          stopReason = event.message?.stop_reason || 'unknown';
        }
      }

      // Check if generation was cut off due to token limit
      if (stopReason === 'max_tokens') {
        console.warn('⚠️  WARNING: Generation hit max_tokens limit! Output may be incomplete.');
        console.warn('⚠️  Consider increasing max_tokens or breaking prompt into smaller parts.');
        callbacks?.onProgress?.('⚠️ Generation may be incomplete (hit token limit)');
      }

      callbacks?.onProgress?.('Parsing generated files...');

      let files = parseFilesFromResponse(responseText);

      console.log(`   Parsed ${files.length} files from response (stop_reason: ${stopReason})`);

      // LAYER 2: VALIDATION & AUTO-FIX
      callbacks?.onProgress?.('🔍 Validating generated code...');
      const { validationPipeline } = await import('./validators');
      const validationResult = await validationPipeline.validateAndFix(files);

      // Check for critical errors that prevent deployment
      const criticalErrors = validationResult.allIssues.filter(i => i.severity === 'error');

      if (criticalErrors.length > 0) {
        console.error(`❌ Validation failed with ${criticalErrors.length} critical errors:`);
        criticalErrors.forEach(issue => {
          console.error(`   ${issue.file}:${issue.line} - ${issue.message}`);
        });

        callbacks?.onError?.(`Code validation failed: ${criticalErrors.length} syntax/import errors detected`);

        if (jobId) {
          await prisma.generationJob.update({
            where: { id: jobId },
            data: {
              status: 'FAILED',
              errorLog: `Validation failed:\n${criticalErrors.map(e => `${e.file}:${e.line} - ${e.message}`).join('\n')}`,
            },
          });
        }

        throw new Error(`Validation failed: Generated code has ${criticalErrors.length} critical errors. ${criticalErrors[0]?.file}: ${criticalErrors[0]?.message}`);
      }

      if (!validationResult.success) {
        console.warn(`⚠️  Validation found ${validationResult.summary.remainingIssues} non-critical issues`);
      } else {
        console.log(`✅ Validation passed: ${validationResult.summary.fixedIssues} issues auto-fixed`);
      }

      // Use validated/fixed files
      files = validationResult.files;

      // Sanitize all generated files (fix CSS issues, replace bad classes)
      files = sanitizeGeneratedFiles(files);

      // Add any missing essential files (Clerk, Supabase, etc.)
      files = addMissingEssentialFiles(files, prompt, singleUser);

      // LAYER 3: AUTO-INJECT INTEGRATIONS
      callbacks?.onProgress?.('🔌 Detecting and injecting integrations...');
      const { injectIntegrations } = await import('./integration-injector');
      const integrationResult = injectIntegrations(files, prompt);
      files = integrationResult.files;

      if (integrationResult.detectedIntegrations.length > 0) {
        console.log(`   ✅ Injected ${integrationResult.detectedIntegrations.length} integrations:`);
        integrationResult.detectedIntegrations.forEach(id => {
          console.log(`      - ${id}`);
        });
      }

      console.log('   Generated files:');
      files.forEach((f: GeneratedFile) => {
        console.log(`   - ${f.path} (${f.content.length} chars)`);
        callbacks?.onFileComplete?.(f.path, f.content);
      });
      
      // Save files to database if jobId provided
      if (jobId) {
        callbacks?.onProgress?.('Saving to database...');

        // Deduplicate files by path (keep last occurrence to allow integration overrides)
        const uniqueFiles = Array.from(
          files.reduce((map, file) => {
            map.set(file.path, file);
            return map;
          }, new Map<string, GeneratedFile>()).values()
        );

        console.log(`   💾 Saving ${uniqueFiles.length} unique files to database (deduplicated from ${files.length})...`);

        await prisma.$transaction([
          prisma.generatedFile.deleteMany({ where: { generationJobId: jobId } }),
          prisma.generatedFile.createMany({
            data: uniqueFiles.map((f: GeneratedFile) => ({
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