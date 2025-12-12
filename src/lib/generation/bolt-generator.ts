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

const MANAGED_STACK_SYSTEM_PROMPT = `You are an expert full-stack engineer building production-ready applications using the AutoForge Managed Stack.

## CRITICAL: TECH STACK (MANDATORY - DO NOT DEVIATE)

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS (dark theme, zinc/violet palette)
- **Authentication**: Clerk (NOT NextAuth - NEVER use NextAuth)
- **Database**: Supabase (PostgreSQL via @supabase/ssr)
- **Payments**: Stripe
- **State**: Zustand (client), React Query (server)
- **Icons**: lucide-react

## OUTPUT FORMAT

You MUST output files using EXACTLY this format:

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

## WHAT NOT TO DO

- NEVER use NextAuth (use Clerk)
- NEVER use raw Prisma Client (use Supabase client)
- NEVER use border-border, bg-background, text-foreground
- NEVER create marketing websites (build applications)
- NEVER forget the middleware.ts file
- NEVER forget the ClerkProvider in layout.tsx
`;

// ============================================================================
// PREMIUM UI PROMPT BUILDER
// ============================================================================

function buildUserPrompt(userRequest: string): string {
  const isAIRequest = /\b(ai agent|chatbot|llm|gpt|claude|openai|langchain|langgraph|ai assistant|chat with ai|ai-powered|machine learning|neural)\b/i.test(userRequest);
  const isDashboard = /\b(dashboard|analytics|admin|panel|metrics|monitoring|reporting)\b/i.test(userRequest);
  const isKanban = /\b(kanban|board|trello|task|project management|todo)\b/i.test(userRequest);
  const isCRM = /\b(crm|customer|contacts|leads|sales|pipeline)\b/i.test(userRequest);
  const isInventory = /\b(inventory|stock|warehouse|products|catalog)\b/i.test(userRequest);
  const needsAuth = /\b(auth|login|signup|user|account|profile|dashboard)\b/i.test(userRequest);
  const needsPayments = /\b(payment|stripe|subscription|billing|checkout|pricing)\b/i.test(userRequest);

  let appHint = '';
  
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
  } else if (isAIRequest) {
    appHint = `
APPLICATION TYPE: AI Agent Interface
- Chat interface with message history
- User and AI message bubbles
- Loading state with typing indicator
- Input field with send button
- Use MOCK RESPONSES (no real AI API calls)
- Include UserButton from Clerk in header

⚠️ CRITICAL: This runs in WebContainer with NO API access.
Create a working SIMULATION with mock responses.
NO LangChain, NO OpenAI SDK, NO Anthropic SDK.`;
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

  return `Build a FUNCTIONAL APPLICATION for:

"${userRequest}"
${appHint}
${featureHints}

THIS IS AN APPLICATION, NOT A WEBSITE. Build it like Linear, Notion, or Figma.

CRITICAL REQUIREMENTS:
1. Use Clerk for authentication (NOT NextAuth)
2. Use Supabase client for database (NOT raw Prisma)
3. Include middleware.ts with Clerk protection
4. Include sign-in and sign-up pages
5. Use sidebar + main content layout
6. Include proper navigation with icons
7. Add data tables, forms, cards as needed
8. Include loading states, empty states, hover states
9. Dark mode with zinc/violet color scheme
10. Use standard Tailwind classes (no border-border, bg-background)
11. Include UserButton from @clerk/nextjs in authenticated areas
12. Use realistic mock data (not placeholder text)

Generate ALL required files starting with package.json.
Make this a PRODUCTION-READY application that works with AutoForge's managed infrastructure.`;
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

function addMissingEssentialFiles(files: GeneratedFile[], prompt: string): GeneratedFile[] {
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
      
      // Ensure Clerk
      pkg.dependencies = pkg.dependencies || {};
      if (!pkg.dependencies['@clerk/nextjs']) {
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
  
  // Ensure Clerk middleware
  if (!fileMap.has('middleware.ts')) {
    fileMap.set('middleware.ts', {
      path: 'middleware.ts',
      content: CLERK_MIDDLEWARE,
      language: 'typescript',
    });
  }
  
  // Ensure Clerk sign-in page
  if (!fileMap.has('app/sign-in/[[...sign-in]]/page.tsx')) {
    fileMap.set('app/sign-in/[[...sign-in]]/page.tsx', {
      path: 'app/sign-in/[[...sign-in]]/page.tsx',
      content: CLERK_SIGN_IN_PAGE,
      language: 'typescript',
    });
  }
  
  // Ensure Clerk sign-up page
  if (!fileMap.has('app/sign-up/[[...sign-up]]/page.tsx')) {
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
    console.log('🚀 AutoForge 2.0 Generation starting...');
    console.log(`   Prompt: "${prompt.slice(0, 100)}..."`);
    console.log('   Stack: Clerk + Supabase + Stripe');
    
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
      
      callbacks?.onProgress?.('Starting AI generation with managed stack...');
      
      // Use streaming for better timeout handling
      const stream = await this.client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        temperature: 0.7,
        system: MANAGED_STACK_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: buildUserPrompt(prompt)
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
      
      // Add any missing essential files (Clerk, Supabase, etc.)
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