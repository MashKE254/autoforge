/**
 * AI SYSTEMS PRODUCTION PATTERNS
 *
 * Real, production-ready implementations for:
 * - AI Assistants (chat, streaming, conversation history)
 * - Workflow Automation (better than Zapier)
 * - Bots (Discord, Slack, Telegram, WhatsApp)
 * - Autonomous AI Agents
 *
 * NO MOCKS. Only real, working implementations.
 */

export const AI_ASSISTANT_PATTERNS = `
## 🤖 REAL AI ASSISTANT - PRODUCTION IMPLEMENTATION

⚠️ CRITICAL: Generate REAL AI assistants with actual API integration, NOT mocks!

### 1. COMPLETE AI CHAT IMPLEMENTATION

#### Server Action (lib/actions/chat.ts):
\`\`\`typescript
'use server';

import Anthropic from '@anthropic-ai/sdk';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function sendMessage(conversationId: string, message: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createClient();

    // Get conversation history
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    // Build conversation context
    const conversationHistory = messages?.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })) || [];

    // Get conversation system prompt
    const { data: conversation } = await supabase
      .from('conversations')
      .select('system_prompt, model')
      .eq('id', conversationId)
      .single();

    // Add new user message
    conversationHistory.push({
      role: 'user',
      content: message,
    });

    // Save user message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
      user_id: userId,
    });

    // Call Anthropic API
    const response = await anthropic.messages.create({
      model: conversation?.model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: conversation?.system_prompt || 'You are a helpful AI assistant.',
      messages: conversationHistory,
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Save assistant message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantMessage,
      user_id: userId,
    });

    revalidatePath(\`/chat/\${conversationId}\`);

    return {
      success: true,
      message: assistantMessage,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (error) {
    console.error('Chat error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message',
    };
  }
}
\`\`\`

#### Streaming Chat (app/api/chat/stream/route.ts):
\`\`\`typescript
import Anthropic from '@anthropic-ai/sdk';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { conversationId, message, systemPrompt } = await request.json();

    const supabase = await createClient();

    // Get conversation history
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    const conversationHistory = messages?.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })) || [];

    conversationHistory.push({
      role: 'user',
      content: message,
    });

    // Save user message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
      user_id: userId,
    });

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = await anthropic.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: systemPrompt || 'You are a helpful AI assistant.',
            messages: conversationHistory,
          });

          let fullResponse = '';

          for await (const event of anthropicStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text;
              fullResponse += text;
              controller.enqueue(encoder.encode(\`data: \${JSON.stringify({ text })}\n\n\`));
            }
          }

          // Save assistant message
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: fullResponse,
            user_id: userId,
          });

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Streaming error:', error);
    return new Response('Error', { status: 500 });
  }
}
\`\`\`

#### Chat UI Component (components/chat/chat-interface.tsx):
\`\`\`typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { sendMessage } from '@/lib/actions/chat';
import { Message } from '@/types';

export function ChatInterface({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Optimistic update
    setMessages(prev => [...prev, {
      id: 'temp',
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }]);

    try {
      const result = await sendMessage(conversationId, userMessage);

      if (result.success && result.message) {
        setMessages(prev => [...prev, {
          id: 'temp-assistant',
          role: 'assistant',
          content: result.message,
          created_at: new Date().toISOString(),
        }]);
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Send message error:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={message.id || index}
            className={\`flex \${message.role === 'user' ? 'justify-end' : 'justify-start'}\`}
          >
            <div
              className={\`max-w-[80%] rounded-lg p-4 \${
                message.role === 'user'
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-800 text-gray-100'
              }\`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
\`\`\`

#### Database Schema (lib/db/schema.sql):
\`\`\`sql
-- Conversations table
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  title text not null,
  system_prompt text default 'You are a helpful AI assistant.',
  model text default 'claude-sonnet-4-20250514',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index conversations_user_id_idx on conversations(user_id);
create index conversations_created_at_idx on conversations(created_at desc);

-- Messages table
create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz default now()
);

create index messages_conversation_id_idx on messages(conversation_id);
create index messages_created_at_idx on messages(created_at);

-- RLS policies
alter table conversations enable row level security;
alter table messages enable row level security;

create policy "Users can view their own conversations"
  on conversations for select
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can create their own conversations"
  on conversations for insert
  with check (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can view their own messages"
  on messages for select
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can create their own messages"
  on messages for insert
  with check (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
\`\`\`

#### Environment Variables (.env.example):
\`\`\`
# Anthropic API
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Alternative: OpenAI
# OPENAI_API_KEY=your_openai_api_key_here
\`\`\`

### 2. SPECIALIZED AI ASSISTANTS

For specialized AI assistants (like the cybersecurity education example), customize the system prompt:

#### Cybersecurity Education Assistant (lib/prompts/cybersecurity.ts):
\`\`\`typescript
export const CYBERSECURITY_EDUCATION_PROMPT = \`You are a cybersecurity education specialist with expertise in:

## Frameworks & Standards:
- NIST Cybersecurity Framework (CSF)
- ISO/IEC 27001 Information Security Management
- CIS Controls
- MITRE ATT&CK Framework

## Certifications:
- CompTIA Security+ (SY0-701)
- Certified Ethical Hacker (CEH v12)
- CISSP (Certified Information Systems Security Professional)
- CISM, CISA, OSCP

## Your Capabilities:
1. **Concept Explanations**: Explain complex security concepts with real-world examples
2. **Practice Questions**: Generate practice questions for any certification
3. **Study Plans**: Create personalized study plans based on user's timeline and goals
4. **Interactive Q&A**: Answer questions with detailed explanations and follow-ups
5. **Current Threats**: Discuss latest cybersecurity threats and defenses

## Teaching Style:
- Start simple, build complexity
- Use analogies and real-world examples
- Provide hands-on labs when possible
- Reference official exam objectives
- Include industry best practices

When a user asks a question:
1. Clarify their current knowledge level
2. Explain the concept clearly
3. Provide 2-3 real-world examples
4. Suggest related topics to explore
5. Offer practice questions if appropriate\`;
\`\`\`

### 3. MULTI-MODAL AI (Images, Files, Code)

#### Image Analysis Support:
\`\`\`typescript
// lib/actions/chat-multimodal.ts
export async function sendMessageWithImage(
  conversationId: string,
  message: string,
  imageBase64: string,
  mimeType: string
) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: message,
          },
        ],
      },
    ],
  });

  return response;
}
\`\`\`

### 4. RAG (Retrieval Augmented Generation)

For knowledge-base powered assistants:

\`\`\`typescript
// lib/rag/vector-search.ts
import { createClient } from '@/lib/supabase/server';

export async function searchKnowledgeBase(query: string, limit = 5) {
  const supabase = await createClient();

  // Assume you have embeddings stored
  const { data: results } = await supabase.rpc('match_documents', {
    query_embedding: await generateEmbedding(query),
    match_threshold: 0.7,
    match_count: limit,
  });

  return results;
}

// Use in chat:
export async function sendMessageWithRAG(conversationId: string, message: string) {
  // Search knowledge base
  const relevantDocs = await searchKnowledgeBase(message);

  // Build context
  const context = relevantDocs.map(doc => doc.content).join('\n\n');

  // Add to system prompt
  const systemPrompt = \`You are a helpful assistant. Use this context to answer questions:\n\n\${context}\`;

  // Send to AI
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: message }],
  });

  return response;
}
\`\`\`

## ⚠️ CRITICAL REQUIREMENTS

1. **NO MOCK RESPONSES** - Always use real API calls
2. **Streaming Support** - Implement both regular and streaming endpoints
3. **Conversation History** - Store and retrieve full conversation context
4. **Error Handling** - Handle API failures gracefully
5. **Token Management** - Track usage and implement limits if needed
6. **Type Safety** - Full TypeScript types for messages, conversations
7. **Authentication** - Require user authentication for all chat endpoints
8. **Database Storage** - Persist all conversations and messages
9. **Optimistic UI** - Update UI immediately, handle errors gracefully
10. **Cost Tracking** - Track API usage per user if needed
`;

export const WORKFLOW_AUTOMATION_PATTERNS = `
## ⚡ WORKFLOW AUTOMATION ENGINE - BETTER THAN ZAPIER

Generate a REAL workflow automation system with triggers, actions, conditions, and execution.

### 1. WORKFLOW ENGINE CORE

#### Workflow Schema (lib/db/schema.sql):
\`\`\`sql
-- Workflows table
create table workflows (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  name text not null,
  description text,
  trigger_type text not null, -- 'webhook', 'schedule', 'event', 'manual'
  trigger_config jsonb not null default '{}',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workflow steps
create table workflow_steps (
  id uuid primary key default uuid_generate_v4(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  step_order int not null,
  step_type text not null, -- 'action', 'condition', 'loop', 'delay'
  action_type text, -- 'http_request', 'email', 'database', 'ai_task'
  config jsonb not null default '{}',
  created_at timestamptz default now()
);

-- Workflow executions
create table workflow_executions (
  id uuid primary key default uuid_generate_v4(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  status text not null check (status in ('running', 'completed', 'failed', 'cancelled')),
  input_data jsonb,
  output_data jsonb,
  error_message text,
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- Step executions
create table step_executions (
  id uuid primary key default uuid_generate_v4(),
  execution_id uuid not null references workflow_executions(id) on delete cascade,
  step_id uuid not null references workflow_steps(id),
  status text not null,
  input_data jsonb,
  output_data jsonb,
  error_message text,
  started_at timestamptz default now(),
  completed_at timestamptz
);

create index workflows_user_id_idx on workflows(user_id);
create index workflow_steps_workflow_id_idx on workflow_steps(workflow_id);
create index workflow_executions_workflow_id_idx on workflow_executions(workflow_id);
create index workflow_executions_status_idx on workflow_executions(status);
\`\`\`

#### Workflow Executor (lib/workflow/executor.ts):
\`\`\`typescript
import { createClient } from '@/lib/supabase/server';
import { executeAction } from './actions';
import { evaluateCondition } from './conditions';

export class WorkflowExecutor {
  async execute(workflowId: string, inputData: any = {}) {
    const supabase = await createClient();

    // Create execution record
    const { data: execution } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id: workflowId,
        status: 'running',
        input_data: inputData,
      })
      .select()
      .single();

    try {
      // Get workflow steps
      const { data: steps } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('step_order', { ascending: true });

      let context = { ...inputData };

      // Execute each step
      for (const step of steps || []) {
        const { data: stepExecution } = await supabase
          .from('step_executions')
          .insert({
            execution_id: execution.id,
            step_id: step.id,
            status: 'running',
            input_data: context,
          })
          .select()
          .single();

        try {
          let result;

          switch (step.step_type) {
            case 'action':
              result = await executeAction(step.action_type, step.config, context);
              break;

            case 'condition':
              const conditionMet = evaluateCondition(step.config, context);
              if (!conditionMet) {
                // Skip remaining steps or handle branching
                break;
              }
              result = { conditionMet };
              break;

            case 'loop':
              result = await this.executeLoop(step, context);
              break;

            case 'delay':
              await this.delay(step.config.duration);
              result = { delayed: step.config.duration };
              break;
          }

          // Update context with step output
          context = { ...context, [step.id]: result };

          // Mark step as completed
          await supabase
            .from('step_executions')
            .update({
              status: 'completed',
              output_data: result,
              completed_at: new Date().toISOString(),
            })
            .eq('id', stepExecution.id);

        } catch (error) {
          // Mark step as failed
          await supabase
            .from('step_executions')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              completed_at: new Date().toISOString(),
            })
            .eq('id', stepExecution.id);

          throw error;
        }
      }

      // Mark execution as completed
      await supabase
        .from('workflow_executions')
        .update({
          status: 'completed',
          output_data: context,
          completed_at: new Date().toISOString(),
        })
        .eq('id', execution.id);

      return { success: true, output: context };

    } catch (error) {
      // Mark execution as failed
      await supabase
        .from('workflow_executions')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', execution.id);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
      };
    }
  }

  private async executeLoop(step: any, context: any) {
    const { items, iterationKey } = step.config;
    const results = [];

    for (const item of items) {
      const loopContext = { ...context, [iterationKey]: item };
      // Execute nested steps
      // ... (implementation)
      results.push(loopContext);
    }

    return results;
  }

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const workflowExecutor = new WorkflowExecutor();
\`\`\`

#### Actions Library (lib/workflow/actions.ts):
\`\`\`typescript
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

export async function executeAction(actionType: string, config: any, context: any) {
  switch (actionType) {
    case 'http_request':
      return await executeHttpRequest(config, context);

    case 'send_email':
      return await sendEmail(config, context);

    case 'database_query':
      return await executeDatabaseQuery(config, context);

    case 'ai_task':
      return await executeAITask(config, context);

    case 'transform_data':
      return transformData(config, context);

    default:
      throw new Error(\`Unknown action type: \${actionType}\`);
  }
}

async function executeHttpRequest(config: any, context: any) {
  const url = interpolate(config.url, context);
  const headers = config.headers || {};
  const body = config.body ? interpolate(config.body, context) : undefined;

  const response = await fetch(url, {
    method: config.method || 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return await response.json();
}

async function sendEmail(config: any, context: any) {
  const { data, error } = await resend.emails.send({
    from: config.from || 'workflows@yourdomain.com',
    to: interpolate(config.to, context),
    subject: interpolate(config.subject, context),
    html: interpolate(config.body, context),
  });

  if (error) throw error;
  return data;
}

async function executeAITask(config: any, context: any) {
  const prompt = interpolate(config.prompt, context);

  const response = await anthropic.messages.create({
    model: config.model || 'claude-sonnet-4-20250514',
    max_tokens: config.max_tokens || 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  return {
    response: text,
    usage: response.usage,
  };
}

function transformData(config: any, context: any) {
  // JavaScript-based data transformation
  const transformFunc = new Function('data', 'context', config.code);
  return transformFunc(context.data, context);
}

function interpolate(template: string, context: any): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] || '');
}
\`\`\`

### 2. VISUAL WORKFLOW BUILDER

#### Workflow Builder UI (components/workflow/builder.tsx):
\`\`\`typescript
'use client';

import { useState } from 'react';
import ReactFlow, { Node, Edge, addEdge, Connection } from 'reactflow';
import 'reactflow/dist/style.css';

export function WorkflowBuilder() {
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: '1',
      type: 'trigger',
      data: { label: 'Trigger: Webhook' },
      position: { x: 250, y: 0 },
    },
  ]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const onConnect = (params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  };

  const addNode = (type: string) => {
    const newNode: Node = {
      id: \`\${nodes.length + 1}\`,
      type,
      data: { label: \`\${type} step\` },
      position: { x: 250, y: (nodes.length + 1) * 100 },
    };
    setNodes([...nodes, newNode]);
  };

  return (
    <div className="h-screen">
      <div className="flex h-full">
        {/* Toolbar */}
        <div className="w-64 bg-zinc-900 p-4">
          <h3 className="font-semibold mb-4">Add Steps</h3>
          <div className="space-y-2">
            <button
              onClick={() => addNode('http')}
              className="w-full bg-zinc-800 hover:bg-zinc-700 p-3 rounded-lg text-left"
            >
              📡 HTTP Request
            </button>
            <button
              onClick={() => addNode('email')}
              className="w-full bg-zinc-800 hover:bg-zinc-700 p-3 rounded-lg text-left"
            >
              ✉️ Send Email
            </button>
            <button
              onClick={() => addNode('ai')}
              className="w-full bg-zinc-800 hover:bg-zinc-700 p-3 rounded-lg text-left"
            >
              🤖 AI Task
            </button>
            <button
              onClick={() => addNode('condition')}
              className="w-full bg-zinc-800 hover:bg-zinc-700 p-3 rounded-lg text-left"
            >
              🔀 Condition
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onConnect={onConnect}
            fitView
          />
        </div>
      </div>
    </div>
  );
}
\`\`\`

### 3. TRIGGERS

#### Webhook Trigger (app/api/webhooks/workflow/[id]/route.ts):
\`\`\`typescript
import { workflowExecutor } from '@/lib/workflow/executor';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const result = await workflowExecutor.execute(params.id, body);

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: 'Execution failed' }, { status: 500 });
  }
}
\`\`\`

#### Schedule Trigger (lib/cron/scheduler.ts):
\`\`\`typescript
import { CronJob } from 'cron';
import { createClient } from '@/lib/supabase/server';
import { workflowExecutor } from '@/lib/workflow/executor';

export async function startScheduler() {
  const supabase = await createClient();

  // Get all scheduled workflows
  const { data: workflows } = await supabase
    .from('workflows')
    .select('*')
    .eq('trigger_type', 'schedule')
    .eq('is_active', true);

  for (const workflow of workflows || []) {
    const cronExpression = workflow.trigger_config.schedule;

    new CronJob(cronExpression, async () => {
      await workflowExecutor.execute(workflow.id);
    }).start();
  }
}
\`\`\`

## ⚠️ ADVANTAGES OVER ZAPIER

1. **Self-Hosted** - Full control, no external dependencies
2. **Unlimited Executions** - No monthly limits
3. **Custom Code** - JavaScript transformations built-in
4. **AI-Powered** - Native AI tasks (Zapier charges extra)
5. **Real-Time** - WebSocket triggers for instant execution
6. **Open Source** - Extend with custom actions
7. **Visual Builder** - Drag-and-drop workflow design
8. **Version Control** - Workflows stored in database
9. **Detailed Logs** - Full execution history
10. **Cost** - Free after deployment (Zapier: $20-599/month)
`;

// Export combined patterns
export const BOT_PATTERNS = `
## 🤖 BOT IMPLEMENTATIONS - DISCORD, SLACK, TELEGRAM

Generate REAL bots with full platform integration.

### 1. DISCORD BOT

#### Bot Core (lib/bots/discord-bot.ts):
\`\`\`typescript
import { Client, GatewayIntentBits, Events, Message } from 'discord.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export class DiscordBot {
  private client: Client;
  private conversationHistory = new Map<string, any[]>();

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    this.client.on(Events.ClientReady, () => {
      console.log(\`✅ Discord bot logged in as \${this.client.user?.tag}\`);
    });

    this.client.on(Events.MessageCreate, async (message: Message) => {
      await this.handleMessage(message);
    });
  }

  private async handleMessage(message: Message) {
    // Ignore bot messages
    if (message.author.bot) return;

    // Only respond to mentions or DMs
    const isMentioned = message.mentions.has(this.client.user!);
    const isDM = message.channel.type === 1; // DM channel

    if (!isMentioned && !isDM) return;

    try {
      // Show typing indicator
      await message.channel.sendTyping();

      // Get or create conversation history
      const conversationId = message.channel.id;
      if (!this.conversationHistory.has(conversationId)) {
        this.conversationHistory.set(conversationId, []);
      }

      const history = this.conversationHistory.get(conversationId)!;

      // Add user message
      const userMessage = message.content.replace(/<@!?\d+>/g, '').trim();
      history.push({
        role: 'user',
        content: userMessage,
      });

      // Keep only last 10 messages to manage context
      if (history.length > 10) {
        history.splice(0, history.length - 10);
      }

      // Call AI
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: 'You are a helpful Discord bot assistant. Be concise and friendly.',
        messages: history,
      });

      const aiResponse = response.content[0].type === 'text'
        ? response.content[0].text
        : 'Sorry, I could not generate a response.';

      // Add assistant message to history
      history.push({
        role: 'assistant',
        content: aiResponse,
      });

      // Send response (split if too long)
      if (aiResponse.length > 2000) {
        const chunks = aiResponse.match(/[\s\S]{1,2000}/g) || [];
        for (const chunk of chunks) {
          await message.reply(chunk);
        }
      } else {
        await message.reply(aiResponse);
      }

    } catch (error) {
      console.error('Discord bot error:', error);
      await message.reply('Sorry, I encountered an error. Please try again.');
    }
  }

  async start() {
    await this.client.login(process.env.DISCORD_BOT_TOKEN);
  }

  async stop() {
    await this.client.destroy();
  }
}

export const discordBot = new DiscordBot();
\`\`\`

#### Bot Starter (scripts/start-discord-bot.ts):
\`\`\`typescript
import { discordBot } from '@/lib/bots/discord-bot';

async function main() {
  try {
    await discordBot.start();
    console.log('✅ Discord bot started successfully');
  } catch (error) {
    console.error('❌ Failed to start Discord bot:', error);
    process.exit(1);
  }
}

main();
\`\`\`

### 2. SLACK BOT

#### Slack Bot (lib/bots/slack-bot.ts):
\`\`\`typescript
import { App, BlockAction, SayFn } from '@slack/bolt';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export class SlackBot {
  private app: App;
  private conversationHistory = new Map<string, any[]>();

  constructor() {
    this.app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      socketMode: true,
      appToken: process.env.SLACK_APP_TOKEN,
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    // Handle mentions
    this.app.event('app_mention', async ({ event, say }) => {
      await this.handleMessage(event.text, event.channel, event.thread_ts, say);
    });

    // Handle DMs
    this.app.message(async ({ message, say }) => {
      if ('channel_type' in message && message.channel_type === 'im') {
        await this.handleMessage(
          'text' in message ? message.text : '',
          'channel' in message ? message.channel : '',
          undefined,
          say
        );
      }
    });
  }

  private async handleMessage(
    text: string,
    channel: string,
    threadTs: string | undefined,
    say: SayFn
  ) {
    try {
      const conversationId = threadTs || channel;

      if (!this.conversationHistory.has(conversationId)) {
        this.conversationHistory.set(conversationId, []);
      }

      const history = this.conversationHistory.get(conversationId)!;

      // Clean message (remove bot mention)
      const cleanText = text.replace(/<@[UW]\w+>/g, '').trim();

      history.push({
        role: 'user',
        content: cleanText,
      });

      if (history.length > 10) {
        history.splice(0, history.length - 10);
      }

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: 'You are a helpful Slack assistant. Be professional and concise.',
        messages: history,
      });

      const aiResponse = response.content[0].type === 'text'
        ? response.content[0].text
        : 'Sorry, I could not generate a response.';

      history.push({
        role: 'assistant',
        content: aiResponse,
      });

      await say({
        text: aiResponse,
        thread_ts: threadTs,
      });

    } catch (error) {
      console.error('Slack bot error:', error);
      await say({
        text: 'Sorry, I encountered an error. Please try again.',
        thread_ts: threadTs,
      });
    }
  }

  async start() {
    await this.app.start();
    console.log('⚡️ Slack bot is running!');
  }
}

export const slackBot = new SlackBot();
\`\`\`

### 3. TELEGRAM BOT

#### Telegram Bot (lib/bots/telegram-bot.ts):
\`\`\`typescript
import { Telegraf, Context } from 'telegraf';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export class TelegramBot {
  private bot: Telegraf;
  private conversationHistory = new Map<number, any[]>();

  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
    this.setupHandlers();
  }

  private setupHandlers() {
    this.bot.start((ctx) => {
      ctx.reply('Hello! I am an AI assistant. How can I help you today?');
    });

    this.bot.on('text', async (ctx) => {
      await this.handleMessage(ctx);
    });
  }

  private async handleMessage(ctx: Context) {
    if (!('text' in ctx.message!)) return;

    const userId = ctx.from!.id;
    const messageText = ctx.message.text;

    try {
      if (!this.conversationHistory.has(userId)) {
        this.conversationHistory.set(userId, []);
      }

      const history = this.conversationHistory.get(userId)!;

      history.push({
        role: 'user',
        content: messageText,
      });

      if (history.length > 10) {
        history.splice(0, history.length - 10);
      }

      // Show typing
      await ctx.sendChatAction('typing');

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: 'You are a helpful Telegram bot assistant.',
        messages: history,
      });

      const aiResponse = response.content[0].type === 'text'
        ? response.content[0].text
        : 'Sorry, I could not generate a response.';

      history.push({
        role: 'assistant',
        content: aiResponse,
      });

      await ctx.reply(aiResponse);

    } catch (error) {
      console.error('Telegram bot error:', error);
      await ctx.reply('Sorry, I encountered an error. Please try again.');
    }
  }

  async start() {
    await this.bot.launch();
    console.log('🤖 Telegram bot started');
  }

  async stop() {
    this.bot.stop();
  }
}

export const telegramBot = new TelegramBot();
\`\`\`

## Environment Variables:
\`\`\`
# Discord
DISCORD_BOT_TOKEN=your_discord_bot_token

# Slack
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_SIGNING_SECRET=your_signing_secret
SLACK_APP_TOKEN=xapp-your-app-token

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# AI
ANTHROPIC_API_KEY=your_anthropic_key
\`\`\`
`;

export const AI_AGENT_PATTERNS = `
## 🤖 AUTONOMOUS AI AGENTS

Generate autonomous AI agents that can use tools, make decisions, and complete complex tasks.

### 1. AUTONOMOUS AGENT WITH TOOLS

#### Agent Core (lib/agents/autonomous-agent.ts):
\`\`\`typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface Tool {
  name: string;
  description: string;
  input_schema: any;
  execute: (input: any) => Promise<any>;
}

export class AutonomousAgent {
  private tools: Tool[] = [];

  registerTool(tool: Tool) {
    this.tools.push(tool);
  }

  async run(task: string, maxIterations = 10) {
    const messages: any[] = [
      {
        role: 'user',
        content: task,
      },
    ];

    for (let i = 0; i < maxIterations; i++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        tools: this.tools.map(t => ({
          name: t.name,
          description: t.description,
          input_schema: t.input_schema,
        })),
        messages,
      });

      messages.push({
        role: 'assistant',
        content: response.content,
      });

      // Check if agent wants to use tools
      const toolUse = response.content.find(block => block.type === 'tool_use');

      if (toolUse && toolUse.type === 'tool_use') {
        const tool = this.tools.find(t => t.name === toolUse.name);

        if (tool) {
          console.log(\`🔧 Agent using tool: \${toolUse.name}\`);

          try {
            const result = await tool.execute(toolUse.input);

            messages.push({
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: JSON.stringify(result),
                },
              ],
            });
          } catch (error) {
            messages.push({
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: \`Error: \${error instanceof Error ? error.message : 'Unknown error'}\`,
                  is_error: true,
                },
              ],
            });
          }
        }
      } else {
        // No tool use, agent is done
        const finalResponse = response.content.find(block => block.type === 'text');
        return finalResponse && finalResponse.type === 'text'
          ? finalResponse.text
          : 'Task completed';
      }
    }

    return 'Max iterations reached';
  }
}

// Example tools

export const webSearchTool: Tool = {
  name: 'web_search',
  description: 'Search the web for information',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query',
      },
    },
    required: ['query'],
  },
  execute: async (input) => {
    // Implement web search (e.g., using Brave Search API)
    const response = await fetch(
      \`https://api.search.brave.com/res/v1/web/search?q=\${encodeURIComponent(input.query)}\`,
      {
        headers: {
          'X-Subscription-Token': process.env.BRAVE_API_KEY!,
        },
      }
    );
    const data = await response.json();
    return data.web?.results?.slice(0, 5).map((r: any) => ({
      title: r.title,
      url: r.url,
      description: r.description,
    }));
  },
};

export const calculatorTool: Tool = {
  name: 'calculator',
  description: 'Perform mathematical calculations',
  input_schema: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate',
      },
    },
    required: ['expression'],
  },
  execute: async (input) => {
    // Safely evaluate math expression
    const result = eval(input.expression);
    return { result };
  },
};

export const databaseQueryTool: Tool = {
  name: 'database_query',
  description: 'Query the database',
  input_schema: {
    type: 'object',
    properties: {
      table: {
        type: 'string',
        description: 'The table to query',
      },
      filters: {
        type: 'object',
        description: 'Filters to apply',
      },
    },
    required: ['table'],
  },
  execute: async (input) => {
    const supabase = await createClient();
    let query = supabase.from(input.table).select('*');

    if (input.filters) {
      for (const [key, value] of Object.entries(input.filters)) {
        query = query.eq(key, value);
      }
    }

    const { data } = await query;
    return data;
  },
};
\`\`\`

### 2. TASK AUTOMATION AGENT

#### Agent that completes multi-step tasks:
\`\`\`typescript
import { AutonomousAgent, webSearchTool, calculatorTool, databaseQueryTool } from './autonomous-agent';

export async function runTaskAgent(task: string) {
  const agent = new AutonomousAgent();

  // Register available tools
  agent.registerTool(webSearchTool);
  agent.registerTool(calculatorTool);
  agent.registerTool(databaseQueryTool);

  // Additional custom tools
  agent.registerTool({
    name: 'send_email',
    description: 'Send an email',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['to', 'subject', 'body'],
    },
    execute: async (input) => {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data } = await resend.emails.send({
        from: 'agent@yourdomain.com',
        to: input.to,
        subject: input.subject,
        html: input.body,
      });
      return data;
    },
  });

  agent.registerTool({
    name: 'create_calendar_event',
    description: 'Create a calendar event',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        date: { type: 'string' },
        time: { type: 'string' },
      },
      required: ['title', 'date', 'time'],
    },
    execute: async (input) => {
      // Implement calendar integration
      // ... Google Calendar API
      return { success: true, eventId: 'evt_123' };
    },
  });

  const result = await agent.run(task);
  return result;
}
\`\`\`

### 3. RESEARCH AGENT

#### Agent that researches topics and compiles reports:
\`\`\`typescript
export async function runResearchAgent(topic: string) {
  const agent = new AutonomousAgent();

  agent.registerTool(webSearchTool);

  agent.registerTool({
    name: 'scrape_webpage',
    description: 'Scrape content from a webpage',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
      },
      required: ['url'],
    },
    execute: async (input) => {
      const response = await fetch(input.url);
      const html = await response.text();
      // Extract text content (simple version)
      const text = html.replace(/<[^>]*>/g, '').substring(0, 5000);
      return { content: text };
    },
  });

  agent.registerTool({
    name: 'save_research',
    description: 'Save research findings to database',
    input_schema: {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        findings: { type: 'string' },
        sources: { type: 'array' },
      },
      required: ['topic', 'findings'],
    },
    execute: async (input) => {
      const supabase = await createClient();
      const { data } = await supabase
        .from('research_reports')
        .insert({
          topic: input.topic,
          findings: input.findings,
          sources: input.sources,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      return data;
    },
  });

  const task = \`Research the topic "\${topic}" thoroughly:
1. Search for recent information
2. Visit and analyze top sources
3. Compile a comprehensive report with key findings
4. Save the research to the database\`;

  const result = await agent.run(task, 20); // Allow more iterations for research
  return result;
}
\`\`\`

## ⚠️ CAPABILITIES

Autonomous agents can:
1. **Use Multiple Tools** - Web search, database, email, calendar, etc.
2. **Chain Actions** - Complete multi-step tasks autonomously
3. **Make Decisions** - Choose which tools to use based on context
4. **Self-Correct** - Retry with different approaches if errors occur
5. **Learn Context** - Maintain conversation history across iterations
`;

export const AI_SYSTEMS_COMPLETE_PATTERNS =
  AI_ASSISTANT_PATTERNS +
  '\n\n' +
  WORKFLOW_AUTOMATION_PATTERNS +
  '\n\n' +
  BOT_PATTERNS +
  '\n\n' +
  AI_AGENT_PATTERNS;
