/**
 * PERSONAL TOOL GENERATOR - AutoForge 2.0
 *
 * File: src/lib/generation/personal-tool-generator.ts
 *
 * Generates simple, single-user personal tools with:
 * - localStorage for data persistence
 * - No authentication
 * - No payment system
 * - 10-15 files (vs 40-50 for SaaS)
 * - Fast generation (~$0.15-0.25 vs ~$0.65)
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../prisma';
import type { GeneratedFile, GenerationResult, StreamCallbacks } from './bolt-generator';
import { getAnthropicClient, isSimulationMode } from '../mock-anthropic';

// ============================================================================
// PERSONAL TOOL SYSTEM PROMPT
// ============================================================================

const PERSONAL_TOOL_SYSTEM_PROMPT = `You are a WORLD-CLASS full-stack engineer building PERSONAL TOOLS for single users.

## PHILOSOPHY

Personal tools are:
- Simple and focused (one main purpose)
- Fast to build (10-15 files maximum)
- Easy to use (no sign-up required)
- Offline-capable (localStorage)
- Beautiful and professional

## CRITICAL REQUIREMENTS

1. Generate 10-15 files maximum (keep it simple!)
2. NO authentication - single user only
3. NO payment integration
4. Use **localStorage** for data persistence
5. Complete, working implementation (NO TODOs, NO placeholders)
6. Beautiful, professional UI with Tailwind CSS
7. Dark theme with modern design
8. Full CRUD operations for data
9. Proper TypeScript types
10. Clean, well-organized code

## MANDATORY TECH STACK

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode - no 'any' types)
- **Styling**: Tailwind CSS (dark theme, zinc/slate palette)
- **Data**: localStorage (browser storage)
- **Icons**: lucide-react
- **Forms**: react-hook-form + zod validation
- **State**: React hooks (useState, useEffect)

## LOCALSTORAGE PATTERN

### lib/storage.ts (REQUIRED FILE):
\`\`\`typescript
/**
 * localStorage Helper with TypeScript Support
 * Handles SSR safely and provides type-safe get/set
 */

export const storage = {
  /**
   * Get item from localStorage with type safety
   */
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(\`Failed to get \${key} from storage:\`, error);
      return null;
    }
  },

  /**
   * Set item in localStorage with type safety
   */
  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(\`Failed to set \${key} in storage:\`, error);
    }
  },

  /**
   * Remove item from localStorage
   */
  remove(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(\`Failed to remove \${key} from storage:\`, error);
    }
  },

  /**
   * Clear all items from localStorage
   */
  clear(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  },
};
\`\`\`

### Example Component Using Storage:
\`\`\`typescript
'use client';

import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load tasks from storage on mount
  useEffect(() => {
    const savedTasks = storage.get<Task[]>('tasks');
    if (savedTasks) {
      setTasks(savedTasks);
    }
    setIsLoading(false);
  }, []);

  // Save tasks to storage whenever they change
  useEffect(() => {
    if (!isLoading) {
      storage.set('tasks', tasks);
    }
  }, [tasks, isLoading]);

  const addTask = (title: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTasks([...tasks, newTask]);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Task UI here */}
    </div>
  );
}
\`\`\`

## REQUIRED FILES

1. **package.json** - Dependencies (minimal set)
2. **app/layout.tsx** - Root layout (NO auth provider, NO Clerk)
3. **app/page.tsx** - Main tool interface
4. **lib/storage.ts** - localStorage helper (REQUIRED)
5. **lib/types.ts** - TypeScript types
6. **components/ui/** - shadcn components (Button, Card, Input, etc.)
7. **tailwind.config.js** - Tailwind configuration
8. **tsconfig.json** - TypeScript configuration
9. **next.config.mjs** - Next.js configuration (minimal)
10. **app/globals.css** - Tailwind styles

## DEPENDENCIES (package.json)

Keep dependencies MINIMAL:

\`\`\`json
{
  "name": "personal-tool",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "typescript": "^5.4.5",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "lucide-react": "^0.263.1",
    "react-hook-form": "^7.51.0",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.4",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.2"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "14.2.5"
  }
}
\`\`\`

## UI DESIGN PRINCIPLES

1. **Dark Theme**: Use zinc/slate color palette
2. **Modern**: Rounded corners, subtle shadows, smooth animations
3. **Professional**: Clean typography, proper spacing
4. **Accessible**: ARIA labels, keyboard navigation
5. **Responsive**: Mobile-first design

### Color Palette:
- Background: bg-zinc-950
- Cards: bg-zinc-900/50 with border-zinc-800
- Text: text-zinc-100 (primary), text-zinc-400 (secondary)
- Accent: violet-500, indigo-500
- Borders: border-zinc-800

### Example Layout:
\`\`\`tsx
export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold">Tool Name</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
\`\`\`

## DATA PATTERNS

### Use UUIDs for IDs:
\`\`\`typescript
id: crypto.randomUUID()
\`\`\`

### Store Timestamps as ISO Strings:
\`\`\`typescript
createdAt: new Date().toISOString()
\`\`\`

### Type Everything:
\`\`\`typescript
interface Item {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}
\`\`\`

## OUTPUT FORMAT

You MUST output files in this exact format:

<file path="package.json">
{
  "name": "my-tool",
  ...
}
</file>

<file path="app/page.tsx">
// Component code here
</file>

## IMPORTANT NOTES

- NO Clerk, NO NextAuth, NO authentication
- NO Supabase, NO Prisma, NO external databases
- NO Stripe, NO payments
- localStorage ONLY for data
- Keep it simple, focused, and fast
- Generate COMPLETE, WORKING code
- NO placeholders or TODOs

## EXAMPLE TOOLS

Good examples of personal tools:
- Todo list with categories
- Habit tracker with streaks
- Expense tracker with charts
- Note-taking app with markdown
- Pomodoro timer with stats
- Bookmark manager with tags
- Password generator with history
- Recipe organizer with search
- Workout tracker with progress charts
- Time tracker with project tags

BUILD THE BEST PERSONAL TOOL EVER!`;

// ============================================================================
// PERSONAL TOOL GENERATOR CLASS
// ============================================================================

export class PersonalToolGenerator {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = getAnthropicClient(apiKey);

    if (isSimulationMode()) {
      console.log('🎭 [PERSONAL TOOL GENERATOR] Running in simulation mode');
    }
  }

  /**
   * Generate a personal tool from a prompt
   */
  async generate(
    prompt: string,
    jobId?: string,
    callbacks?: StreamCallbacks
  ): Promise<GenerationResult> {
    try {
      console.log('\n🛠️  PERSONAL TOOL GENERATION');
      console.log(`   Prompt: "${prompt.slice(0, 100)}..."`);
      console.log(`   Target: 10-15 files, ~$0.15-0.25 cost\n`);

      callbacks?.onProgress?.('Generating personal tool...');

      // Build user prompt
      const userPrompt = this.buildUserPrompt(prompt);

      // Call Claude API
      const stream = await this.client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 32000, // Smaller than SaaS (64K), but enough for personal tools
        temperature: 0.7,
        system: PERSONAL_TOOL_SYSTEM_PROMPT,
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

      // Parse files from response
      const files = this.parseFiles(responseText);

      console.log(`\n✅ Personal Tool Generated`);
      console.log(`   Files: ${files.length}`);
      console.log(`   Stop Reason: ${stopReason}`);

      if (files.length === 0) {
        throw new Error('No files were generated from the response');
      }

      // Verify required files
      this.verifyRequiredFiles(files);

      callbacks?.onProgress?.(`Generated ${files.length} files`);

      return {
        success: true,
        files,
        tokensUsed: (await stream.finalMessage()).usage.output_tokens,
      };

    } catch (error) {
      console.error('❌ Personal Tool Generation Error:', error);
      callbacks?.onError?.(error instanceof Error ? error.message : 'Unknown error');

      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build the user prompt
   */
  private buildUserPrompt(prompt: string): string {
    return `Build a personal tool for this request:

${prompt}

Remember:
- 10-15 files maximum
- Use localStorage for data
- No authentication
- No payments
- Beautiful dark theme UI
- Complete, working implementation

Generate ALL necessary files now.`;
  }

  /**
   * Parse files from Claude's response
   */
  private parseFiles(responseText: string): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;

    let match;
    while ((match = fileRegex.exec(responseText)) !== null) {
      const path = match[1];
      const content = match[2].trim();

      // Infer language from file extension
      const language = this.inferLanguage(path);

      files.push({
        path,
        content,
        language,
      });
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
      'html': 'html',
      'yml': 'yaml',
      'yaml': 'yaml',
      'env': 'bash',
      'sh': 'bash',
    };

    return languageMap[ext || ''] || 'text';
  }

  /**
   * Verify that required files are present
   */
  private verifyRequiredFiles(files: GeneratedFile[]): void {
    const requiredFiles = [
      'package.json',
      'lib/storage.ts',
      'app/layout.tsx',
      'app/page.tsx',
      'tailwind.config.js',
    ];

    const filePaths = files.map(f => f.path);

    for (const required of requiredFiles) {
      if (!filePaths.includes(required)) {
        console.warn(`⚠️  Missing required file: ${required}`);
      }
    }

    // Verify lib/storage.ts exists
    const storageFile = files.find(f => f.path === 'lib/storage.ts');
    if (!storageFile) {
      throw new Error('CRITICAL: lib/storage.ts is missing! Personal tools require localStorage helper.');
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const personalToolGenerator = new PersonalToolGenerator();
