/**
 * Enhanced Prompt Classifier
 * 
 * File: src/lib/generation/enhanced-prompt-classifier.ts
 * 
 * Extended classification to detect:
 * - Full SaaS applications (with billing, auth, multi-page)
 * - API-only backends
 * - Infrastructure requirements
 * - PaaS patterns
 */

export type EnhancedGenerationType = 
  | 'ui-application'           // Simple UI app
  | 'full-saas'               // Complete SaaS with billing
  | 'api-backend'             // API-only, no frontend
  | 'workflow-automation'     // n8n/Zapier style
  | 'ai-agent-network'        // Multi-agent systems
  | 'hybrid-workflow-ui'      // Workflow + UI
  | 'hybrid-agent-ui'         // Agent + UI
  | 'infrastructure'          // Docker, K8s, CI/CD only
  | 'full-stack-saas';        // SaaS + Infrastructure

export interface EnhancedClassificationResult {
  primaryType: EnhancedGenerationType;
  confidence: number;
  detectedFeatures: {
    hasUI: boolean;
    hasWorkflow: boolean;
    hasAgents: boolean;
    hasTriggers: boolean;
    hasIntegrations: boolean;
    hasAutonomy: boolean;
    // New features
    hasBilling: boolean;
    hasSubscriptions: boolean;
    hasMultiTenancy: boolean;
    hasUserManagement: boolean;
    hasAdminDashboard: boolean;
    hasAPI: boolean;
    needsDatabase: boolean;
    needsAuth: boolean;
    needsInfrastructure: boolean;
    needsDocker: boolean;
    needsK8s: boolean;
    needsCI: boolean;
  };
  suggestedTechStack: string[];
  suggestedGenerators: string[]; // Which generators to invoke
  reasoning: string;
}

// ============================================================================
// KEYWORD PATTERNS
// ============================================================================

const SAAS_KEYWORDS = [
  'saas', 'subscription', 'billing', 'pricing', 'plans',
  'free trial', 'pro plan', 'enterprise', 'tier',
  'monthly', 'yearly', 'annual', 'recurring',
  'checkout', 'payment', 'stripe', 'paywall',
  'upgrade', 'downgrade', 'cancel subscription',
  'team', 'workspace', 'organization', 'tenant',
  'admin dashboard', 'admin panel', 'user management',
  'invite users', 'roles', 'permissions',
  'analytics dashboard', 'usage tracking',
  'onboarding', 'customer portal',
];

const API_KEYWORDS = [
  'api', 'rest api', 'graphql', 'endpoint',
  'microservice', 'backend only', 'no frontend',
  'headless', 'api-first', 'api gateway',
  'webhook', 'api key', 'rate limiting',
  'openapi', 'swagger', 'documentation',
];

const INFRASTRUCTURE_KEYWORDS = [
  'docker', 'dockerfile', 'container',
  'kubernetes', 'k8s', 'helm',
  'ci/cd', 'pipeline', 'github actions', 'gitlab ci',
  'deploy', 'deployment', 'production',
  'terraform', 'pulumi', 'infrastructure as code',
  'nginx', 'reverse proxy', 'load balancer',
  'scaling', 'auto-scaling', 'horizontal scaling',
  'monitoring', 'logging', 'observability',
  'aws', 'gcp', 'azure', 'cloud',
];

const BILLING_PATTERNS = [
  /subscription\s*(management|billing|plan)/i,
  /payment\s*(integration|processing|gateway)/i,
  /stripe\s*(integration|checkout|billing)/i,
  /pricing\s*(page|tier|plan)/i,
  /(monthly|yearly|annual)\s*(subscription|billing|payment)/i,
  /free\s*(trial|tier|plan)/i,
  /upgrade.*plan/i,
  /billing\s*(portal|dashboard|management)/i,
  /checkout\s*(flow|page|session)/i,
  /customer\s*portal/i,
];

const MULTI_TENANT_PATTERNS = [
  /multi.?tenant/i,
  /workspace.*team/i,
  /organization.*member/i,
  /team\s*(management|invite|member)/i,
  /tenant\s*(isolation|management)/i,
  /white.?label/i,
  /b2b\s*saas/i,
  /enterprise.*customer/i,
];

const ADMIN_PATTERNS = [
  /admin\s*(dashboard|panel|portal)/i,
  /user\s*management/i,
  /role.*permission/i,
  /super.?admin/i,
  /back.?office/i,
  /cms|content\s*management/i,
  /analytics\s*(dashboard|reporting)/i,
];

// ============================================================================
// MAIN CLASSIFIER
// ============================================================================

export function enhancedClassifyPrompt(prompt: string): EnhancedClassificationResult {
  const text = prompt.toLowerCase();
  
  // Detect all features
  const features = {
    hasUI: detectUIIndicators(text),
    hasWorkflow: detectWorkflowIndicators(text),
    hasAgents: detectAgentIndicators(text),
    hasTriggers: detectTriggerPatterns(text),
    hasIntegrations: detectIntegrations(text),
    hasAutonomy: detectAutonomy(text),
    // New detections
    hasBilling: detectBillingFeatures(text),
    hasSubscriptions: detectSubscriptionFeatures(text),
    hasMultiTenancy: detectMultiTenancy(text),
    hasUserManagement: detectUserManagement(text),
    hasAdminDashboard: detectAdminFeatures(text),
    hasAPI: detectAPIFeatures(text),
    needsDatabase: detectDatabaseNeeds(text),
    needsAuth: detectAuthNeeds(text),
    needsInfrastructure: detectInfrastructureNeeds(text),
    needsDocker: detectDockerNeeds(text),
    needsK8s: detectK8sNeeds(text),
    needsCI: detectCINeeds(text),
  };
  
  // Calculate scores
  const saasScore = calculateSaaSScore(text, features);
  const apiScore = calculateAPIScore(text, features);
  const infraScore = calculateInfraScore(text, features);
  const workflowScore = calculateWorkflowScore(text, features);
  const agentScore = calculateAgentScore(text, features);
  const uiScore = calculateUIScore(text, features);
  
  // Determine primary type
  const { primaryType, confidence, reasoning } = determineEnhancedType(
    saasScore,
    apiScore,
    infraScore,
    workflowScore,
    agentScore,
    uiScore,
    features
  );
  
  // Get suggested generators
  const suggestedGenerators = getSuggestedGenerators(primaryType, features);
  
  // Get tech stack
  const suggestedTechStack = getEnhancedTechStack(primaryType, features);
  
  return {
    primaryType,
    confidence,
    detectedFeatures: features,
    suggestedTechStack,
    suggestedGenerators,
    reasoning,
  };
}

// ============================================================================
// FEATURE DETECTION FUNCTIONS
// ============================================================================

function detectUIIndicators(text: string): boolean {
  const uiWords = [
    'app', 'application', 'website', 'dashboard', 'ui', 'interface',
    'page', 'form', 'button', 'display', 'view', 'frontend',
  ];
  return uiWords.some(w => text.includes(w));
}

function detectWorkflowIndicators(text: string): boolean {
  const workflowWords = [
    'workflow', 'automation', 'automate', 'trigger', 'schedule',
    'cron', 'webhook', 'pipeline', 'when', 'then',
  ];
  return workflowWords.some(w => text.includes(w));
}

function detectAgentIndicators(text: string): boolean {
  const agentWords = [
    'agent', 'ai agent', 'autonomous', 'multi-agent',
    'langchain', 'langgraph', 'crewai',
  ];
  return agentWords.some(w => text.includes(w));
}

function detectTriggerPatterns(text: string): boolean {
  const patterns = [
    /when\s+(.+)\s+(then|do|send)/i,
    /every\s+(hour|day|week|month)/i,
    /on\s+(new|updated|created)/i,
  ];
  return patterns.some(p => p.test(text));
}

function detectIntegrations(text: string): boolean {
  const integrations = [
    'slack', 'stripe', 'github', 'twilio', 'sendgrid',
    'mailchimp', 'hubspot', 'salesforce', 'shopify',
  ];
  return integrations.some(i => text.includes(i));
}

function detectAutonomy(text: string): boolean {
  const autonomyWords = [
    'automatically', 'autonomously', 'on its own',
    'self-improving', 'learning',
  ];
  return autonomyWords.some(w => text.includes(w));
}

function detectBillingFeatures(text: string): boolean {
  return BILLING_PATTERNS.some(p => p.test(text)) ||
         SAAS_KEYWORDS.filter(k => k.includes('billing') || k.includes('payment') || k.includes('stripe'))
           .some(k => text.includes(k));
}

function detectSubscriptionFeatures(text: string): boolean {
  return text.includes('subscription') ||
         text.includes('recurring') ||
         text.includes('monthly') ||
         text.includes('yearly') ||
         /pricing\s*(plan|tier)/i.test(text);
}

function detectMultiTenancy(text: string): boolean {
  return MULTI_TENANT_PATTERNS.some(p => p.test(text));
}

function detectUserManagement(text: string): boolean {
  return text.includes('user management') ||
         text.includes('invite user') ||
         text.includes('role') ||
         /permission.*system/i.test(text);
}

function detectAdminFeatures(text: string): boolean {
  return ADMIN_PATTERNS.some(p => p.test(text));
}

function detectAPIFeatures(text: string): boolean {
  return API_KEYWORDS.some(k => text.includes(k));
}

function detectDatabaseNeeds(text: string): boolean {
  return text.includes('database') ||
         text.includes('store') ||
         text.includes('save') ||
         text.includes('persist') ||
         text.includes('user') ||
         text.includes('data');
}

function detectAuthNeeds(text: string): boolean {
  return text.includes('auth') ||
         text.includes('login') ||
         text.includes('signup') ||
         text.includes('sign in') ||
         text.includes('user') ||
         text.includes('account');
}

function detectInfrastructureNeeds(text: string): boolean {
  return INFRASTRUCTURE_KEYWORDS.some(k => text.includes(k));
}

function detectDockerNeeds(text: string): boolean {
  return text.includes('docker') ||
         text.includes('container') ||
         text.includes('deploy');
}

function detectK8sNeeds(text: string): boolean {
  return text.includes('kubernetes') ||
         text.includes('k8s') ||
         text.includes('helm') ||
         text.includes('cluster');
}

function detectCINeeds(text: string): boolean {
  return text.includes('ci/cd') ||
         text.includes('pipeline') ||
         text.includes('github actions') ||
         text.includes('continuous');
}

// ============================================================================
// SCORE CALCULATIONS
// ============================================================================

function calculateSaaSScore(text: string, features: EnhancedClassificationResult['detectedFeatures']): number {
  let score = 0;
  
  SAAS_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword)) score += 2;
  });
  
  BILLING_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) score += 3;
  });
  
  if (features.hasBilling) score += 5;
  if (features.hasSubscriptions) score += 5;
  if (features.hasMultiTenancy) score += 4;
  if (features.hasUserManagement) score += 3;
  if (features.hasAdminDashboard) score += 3;
  if (features.needsAuth) score += 2;
  
  return score;
}

function calculateAPIScore(text: string, features: EnhancedClassificationResult['detectedFeatures']): number {
  let score = 0;
  
  API_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword)) score += 2;
  });
  
  // Bonus for "no frontend" indicators
  if (text.includes('api only') || text.includes('backend only') || text.includes('headless')) {
    score += 5;
  }
  
  if (features.hasAPI && !features.hasUI) score += 5;
  
  return score;
}

function calculateInfraScore(text: string, features: EnhancedClassificationResult['detectedFeatures']): number {
  let score = 0;
  
  INFRASTRUCTURE_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword)) score += 2;
  });
  
  if (features.needsDocker) score += 3;
  if (features.needsK8s) score += 4;
  if (features.needsCI) score += 3;
  
  // If ONLY infrastructure is mentioned without app logic
  if (features.needsInfrastructure && !features.hasUI && !features.hasAPI) {
    score += 5;
  }
  
  return score;
}

function calculateWorkflowScore(text: string, features: EnhancedClassificationResult['detectedFeatures']): number {
  let score = 0;
  
  if (features.hasWorkflow) score += 5;
  if (features.hasTriggers) score += 4;
  if (features.hasIntegrations) score += 2;
  
  return score;
}

function calculateAgentScore(text: string, features: EnhancedClassificationResult['detectedFeatures']): number {
  let score = 0;
  
  if (features.hasAgents) score += 5;
  if (features.hasAutonomy) score += 4;
  
  return score;
}

function calculateUIScore(text: string, features: EnhancedClassificationResult['detectedFeatures']): number {
  let score = 0;
  
  if (features.hasUI) score += 3;
  
  return score;
}

// ============================================================================
// TYPE DETERMINATION
// ============================================================================

function determineEnhancedType(
  saasScore: number,
  apiScore: number,
  infraScore: number,
  workflowScore: number,
  agentScore: number,
  uiScore: number,
  features: EnhancedClassificationResult['detectedFeatures']
): { primaryType: EnhancedGenerationType; confidence: number; reasoning: string } {
  
  // Full SaaS detection (highest priority for billing-related)
  if (saasScore >= 10 || (features.hasBilling && features.hasSubscriptions)) {
    if (features.needsInfrastructure || features.needsDocker) {
      return {
        primaryType: 'full-stack-saas',
        confidence: Math.min(0.95, 0.7 + saasScore * 0.02),
        reasoning: `Complete SaaS + Infrastructure: billing (${features.hasBilling}), subscriptions (${features.hasSubscriptions}), infrastructure (${features.needsInfrastructure})`,
      };
    }
    return {
      primaryType: 'full-saas',
      confidence: Math.min(0.95, 0.7 + saasScore * 0.02),
      reasoning: `SaaS indicators: billing (${features.hasBilling}), subscriptions (${features.hasSubscriptions}), user mgmt (${features.hasUserManagement})`,
    };
  }
  
  // API-only detection
  if (apiScore >= 8 && !features.hasUI) {
    return {
      primaryType: 'api-backend',
      confidence: 0.85,
      reasoning: 'API-only backend detected, no UI requirements',
    };
  }
  
  // Infrastructure-only detection
  if (infraScore >= 8 && !features.hasUI && !saasScore) {
    return {
      primaryType: 'infrastructure',
      confidence: 0.85,
      reasoning: 'Infrastructure/DevOps configuration requested',
    };
  }
  
  // Agent detection
  if (agentScore >= 5) {
    if (features.hasUI) {
      return {
        primaryType: 'hybrid-agent-ui',
        confidence: 0.8,
        reasoning: 'AI agent system with UI',
      };
    }
    return {
      primaryType: 'ai-agent-network',
      confidence: 0.85,
      reasoning: 'Multi-agent AI system',
    };
  }
  
  // Workflow detection
  if (workflowScore >= 5) {
    if (features.hasUI) {
      return {
        primaryType: 'hybrid-workflow-ui',
        confidence: 0.8,
        reasoning: 'Workflow automation with UI',
      };
    }
    return {
      primaryType: 'workflow-automation',
      confidence: 0.85,
      reasoning: 'Workflow automation system',
    };
  }
  
  // Default to UI application
  return {
    primaryType: 'ui-application',
    confidence: 0.7,
    reasoning: 'Standard UI application',
  };
}

// ============================================================================
// GENERATOR SUGGESTIONS
// ============================================================================

function getSuggestedGenerators(
  type: EnhancedGenerationType,
  features: EnhancedClassificationResult['detectedFeatures']
): string[] {
  const generators: string[] = [];
  
  switch (type) {
    case 'full-stack-saas':
      generators.push('saas-generator');
      generators.push('infrastructure-generator');
      break;
    case 'full-saas':
      generators.push('saas-generator');
      if (features.needsInfrastructure) generators.push('infrastructure-generator');
      break;
    case 'api-backend':
      generators.push('api-generator');
      if (features.needsInfrastructure) generators.push('infrastructure-generator');
      break;
    case 'infrastructure':
      generators.push('infrastructure-generator');
      break;
    case 'workflow-automation':
    case 'hybrid-workflow-ui':
      generators.push('workflow-generator');
      if (features.needsInfrastructure) generators.push('infrastructure-generator');
      break;
    case 'ai-agent-network':
    case 'hybrid-agent-ui':
      generators.push('agent-generator');
      if (features.needsInfrastructure) generators.push('infrastructure-generator');
      break;
    case 'ui-application':
    default:
      generators.push('bolt-generator');
      if (features.needsInfrastructure) generators.push('infrastructure-generator');
      break;
  }
  
  return generators;
}

// ============================================================================
// TECH STACK SUGGESTIONS
// ============================================================================

function getEnhancedTechStack(
  type: EnhancedGenerationType,
  features: EnhancedClassificationResult['detectedFeatures']
): string[] {
  const baseStack = ['Next.js 14', 'TypeScript', 'Tailwind CSS'];
  
  switch (type) {
    case 'full-stack-saas':
    case 'full-saas':
      return [
        ...baseStack,
        'NextAuth.js (authentication)',
        'Prisma (database ORM)',
        'PostgreSQL (database)',
        'Stripe (payments)',
        features.needsDocker ? 'Docker' : '',
        features.needsK8s ? 'Kubernetes' : '',
        features.needsCI ? 'GitHub Actions' : '',
      ].filter(Boolean);
      
    case 'api-backend':
      return [
        'Next.js 14 API Routes',
        'TypeScript',
        'Prisma (database ORM)',
        'PostgreSQL',
        'Zod (validation)',
        features.needsDocker ? 'Docker' : '',
      ].filter(Boolean);
      
    case 'infrastructure':
      return [
        'Docker',
        features.needsK8s ? 'Kubernetes' : '',
        'GitHub Actions',
        'Nginx',
      ].filter(Boolean);
      
    case 'workflow-automation':
    case 'hybrid-workflow-ui':
      return [
        ...baseStack,
        'Inngest (workflow engine)',
        'Prisma (database)',
        features.hasIntegrations ? 'Integration SDKs' : '',
      ].filter(Boolean);
      
    case 'ai-agent-network':
    case 'hybrid-agent-ui':
      return [
        ...baseStack,
        'LangChain.js',
        'LangGraph',
        'AI SDK (Vercel)',
        'OpenAI/Anthropic API',
      ].filter(Boolean);
      
    case 'ui-application':
    default:
      return [
        ...baseStack,
        features.needsDatabase ? 'Prisma' : '',
        features.needsAuth ? 'NextAuth.js' : '',
      ].filter(Boolean);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  SAAS_KEYWORDS,
  API_KEYWORDS,
  INFRASTRUCTURE_KEYWORDS,
};
