/**
 * Generation Examples and Templates
 * 
 * File: src/lib/generation/examples.ts
 * 
 * Example prompts and what they generate - useful for:
 * - Documentation
 * - UI examples/suggestions
 * - Testing
 */

export interface GenerationExample {
  id: string;
  category: 'ui' | 'workflow' | 'agent';
  title: string;
  prompt: string;
  description: string;
  expectedFiles: string[];
  techStack: string[];
  complexity: 'simple' | 'moderate' | 'complex';
}

// ============================================================================
// UI APPLICATION EXAMPLES
// ============================================================================

export const uiExamples: GenerationExample[] = [
  {
    id: 'calculator',
    category: 'ui',
    title: 'Calculator App',
    prompt: 'A calculator with add, subtract, multiply, divide. Dark mode, history of calculations.',
    description: 'Simple interactive calculator with memory',
    expectedFiles: [
      'app/page.tsx',
      'app/layout.tsx',
      'app/globals.css',
      'package.json',
    ],
    techStack: ['Next.js', 'React', 'Tailwind CSS'],
    complexity: 'simple',
  },
  {
    id: 'dashboard',
    category: 'ui',
    title: 'Analytics Dashboard',
    prompt: 'A dashboard showing sales metrics with charts, tables, and filters. Include line chart, bar chart, and KPI cards.',
    description: 'Data visualization dashboard with multiple chart types',
    expectedFiles: [
      'app/page.tsx',
      'components/charts/*.tsx',
      'components/kpi-card.tsx',
      'lib/mock-data.ts',
    ],
    techStack: ['Next.js', 'React', 'Tailwind CSS', 'Recharts'],
    complexity: 'moderate',
  },
  {
    id: 'kanban',
    category: 'ui',
    title: 'Kanban Board',
    prompt: 'A Trello-like kanban board with drag and drop, columns for todo/in-progress/done, and card editing.',
    description: 'Drag-and-drop task management board',
    expectedFiles: [
      'app/page.tsx',
      'components/board.tsx',
      'components/column.tsx',
      'components/card.tsx',
      'lib/dnd-context.tsx',
    ],
    techStack: ['Next.js', 'React', 'Tailwind CSS', '@dnd-kit'],
    complexity: 'moderate',
  },
];

// ============================================================================
// WORKFLOW AUTOMATION EXAMPLES
// ============================================================================

export const workflowExamples: GenerationExample[] = [
  {
    id: 'welcome-email',
    category: 'workflow',
    title: 'User Onboarding Workflow',
    prompt: 'When a new user signs up, send them a welcome email, wait 2 days, then send a follow-up if they haven\'t completed their profile. Notify the team on Slack.',
    description: 'Multi-step onboarding automation with delays and conditions',
    expectedFiles: [
      'inngest/client.ts',
      'inngest/functions/onboarding.ts',
      'app/api/inngest/route.ts',
      'lib/integrations/email.ts',
      'lib/integrations/slack.ts',
      'app/page.tsx', // Dashboard
    ],
    techStack: ['Next.js', 'Inngest', 'Resend', 'Slack API'],
    complexity: 'moderate',
  },
  {
    id: 'daily-report',
    category: 'workflow',
    title: 'Scheduled Report Generator',
    prompt: 'Every day at 9 AM, gather data from our database, generate a report, and email it to the team. Also post a summary to Discord.',
    description: 'Cron-based data aggregation and notification',
    expectedFiles: [
      'inngest/client.ts',
      'inngest/functions/daily-report.ts',
      'lib/report-generator.ts',
      'lib/integrations/email.ts',
      'lib/integrations/discord.ts',
      'prisma/schema.prisma',
    ],
    techStack: ['Next.js', 'Inngest', 'Prisma', 'Resend', 'Discord'],
    complexity: 'moderate',
  },
  {
    id: 'order-processing',
    category: 'workflow',
    title: 'E-commerce Order Pipeline',
    prompt: 'When an order is placed, validate inventory, charge payment via Stripe, wait for confirmation, create shipping label, and notify customer at each step. Handle failures with retries.',
    description: 'Complex multi-step order fulfillment with error handling',
    expectedFiles: [
      'inngest/client.ts',
      'inngest/functions/process-order.ts',
      'lib/integrations/stripe.ts',
      'lib/integrations/shipping.ts',
      'lib/integrations/email.ts',
      'app/api/webhooks/stripe/route.ts',
      'prisma/schema.prisma',
    ],
    techStack: ['Next.js', 'Inngest', 'Stripe', 'Prisma', 'Resend'],
    complexity: 'complex',
  },
  {
    id: 'data-sync',
    category: 'workflow',
    title: 'Multi-Service Data Sync',
    prompt: 'Sync customer data between our database, Hubspot CRM, and Mailchimp. Run every hour and handle conflicts by preferring the most recent update.',
    description: 'Bidirectional data synchronization between services',
    expectedFiles: [
      'inngest/client.ts',
      'inngest/functions/sync-customers.ts',
      'lib/integrations/hubspot.ts',
      'lib/integrations/mailchimp.ts',
      'lib/sync/conflict-resolver.ts',
      'prisma/schema.prisma',
    ],
    techStack: ['Next.js', 'Inngest', 'Prisma', 'HubSpot API', 'Mailchimp API'],
    complexity: 'complex',
  },
];

// ============================================================================
// AI AGENT EXAMPLES
// ============================================================================

export const agentExamples: GenerationExample[] = [
  {
    id: 'research-agent',
    category: 'agent',
    title: 'Research Assistant Agent',
    prompt: 'An AI agent that can search the web, read articles, and summarize findings. It should be able to answer research questions by gathering information from multiple sources.',
    description: 'Single agent with web search and summarization tools',
    expectedFiles: [
      'lib/agents/research-agent.ts',
      'lib/tools/web-search.ts',
      'lib/tools/summarize.ts',
      'lib/graphs/research-graph.ts',
      'app/api/agent/route.ts',
      'app/page.tsx', // Chat UI
    ],
    techStack: ['Next.js', 'LangGraph', 'Vercel AI SDK', 'Brave Search API'],
    complexity: 'moderate',
  },
  {
    id: 'content-crew',
    category: 'agent',
    title: 'Content Creation Crew',
    prompt: 'A team of AI agents for content creation: a researcher that finds information, a writer that creates drafts, and a reviewer that checks quality. They should collaborate to produce blog posts.',
    description: 'Multi-agent crew with supervisor orchestration',
    expectedFiles: [
      'lib/agents/researcher.ts',
      'lib/agents/writer.ts',
      'lib/agents/reviewer.ts',
      'lib/agents/supervisor.ts',
      'lib/graphs/crew-graph.ts',
      'lib/tools/*.ts',
      'app/api/agent/route.ts',
      'app/page.tsx',
    ],
    techStack: ['Next.js', 'LangGraph', 'Vercel AI SDK', 'Anthropic'],
    complexity: 'complex',
  },
  {
    id: 'coding-agent',
    category: 'agent',
    title: 'Autonomous Coding Agent',
    prompt: 'An AI agent that can write code, execute it in a sandbox, debug errors, and iterate until the code works. It should be able to complete coding tasks autonomously.',
    description: 'Code-writing agent with execution and self-correction',
    expectedFiles: [
      'lib/agents/coder-agent.ts',
      'lib/tools/code-executor.ts',
      'lib/tools/file-operations.ts',
      'lib/tools/linter.ts',
      'lib/graphs/coding-graph.ts',
      'lib/sandbox/executor.ts',
      'app/api/agent/route.ts',
      'app/page.tsx',
    ],
    techStack: ['Next.js', 'LangGraph', 'Vercel AI SDK', 'E2B Sandbox'],
    complexity: 'complex',
  },
  {
    id: 'support-agent',
    category: 'agent',
    title: 'Customer Support Agent',
    prompt: 'An AI customer support agent that can answer questions from our knowledge base, look up order status, and escalate to humans when needed. It should remember conversation context.',
    description: 'Support agent with knowledge base and memory',
    expectedFiles: [
      'lib/agents/support-agent.ts',
      'lib/tools/knowledge-search.ts',
      'lib/tools/order-lookup.ts',
      'lib/tools/escalate.ts',
      'lib/memory/conversation-memory.ts',
      'lib/graphs/support-graph.ts',
      'app/api/agent/route.ts',
      'app/api/agent/stream/route.ts',
      'app/page.tsx',
    ],
    techStack: ['Next.js', 'LangGraph', 'Vercel AI SDK', 'Vector DB', 'Prisma'],
    complexity: 'complex',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getAllExamples(): GenerationExample[] {
  return [...uiExamples, ...workflowExamples, ...agentExamples];
}

export function getExamplesByCategory(category: 'ui' | 'workflow' | 'agent'): GenerationExample[] {
  switch (category) {
    case 'ui': return uiExamples;
    case 'workflow': return workflowExamples;
    case 'agent': return agentExamples;
  }
}

export function getExampleById(id: string): GenerationExample | undefined {
  return getAllExamples().find(e => e.id === id);
}

export function getRandomExample(category?: 'ui' | 'workflow' | 'agent'): GenerationExample {
  const examples = category ? getExamplesByCategory(category) : getAllExamples();
  return examples[Math.floor(Math.random() * examples.length)];
}

// ============================================================================
// PROMPT TEMPLATES (for users to customize)
// ============================================================================

export const promptTemplates = {
  workflow: {
    eventDriven: 'When [EVENT] happens, [ACTION 1], then [ACTION 2]. Notify via [CHANNEL].',
    scheduled: 'Every [SCHEDULE], [GATHER DATA], [PROCESS], and [DELIVER TO].',
    pipeline: 'Process [INPUT] through: [STEP 1] → [STEP 2] → [STEP 3]. Handle errors by [FALLBACK].',
  },
  agent: {
    single: 'An AI agent that can [CAPABILITY 1], [CAPABILITY 2], and [CAPABILITY 3]. It should [GOAL].',
    crew: 'A team of AI agents: [AGENT 1 ROLE], [AGENT 2 ROLE], [AGENT 3 ROLE]. They collaborate to [GOAL].',
    autonomous: 'An autonomous AI that [MONITORS], [DECIDES], and [ACTS] to achieve [GOAL].',
  },
  ui: {
    app: 'A [TYPE] app with [FEATURE 1], [FEATURE 2], and [FEATURE 3]. Include [UI ELEMENTS].',
    dashboard: 'A dashboard showing [METRICS] with [CHART TYPES]. Include filters for [DIMENSIONS].',
    crud: 'A [ENTITY] management app with create, read, update, delete. Include [EXTRA FEATURES].',
  },
};