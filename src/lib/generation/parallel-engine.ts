import PQueue from 'p-queue';
import { Anthropic } from '@anthropic-ai/sdk';
import { moduleStore } from '../modules/module-store';
import { prisma } from '../prisma';
import { ModuleCategory } from '@/types/prisma-types';

export interface GenerationTask {
  moduleId?: string;
  moduleName: string;
  category: ModuleCategory;
  description: string;
  dependencies: string[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

export interface GenerationResult {
  moduleName: string;
  code: string;
  success: boolean;
  error?: string;
  generatedModuleId?: string;
}

export class ParallelGenerationEngine {
  private queue: PQueue;
  private client: Anthropic;
  private jobId: string;
  private progressCallback?: (progress: number, completed: number, total: number) => void;

  constructor(jobId: string) {
    this.jobId = jobId;
    this.queue = new PQueue({ 
      concurrency: 1,
      timeout: 600000
    });
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key'
    });
  }

  /**
   * Set callback for progress updates
   */
  onProgress(callback: (progress: number, completed: number, total: number) => void) {
    this.progressCallback = callback;
  }

  /**
   * Generate multiple modules in parallel
   */
  async generateModules(tasks: GenerationTask[]): Promise<GenerationResult[]> {
    console.log(`🚀 Starting parallel generation of ${tasks.length} modules for job ${this.jobId}`);

    // Update job status
    await prisma.generationJob.update({
      where: { id: this.jobId },
      data: {
        status: 'RUNNING',
        generationStartedAt: new Date(),
        totalModules: tasks.length
      }
    });

    const results: GenerationResult[] = [];
    let completed = 0;

    // Add all tasks to queue
    const promises = tasks.map(task =>
      this.queue.add(async () => {
        const result = await this.generateSingleModule(task);
        
        completed++;
        const progress = (completed / tasks.length) * 100;
        
        // Update progress
        await prisma.generationJob.update({
          where: { id: this.jobId },
          data: { 
            completedModules: completed,
            failedModules: results.filter(r => !r.success).length
          }
        });

        // Call progress callback
        if (this.progressCallback) {
          this.progressCallback(progress, completed, tasks.length);
        }

        console.log(`✅ [${completed}/${tasks.length}] ${task.moduleName}`);
        
        return result;
      })
    );

    // Wait for all to complete
    const completedResults = await Promise.all(promises);
    
    console.log(`🎉 Generation complete: ${completedResults.filter(r => r.success).length}/${tasks.length} successful`);
    
    return completedResults;
  }

  /**
   * Generate a single module
   */
  private async generateSingleModule(task: GenerationTask): Promise<GenerationResult> {
    try {
      // Check if we should use an existing module
      if (task.moduleId) {
        const existingModule = await moduleStore.getById(task.moduleId);
        if (existingModule) {
          await moduleStore.recordUsage(task.moduleId, true);

          return {
            moduleName: task.moduleName,
            code: existingModule.code,
            success: true,
            generatedModuleId: task.moduleId
          };
        }
      }

      // NEVER use cached modules for main-page - always generate fresh
      const isMainPage = task.moduleName.toLowerCase().includes('main-page');
      
      if (!isMainPage) {
        // Search for similar existing modules for non-main-page modules
        const similarModules = await moduleStore.search({
          category: task.category,
          query: task.moduleName,
          limit: 1,
          minSuccessRate: 0.85
        });

        if (similarModules.length > 0) {
          const foundModule = similarModules[0];
          console.log(`♻️  Using similar module: ${foundModule.name}`);
          
          await moduleStore.recordUsage(foundModule.id, true);
          
          return {
            moduleName: task.moduleName,
            code: foundModule.code,
            success: true,
            generatedModuleId: foundModule.id
          };
        }
      }

      // Generate new module
      console.log(`🔨 Generating new module: ${task.moduleName}`);
      const code = await this.callAIModel(task);
      
      // Store the new module
      const newModule = await moduleStore.create({
        name: task.moduleName,
        description: task.description,
        code,
        category: task.category,
        tags: this.extractTags(task),
        framework: 'nextjs',
        language: 'typescript'
      });

      return {
        moduleName: task.moduleName,
        code,
        success: true,
        generatedModuleId: newModule.id
      };

    } catch (error) {
      console.error(`❌ Failed to generate ${task.moduleName}:`, error);

      await prisma.generationTelemetry.create({
        data: {
          generationJobId: this.jobId,
          eventType: 'module_generation_failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          stackTrace: error instanceof Error ? error.stack : undefined
        }
      });

      return {
        moduleName: task.moduleName,
        code: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Call AI to generate module code
   * Uses Claude for ALL modules (highest quality)
   */
  private async callAIModel(task: GenerationTask): Promise<string> {
    const isMainPage = task.moduleName.toLowerCase().includes('main-page');
    
    // Use Claude for everything - highest quality generations
    console.log(`☁️  Using Claude API for ${task.moduleName}`);
    
    let prompt: string;
    
    if (isMainPage) {
      // Special prompt for main page - complete working application
      prompt = `Create a COMPLETE, FULLY FUNCTIONAL Next.js 16 page component.

Description: ${task.description}
Target file: app/page.tsx

CRITICAL REQUIREMENTS:
1. This is the MAIN application page - include ALL functionality described
2. Must use 'use client' directive at the top for interactivity
3. Use React hooks (useState, useEffect, etc.) for state management
4. Include complete, working UI - not just a placeholder
5. Use Tailwind CSS for all styling
6. Must be production-ready and fully functional
7. All code in a SINGLE file - no external imports except React hooks
8. Make it beautiful and responsive

Example structure for a todo app:
\`\`\`typescript
'use client';

import { useState } from 'react';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    if (input.trim()) {
      setTodos([...todos, { id: Date.now(), text: input, completed: false }]);
      setInput('');
    }
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Todo List
        </h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTodo()}
              placeholder="Add a new todo..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={addTodo}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add
            </button>
          </div>
          
          <div className="space-y-2">
            {todos.map(todo => (
              <div
                key={todo.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className={\`flex-1 \${todo.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}\`}>
                  {todo.text}
                </span>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="px-3 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
            
            {todos.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No todos yet. Add one above!
              </p>
            )}
          </div>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          {todos.filter(t => !t.completed).length} tasks remaining
        </div>
      </div>
    </main>
  );
}
\`\`\`

NOW CREATE THE COMPLETE, WORKING APPLICATION based on: ${task.description}

Return ONLY the TypeScript code for app/page.tsx, no markdown blocks, no explanations.
Start with 'use client'; and make it FULLY FUNCTIONAL.`;
    } else {
      // Regular module prompt
      prompt = `Create a TypeScript module for Next.js 16.

Module: ${task.moduleName}
Description: ${task.description}
Category: ${task.category}

Requirements:
- TypeScript with proper types
- Proper imports and exports
- Production-ready code
- Follow Next.js 16 best practices
- If it's a UI component, use Tailwind CSS
- Include all necessary functionality
- Clean, well-structured code

Return ONLY the code, no markdown blocks, no explanations.`;
    }

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: isMainPage ? 4000 : 2000,
      temperature: isMainPage ? 0.7 : 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude');
    }

    let code = content.text.trim();
    
    // Clean up markdown if present
    code = code
      .replace(/```typescript\n?/g, '')
      .replace(/```tsx\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    // Ensure 'use client' directive for main pages
    if (isMainPage && !code.includes('use client')) {
      code = "'use client';\n\n" + code;
    }

    return code;
  }

  /**
   * Extract tags from task for better categorization
   */
  private extractTags(task: GenerationTask): string[] {
    const tags: string[] = [task.category.toLowerCase()];
    
    const nameWords = task.moduleName.split('-');
    tags.push(...nameWords);
    
    const descWords = task.description.toLowerCase().split(' ');
    const keywords = ['auth', 'payment', 'database', 'api', 'stripe', 'prisma', 'nextauth'];
    
    for (const keyword of keywords) {
      if (descWords.includes(keyword)) {
        tags.push(keyword);
      }
    }
    
    return [...new Set(tags)];
  }

  /**
   * Get current progress
   */
  getProgress(): { completed: number; total: number; pending: number } {
    return {
      completed: this.queue.size - this.queue.pending,
      total: this.queue.size,
      pending: this.queue.pending
    };
  }

  /**
   * Cancel all pending generations
   */
  async cancel(): Promise<void> {
    this.queue.clear();
    
    await prisma.generationJob.update({
      where: { id: this.jobId },
      data: { status: 'CANCELLED' }
    });
    
    console.log(`🛑 Generation cancelled for job ${this.jobId}`);
  }
}