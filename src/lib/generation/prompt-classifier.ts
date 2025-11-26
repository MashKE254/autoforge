/**
 * Prompt Classifier
 * 
 * File: src/lib/generation/prompt-classifier.ts
 * 
 * Analyzes user prompts to determine what type of application they want:
 * - UI Application (default) - React/Next.js frontend apps
 * - Workflow Automation - n8n/Zapier style automations
 * - AI Agent Network - Multi-agent systems
 * - Hybrid - Combinations of the above
 */

export type GenerationType = 
  | 'ui-application'
  | 'workflow-automation'
  | 'ai-agent-network'
  | 'hybrid-workflow-ui'
  | 'hybrid-agent-ui';

export interface ClassificationResult {
  primaryType: GenerationType;
  confidence: number;
  detectedFeatures: {
    hasUI: boolean;
    hasWorkflow: boolean;
    hasAgents: boolean;
    hasTriggers: boolean;
    hasIntegrations: boolean;
    hasAutonomy: boolean;
  };
  suggestedTechStack: string[];
  reasoning: string;
}

// Keywords and patterns for each type
const WORKFLOW_KEYWORDS = [
  'workflow', 'automation', 'automate', 'trigger', 'when', 'then',
  'schedule', 'cron', 'webhook', 'event-driven', 'pipeline',
  'if this then that', 'ifttt', 'zapier', 'n8n', 'make.com',
  'send email when', 'notify when', 'sync', 'integrate',
  'on new', 'when new', 'every hour', 'every day', 'daily',
  'connect', 'integration', 'api connection', 'data flow',
  'etl', 'extract transform load', 'batch process',
  'queue', 'job queue', 'background job', 'async task',
];

const AGENT_KEYWORDS = [
  'agent', 'ai agent', 'autonomous', 'crew', 'team of ai',
  'multi-agent', 'collaborative ai', 'ai assistant',
  'langchain', 'langgraph', 'crewai', 'autogpt', 'autogen',
  'research agent', 'writing agent', 'coding agent',
  'tool use', 'function calling', 'reasoning',
  'plan and execute', 'react agent', 'chain of thought',
  'orchestrate ai', 'ai orchestration', 'swarm',
  'delegate tasks', 'ai workers', 'intelligent agents',
  'self-improving', 'learning agent', 'memory',
  'goal-oriented', 'task decomposition',
];

const UI_KEYWORDS = [
  'app', 'application', 'website', 'web app', 'dashboard',
  'ui', 'interface', 'frontend', 'page', 'form',
  'button', 'click', 'display', 'show', 'view',
  'calculator', 'todo', 'list', 'table', 'chart',
  'login', 'signup', 'profile', 'settings',
  'responsive', 'mobile', 'desktop',
];

const TRIGGER_PATTERNS = [
  /when\s+(.+)\s+(then|do|send|create|update|notify)/i,
  /every\s+(hour|day|week|month|minute)/i,
  /on\s+(new|updated|deleted|created)/i,
  /if\s+(.+)\s+then\s+(.+)/i,
  /schedule\s+(.+)\s+(to|for)/i,
  /automate\s+(.+)/i,
];

const AGENT_PATTERNS = [
  /ai\s+(agent|assistant|worker)s?\s+(that|to|for|which)/i,
  /team\s+of\s+(ai|agents?|assistants?)/i,
  /(research|analyze|write|code)\s+.+\s+(automatically|autonomously)/i,
  /autonomous(ly)?\s+(research|analyze|write|code|create)/i,
  /multi-?agent/i,
  /agents?\s+(collaborate|work together|communicate)/i,
];

/**
 * Classify a user prompt to determine the type of application
 */
export function classifyPrompt(prompt: string): ClassificationResult {
  const lowerPrompt = prompt.toLowerCase();
  
  // Count keyword matches
  const workflowScore = countMatches(lowerPrompt, WORKFLOW_KEYWORDS);
  const agentScore = countMatches(lowerPrompt, AGENT_KEYWORDS);
  const uiScore = countMatches(lowerPrompt, UI_KEYWORDS);
  
  // Check pattern matches
  const hasTriggerPatterns = TRIGGER_PATTERNS.some(p => p.test(prompt));
  const hasAgentPatterns = AGENT_PATTERNS.some(p => p.test(prompt));
  
  // Boost scores based on patterns
  const adjustedWorkflowScore = workflowScore + (hasTriggerPatterns ? 3 : 0);
  const adjustedAgentScore = agentScore + (hasAgentPatterns ? 3 : 0);
  
  // Detect features
  const detectedFeatures = {
    hasUI: uiScore > 0 || hasCommonUIWords(lowerPrompt),
    hasWorkflow: adjustedWorkflowScore > 1 || hasTriggerPatterns,
    hasAgents: adjustedAgentScore > 1 || hasAgentPatterns,
    hasTriggers: hasTriggerPatterns,
    hasIntegrations: hasIntegrationMentions(lowerPrompt),
    hasAutonomy: hasAutonomyIndicators(lowerPrompt),
  };
  
  // Determine primary type
  const { primaryType, confidence, reasoning } = determineType(
    adjustedWorkflowScore,
    adjustedAgentScore,
    uiScore,
    detectedFeatures
  );
  
  // Suggest tech stack based on type
  const suggestedTechStack = getSuggestedTechStack(primaryType, detectedFeatures);
  
  return {
    primaryType,
    confidence,
    detectedFeatures,
    suggestedTechStack,
    reasoning,
  };
}

function countMatches(text: string, keywords: string[]): number {
  return keywords.filter(kw => text.includes(kw)).length;
}

function hasCommonUIWords(text: string): boolean {
  const commonUI = ['button', 'form', 'page', 'display', 'show', 'click', 'input'];
  return commonUI.some(w => text.includes(w));
}

function hasIntegrationMentions(text: string): boolean {
  const integrations = [
    'slack', 'discord', 'email', 'gmail', 'outlook',
    'google sheets', 'notion', 'airtable', 'stripe',
    'github', 'gitlab', 'jira', 'trello', 'asana',
    'twilio', 'sendgrid', 'mailchimp', 'hubspot',
    'salesforce', 'shopify', 'woocommerce',
    'aws', 'gcp', 'azure', 's3', 'dynamodb',
  ];
  return integrations.some(i => text.includes(i));
}

function hasAutonomyIndicators(text: string): boolean {
  const autonomyWords = [
    'automatically', 'autonomously', 'on its own',
    'without human', 'self-', 'independent',
    'decides', 'learns', 'adapts', 'improves',
  ];
  return autonomyWords.some(w => text.includes(w));
}

function determineType(
  workflowScore: number,
  agentScore: number,
  uiScore: number,
  features: ClassificationResult['detectedFeatures']
): { primaryType: GenerationType; confidence: number; reasoning: string } {
  
  const totalScore = workflowScore + agentScore + uiScore;
  
  // Strong agent signals
  if (agentScore >= 3 && features.hasAutonomy) {
    if (features.hasUI && uiScore >= 2) {
      return {
        primaryType: 'hybrid-agent-ui',
        confidence: 0.85,
        reasoning: `Detected AI agent requirements (score: ${agentScore}) with UI components (score: ${uiScore})`,
      };
    }
    return {
      primaryType: 'ai-agent-network',
      confidence: Math.min(0.95, 0.6 + agentScore * 0.1),
      reasoning: `Strong AI agent indicators (score: ${agentScore}) with autonomy features`,
    };
  }
  
  // Strong workflow signals
  if (workflowScore >= 3 || features.hasTriggers) {
    if (features.hasUI && uiScore >= 2) {
      return {
        primaryType: 'hybrid-workflow-ui',
        confidence: 0.8,
        reasoning: `Detected workflow/automation (score: ${workflowScore}) with UI requirements (score: ${uiScore})`,
      };
    }
    return {
      primaryType: 'workflow-automation',
      confidence: Math.min(0.9, 0.5 + workflowScore * 0.1),
      reasoning: `Workflow patterns detected (score: ${workflowScore}), trigger patterns: ${features.hasTriggers}`,
    };
  }
  
  // Agent signals without strong autonomy
  if (agentScore >= 2) {
    if (features.hasUI) {
      return {
        primaryType: 'hybrid-agent-ui',
        confidence: 0.7,
        reasoning: `AI agent mentions (score: ${agentScore}) combined with UI elements`,
      };
    }
    return {
      primaryType: 'ai-agent-network',
      confidence: 0.7,
      reasoning: `AI agent terminology detected (score: ${agentScore})`,
    };
  }
  
  // Default to UI application
  return {
    primaryType: 'ui-application',
    confidence: totalScore === 0 ? 0.9 : Math.max(0.5, uiScore / Math.max(totalScore, 1)),
    reasoning: uiScore > 0 
      ? `UI application indicators (score: ${uiScore})`
      : 'Default to UI application - no specific workflow or agent patterns detected',
  };
}

function getSuggestedTechStack(
  type: GenerationType,
  features: ClassificationResult['detectedFeatures']
): string[] {
  const baseStack = ['Next.js 14', 'TypeScript', 'Tailwind CSS'];
  
  switch (type) {
    case 'workflow-automation':
      return [
        ...baseStack,
        'Inngest (workflow engine)',
        'Redis (state/queue)',
        'Prisma (database)',
        features.hasIntegrations ? 'Integration SDKs' : '',
      ].filter(Boolean);
      
    case 'ai-agent-network':
      return [
        ...baseStack,
        'LangChain.js',
        'AI SDK (Vercel)',
        'Vector DB (Pinecone/Chroma)',
        'OpenAI/Anthropic API',
      ];
      
    case 'hybrid-workflow-ui':
      return [
        ...baseStack,
        'Inngest (background jobs)',
        'Prisma (database)',
        'React Query (data fetching)',
      ];
      
    case 'hybrid-agent-ui':
      return [
        ...baseStack,
        'AI SDK (Vercel)',
        'LangChain.js',
        'Prisma (database)',
        'Server-Sent Events (streaming)',
      ];
      
    case 'ui-application':
    default:
      return [
        ...baseStack,
        features.hasIntegrations ? 'API Routes' : '',
      ].filter(Boolean);
  }
}

/**
 * Quick check if prompt is likely a workflow
 */
export function isLikelyWorkflow(prompt: string): boolean {
  const result = classifyPrompt(prompt);
  return result.primaryType === 'workflow-automation' || 
         result.primaryType === 'hybrid-workflow-ui';
}

/**
 * Quick check if prompt is likely an agent system
 */
export function isLikelyAgentSystem(prompt: string): boolean {
  const result = classifyPrompt(prompt);
  return result.primaryType === 'ai-agent-network' || 
         result.primaryType === 'hybrid-agent-ui';
}
