# Personal Tool → SaaS Architecture

## Executive Summary

This document outlines the transformation of AutoForge from a "SaaS-first" to a "Personal Tool → SaaS" progression model.

**Core Philosophy**: Build simple personal tools first, validate through usage, then monetize by upgrading to full SaaS when ready.

## Current vs. New Architecture

### Current (SaaS-First):
```
User Prompt → UnifiedGenerator → BoltGenerator/OrchestratedGenerator
             ↓
  Full SaaS Stack (Clerk + Supabase + Stripe)
             ↓
  40-50+ files, ~$0.60-0.70 per generation
```

### New (Personal Tool → SaaS):
```
User Prompt + Mode Selection
    ↓
    ├─ Personal Tool Mode (DEFAULT)
    │   └→ PersonalToolGenerator
    │       └→ localStorage/Turso SQLite
    │       └→ No auth, no payments
    │       └→ 10-15 files, ~$0.15-0.25
    │       └→ [Monetize Button] ──→ SaaS Upgrade
    │                                      ↓
    └─ SaaS Mode (or Upgrade)              │
        └→ SaaSUpgradeGenerator ←──────────┘
            └→ Analyze existing personal tool code
            └→ Generate SaaS wrapper (auth + payments + multi-tenant)
            └→ Merge business logic
            └→ 40-50 total files, ~$0.60-0.70
```

## Benefits

1. **Faster Time to Value**: Users can build and use tools in minutes, not hours
2. **Lower Initial Cost**: 60-70% reduction in first generation cost
3. **Natural Validation**: Use before monetizing (like real startups)
4. **Better WebContainer Preview**: Simpler tools = fewer dependencies = more reliable preview
5. **Competitive Differentiation**: Unique workflow vs. Bolt.new/Lovable

## Technical Architecture

### 1. Database Schema Changes

#### Add to `GenerationJob` model:
```prisma
model GenerationJob {
  // ... existing fields

  // NEW: Generation mode tracking
  generationMode     GenerationMode    @default(PERSONAL)
  parentJobId        String?           // For upgraded SaaS, points to original personal tool

  // Relations
  parentJob          GenerationJob?    @relation("SaaSUpgrade", fields: [parentJobId], references: [id])
  upgradedJobs       GenerationJob[]   @relation("SaaSUpgrade")
}

enum GenerationMode {
  PERSONAL      // Simple, single-user tool
  SAAS          // Full SaaS with auth/payments
  SAAS_UPGRADE  // Personal tool upgraded to SaaS
}
```

### 2. Generator Architecture

#### 2.1 PersonalToolGenerator (`src/lib/generation/personal-tool-generator.ts`)

**Tech Stack**:
- Next.js 14 App Router
- TypeScript (strict)
- Tailwind CSS
- **localStorage** or **Turso SQLite** (edge-compatible)
- No authentication
- No payment system
- No multi-tenancy

**System Prompt** (simplified):
```typescript
const PERSONAL_TOOL_SYSTEM_PROMPT = `You are building a PERSONAL TOOL for a single user.

## CRITICAL REQUIREMENTS

1. Simple, focused implementation (10-15 files maximum)
2. No authentication - single user only
3. No payment integration
4. Use localStorage for data persistence OR Turso SQLite for local database
5. Clean, professional UI with Tailwind
6. Complete, working implementation (no TODOs)
7. Beautiful dark mode interface

## TECH STACK

- Framework: Next.js 14 (App Router)
- Language: TypeScript (strict)
- Styling: Tailwind CSS (dark theme)
- Data: localStorage OR Turso SQLite
- Icons: lucide-react
- Forms: react-hook-form + zod
- State: React hooks (useState, useEffect)

## STORAGE PATTERN (localStorage):

### lib/storage.ts:
\`\`\`typescript
export const storage = {
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  },

  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
};
\`\`\`

### Example Usage:
\`\`\`typescript
'use client';
import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';

export default function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);

  useEffect(() => {
    const saved = storage.get<Habit[]>('habits');
    if (saved) setHabits(saved);
  }, []);

  const addHabit = (habit: Habit) => {
    const updated = [...habits, habit];
    setHabits(updated);
    storage.set('habits', updated);
  };

  return <div>{/* UI */}</div>;
}
\`\`\`

## REQUIRED FILES

1. package.json
2. app/layout.tsx (no auth provider)
3. app/page.tsx (main tool interface)
4. lib/storage.ts (localStorage helper)
5. lib/types.ts (TypeScript types)
6. components/ui/* (shadcn components)
7. tailwind.config.js
8. tsconfig.json
9. next.config.mjs

## OUTPUT FORMAT

<file path="package.json">
{content}
</file>
`;
```

**Dependencies**:
```json
{
  "dependencies": {
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "tailwindcss": "^3.4.0",
    "lucide-react": "^0.263.1",
    "react-hook-form": "^7.51.0",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.4"
  }
}
```

#### 2.2 SaaSUpgradeGenerator (`src/lib/generation/saas-upgrade-generator.ts`)

**Purpose**: Transform existing personal tool into full SaaS application.

**Process**:
1. **Analyze** existing personal tool code
2. **Extract** business logic, data models, UI components
3. **Generate** SaaS infrastructure:
   - Clerk authentication
   - Supabase multi-tenant database
   - Stripe subscriptions
   - Landing page with pricing
   - Marketing pages
4. **Merge** business logic into SaaS structure
5. **Add** user_id to all data operations
6. **Generate** migration guide

**System Prompt**:
```typescript
const SAAS_UPGRADE_SYSTEM_PROMPT = `You are upgrading a PERSONAL TOOL to a FULL SAAS APPLICATION.

## CONTEXT

You will be provided with:
1. The original personal tool's code (all files)
2. The original user prompt
3. Data models extracted from the personal tool

## YOUR TASK

Transform this personal tool into a production-grade SaaS application by:

### 1. PRESERVE BUSINESS LOGIC
- Extract core functionality from the personal tool
- Keep UI components (adapt for multi-user)
- Maintain data models (add user_id fields)
- Preserve validation and business rules

### 2. ADD SAAS INFRASTRUCTURE

#### Authentication (Clerk):
- Add ClerkProvider to layout
- Create sign-in/sign-up pages
- Add middleware for route protection
- Implement user context

#### Multi-Tenant Database (Supabase):
- Convert localStorage → Supabase tables
- Add user_id to all tables
- Implement Row Level Security (RLS)
- Create Supabase client utilities

#### Payments (Stripe):
- Add subscription plans
- Create checkout flow
- Implement webhook handlers
- Add billing dashboard

#### Marketing Pages:
- Landing page with hero + features
- Pricing page with tiers
- Dashboard with subscription status

### 3. DATA MIGRATION GUIDE

Generate a \`MIGRATION_GUIDE.md\` file that explains:
- How to migrate localStorage data to Supabase
- Database schema changes
- Environment variables needed
- Testing steps

## NEW TECH STACK

- Framework: Next.js 14 (App Router)
- Auth: Clerk
- Database: Supabase (PostgreSQL)
- Payments: Stripe
- Styling: Tailwind CSS
- Everything else: Same as personal tool

## OUTPUT FORMAT

Same as before - use <file path="..."> tags.

IMPORTANT: Generate ALL files needed for the SaaS version.
`;
```

**Upgrade Process**:
```typescript
async upgradeTool(personalJobId: string): Promise<GenerationResult> {
  // 1. Fetch personal tool files
  const personalJob = await prisma.generationJob.findUnique({
    where: { id: personalJobId },
    include: { files: true },
  });

  // 2. Analyze code structure
  const analysis = await this.analyzePersonalTool(personalJob.files);

  // 3. Extract business logic
  const businessLogic = this.extractBusinessLogic(analysis);

  // 4. Generate SaaS wrapper with Claude
  const saasFiles = await this.generateSaaSWrapper(
    personalJob.prompt,
    businessLogic,
    personalJob.files
  );

  // 5. Return complete SaaS application
  return {
    success: true,
    files: saasFiles,
  };
}
```

### 3. UnifiedGenerator Updates

Update `UnifiedGenerator.generate()` to accept mode parameter:

```typescript
async generate(
  prompt: string,
  mode: 'PERSONAL' | 'SAAS' | 'AUTO' = 'AUTO',
  jobId?: string,
  callbacks?: StreamCallbacks
): Promise<GenerationResult> {

  // If AUTO, analyze prompt to determine mode
  if (mode === 'AUTO') {
    mode = this.shouldGenerateAsSaaS(prompt) ? 'SAAS' : 'PERSONAL';
  }

  callbacks?.onProgress?.(`Mode: ${mode}`);

  if (mode === 'PERSONAL') {
    // Use PersonalToolGenerator
    return await this.personalToolGenerator.generate(prompt, jobId, callbacks);
  } else {
    // Use existing BoltGenerator/OrchestratedGenerator for SaaS
    return await this.generateSaaS(prompt, jobId, callbacks);
  }
}

private shouldGenerateAsSaaS(prompt: string): boolean {
  const lower = prompt.toLowerCase();

  // Explicit SaaS indicators
  if (lower.includes('saas') || lower.includes('subscription') ||
      lower.includes('multi-user') || lower.includes('sign up')) {
    return true;
  }

  // Default to personal tool
  return false;
}
```

### 4. API Updates

#### Update `/api/generate/route.ts`:

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt, mode = 'PERSONAL' } = body;

  // Validate mode
  if (!['PERSONAL', 'SAAS', 'AUTO'].includes(mode)) {
    return NextResponse.json(
      { error: 'Invalid mode. Must be PERSONAL, SAAS, or AUTO' },
      { status: 400 }
    );
  }

  // Create job with mode
  const job = await prisma.generationJob.create({
    data: {
      userId: user.id,
      prompt: trimmedPrompt,
      status: 'RUNNING',
      generationMode: mode === 'AUTO' ? 'PERSONAL' : mode,
      generationStartedAt: new Date(),
    },
  });

  // Generate with mode
  const result = await unifiedGenerator.generate(
    trimmedPrompt,
    mode,
    job.id,
    callbacks
  );

  // ... rest of the code
}
```

#### Create `/api/generate/upgrade/route.ts`:

```typescript
/**
 * Upgrade a personal tool to SaaS
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { personalJobId } = await request.json();

  // Verify ownership
  const personalJob = await prisma.generationJob.findUnique({
    where: {
      id: personalJobId,
      userId: session.user.id,
      generationMode: 'PERSONAL',
    },
  });

  if (!personalJob) {
    return NextResponse.json({ error: 'Personal tool not found' }, { status: 404 });
  }

  // Create new SaaS job
  const saasJob = await prisma.generationJob.create({
    data: {
      userId: session.user.id,
      prompt: `Upgrade to SaaS: ${personalJob.prompt}`,
      status: 'RUNNING',
      generationMode: 'SAAS_UPGRADE',
      parentJobId: personalJobId,
      generationStartedAt: new Date(),
    },
  });

  // Perform upgrade
  const result = await saasUpgradeGenerator.upgradeTool(personalJobId);

  // Save files
  for (const file of result.files) {
    await prisma.generatedFile.create({
      data: {
        generationJobId: saasJob.id,
        path: file.path,
        content: file.content,
        language: file.language,
      },
    });
  }

  // Update job
  await prisma.generationJob.update({
    where: { id: saasJob.id },
    data: {
      status: 'COMPLETED',
      generationCompletedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    saasJobId: saasJob.id,
    fileCount: result.files.length,
  });
}
```

### 5. UI Updates

#### 5.1 Mode Selector on Dashboard

Add mode toggle before generation:

```typescript
// components/mode-selector.tsx
'use client';

import { useState } from 'react';
import { User, Users } from 'lucide-react';

export function ModeSelector({
  onModeChange
}: {
  onModeChange: (mode: 'PERSONAL' | 'SAAS') => void
}) {
  const [mode, setMode] = useState<'PERSONAL' | 'SAAS'>('PERSONAL');

  const handleChange = (newMode: 'PERSONAL' | 'SAAS') => {
    setMode(newMode);
    onModeChange(newMode);
  };

  return (
    <div className="flex gap-4 mb-6">
      <button
        onClick={() => handleChange('PERSONAL')}
        className={`flex-1 p-6 rounded-xl border-2 transition-all ${
          mode === 'PERSONAL'
            ? 'border-violet-500 bg-violet-500/10'
            : 'border-gray-700 hover:border-gray-600'
        }`}
      >
        <User className="w-8 h-8 mb-3 text-violet-500" />
        <h3 className="text-lg font-semibold mb-1">Personal Tool</h3>
        <p className="text-sm text-gray-400">
          Build for yourself. Free to share. Simple and fast.
        </p>
        <div className="mt-3 text-xs text-gray-500">
          ~10-15 files • ~$0.20 • No auth • localStorage
        </div>
      </button>

      <button
        onClick={() => handleChange('SAAS')}
        className={`flex-1 p-6 rounded-xl border-2 transition-all ${
          mode === 'SAAS'
            ? 'border-violet-500 bg-violet-500/10'
            : 'border-gray-700 hover:border-gray-600'
        }`}
      >
        <Users className="w-8 h-8 mb-3 text-violet-500" />
        <h3 className="text-lg font-semibold mb-1">Full SaaS</h3>
        <p className="text-sm text-gray-400">
          Multi-user app with auth, payments, and database.
        </p>
        <div className="mt-3 text-xs text-gray-500">
          ~40-50 files • ~$0.65 • Clerk • Supabase • Stripe
        </div>
      </button>
    </div>
  );
}
```

#### 5.2 Monetize Button on Job Page

Add "Upgrade to SaaS" button for personal tools:

```typescript
// components/monetize-button.tsx
'use client';

import { useState } from 'react';
import { DollarSign, Loader2 } from 'lucide-react';

export function MonetizeButton({ jobId }: { jobId: string }) {
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setIsUpgrading(true);

    const response = await fetch('/api/generate/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personalJobId: jobId }),
    });

    const data = await response.json();

    if (data.success) {
      window.location.href = `/job/${data.saasJobId}`;
    }
  };

  return (
    <button
      onClick={handleUpgrade}
      disabled={isUpgrading}
      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all"
    >
      {isUpgrading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Upgrading to SaaS...
        </>
      ) : (
        <>
          <DollarSign className="w-5 h-5" />
          Monetize This Tool
        </>
      )}
    </button>
  );
}
```

Update job page to show monetize button for personal tools:

```typescript
// src/app/job/[jobId]/page.tsx
import { MonetizeButton } from '@/components/monetize-button';

export default async function JobPage({ params }: { params: Promise<{ jobId: string }> }) {
  // ... existing code

  return (
    <div>
      {/* Existing UI */}

      {initialJob.generationMode === 'PERSONAL' && initialJob.status === 'COMPLETED' && (
        <div className="bg-gradient-to-r from-violet-900/20 to-indigo-900/20 border border-violet-500/30 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-semibold mb-2">
            Ready to Monetize?
          </h3>
          <p className="text-gray-400 mb-4">
            Upgrade this personal tool to a full SaaS application with:
          </p>
          <ul className="list-disc list-inside text-gray-400 mb-6 space-y-1">
            <li>User authentication (Clerk)</li>
            <li>Multi-tenant database (Supabase)</li>
            <li>Subscription payments (Stripe)</li>
            <li>Landing page with pricing</li>
            <li>Professional marketing pages</li>
          </ul>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Cost: ~$0.65 | Time: ~2 minutes
            </div>
            <MonetizeButton jobId={initialJob.id} />
          </div>
        </div>
      )}

      {/* Rest of UI */}
    </div>
  );
}
```

### 6. WebContainer Updates

Update WebContainer sanitization to handle localStorage-based personal tools:

```typescript
// src/lib/webcontainer-utils.ts

export function sanitizeForWebContainer(files: GeneratedFile[]): GeneratedFile[] {
  // Detect if this is a personal tool (no Clerk, no Supabase)
  const hasClerk = files.some(f => f.content.includes('@clerk/nextjs'));
  const hasSupabase = files.some(f => f.content.includes('@supabase/ssr'));
  const isPersonalTool = !hasClerk && !hasSupabase;

  if (isPersonalTool) {
    // Personal tools should work fine in WebContainer (localStorage is supported)
    return files.map(file => ({
      ...file,
      content: sanitizePersonalToolFile(file),
    }));
  } else {
    // SaaS tools need existing sanitization
    return files.map(file => ({
      ...file,
      content: sanitizeSaaSFile(file),
    }));
  }
}

function sanitizePersonalToolFile(file: GeneratedFile): string {
  let content = file.content;

  // Personal tools are simpler - just basic safety checks

  // Make sure localStorage is used safely (with window checks)
  content = content.replace(
    /localStorage\.(getItem|setItem|removeItem)/g,
    (match, method) => {
      return `(typeof window !== 'undefined' ? localStorage.${method} : ${
        method === 'getItem' ? 'null' : 'undefined'
      })`;
    }
  );

  return content;
}
```

## Implementation Plan

### Phase 1: Database & Core Infrastructure (Day 1)
1. ✅ Update Prisma schema
2. ✅ Run migrations
3. ✅ Create PersonalToolGenerator class
4. ✅ Create SaaSUpgradeGenerator class
5. ✅ Update UnifiedGenerator

### Phase 2: API Layer (Day 1-2)
6. ✅ Update `/api/generate/route.ts` to accept mode
7. ✅ Create `/api/generate/upgrade/route.ts`
8. ✅ Test API endpoints

### Phase 3: UI Components (Day 2)
9. ✅ Create ModeSelector component
10. ✅ Create MonetizeButton component
11. ✅ Update Dashboard to show mode selector
12. ✅ Update Job page to show monetize button

### Phase 4: Testing & Refinement (Day 2-3)
13. ✅ Test personal tool generation
14. ✅ Test SaaS upgrade flow
15. ✅ Test WebContainer with both modes
16. ✅ Refine prompts based on results

### Phase 5: Documentation (Day 3)
17. ✅ Update README
18. ✅ Create user-facing documentation
19. ✅ Record demo video

## Success Metrics

- Personal tool generation: <30 seconds
- Personal tool file count: 10-15 files
- Personal tool cost: <$0.25
- SaaS upgrade time: <2 minutes
- SaaS upgrade file count: 40-50 files
- SaaS upgrade cost: <$0.70
- WebContainer success rate: >95% for personal tools

## Migration Path for Existing Users

Existing users with SaaS apps are unaffected. New default is PERSONAL mode, but users can always choose SAAS mode explicitly.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Upgrade quality issues | Thorough testing, detailed prompts |
| localStorage limitations | Offer Turso SQLite alternative |
| User confusion | Clear UI, tooltips, documentation |
| Incomplete upgrades | Validate generated SaaS code |

## Future Enhancements

1. **Smart Upgrade Analysis**: AI suggests when to upgrade based on usage
2. **Turso SQLite Integration**: Better than localStorage for complex data
3. **One-Click Deploy**: Deploy personal tools to Vercel instantly
4. **Template Library**: Pre-built personal tool templates
5. **Gradual Upgrade**: Add features incrementally (auth → DB → payments)

---

**Status**: Ready for implementation
**Owner**: AutoForge Core Team
**Timeline**: 3 days
**Priority**: HIGH
