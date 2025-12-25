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
  | 'full-stack-saas'         // SaaS + Infrastructure
  // NEW: Complex application types
  | 'bot'                     // Discord, Telegram, Slack bots
  | 'trading-bot'             // Financial trading bots
  | 'web-scraper'             // Data extraction/scraping
  | 'data-pipeline'           // ETL, data processing
  | 'social-automation'       // Social media bots
  | 'cli-tool'                // Command-line tools
  | 'browser-extension'       // Browser extensions
  | 'mobile-backend';         // Backend for mobile apps

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
// NEW: BOT & AUTOMATION PATTERNS
// ============================================================================

const BOT_KEYWORDS = [
  'bot', 'discord bot', 'telegram bot', 'slack bot',
  'twitter bot', 'whatsapp bot', 'chat bot', 'chatbot',
  'discord.js', 'telegraf', 'slack bolt',
  'moderation bot', 'utility bot', 'game bot',
  'slash commands', 'message handler', 'event listener',
  'bot commands', 'bot token', 'discord server',
  'telegram channel', 'slack workspace',
];

const BOT_PATTERNS = [
  /discord\s*(bot|application|server bot)/i,
  /telegram\s*(bot|channel bot|notification)/i,
  /slack\s*(bot|app|integration)/i,
  /twitter\s*(bot|automation|scheduler)/i,
  /whatsapp\s*(bot|automation|business)/i,
  /chat\s*bot/i,
  /(moderate|ban|kick|warn)\s*(users|spam|messages)/i,
  /slash\s*command/i,
  /message\s*(handler|listener|event)/i,
  /bot.*command/i,
];

const TRADING_KEYWORDS = [
  'trading bot', 'crypto bot', 'stock bot', 'forex bot',
  'trading algorithm', 'algorithmic trading', 'auto trading',
  'buy and sell', 'execute trades', 'trading strategy',
  'binance', 'coinbase', 'kraken', 'ftx',
  'bitcoin', 'ethereum', 'crypto', 'cryptocurrency',
  'stock market', 'forex', 'derivatives',
  'technical indicators', 'rsi', 'macd', 'bollinger bands',
  'arbitrage', 'market making', 'high frequency trading',
  'portfolio management', 'risk management',
  'backtesting', 'paper trading', 'live trading',
];

const TRADING_PATTERNS = [
  /(trading|crypto|stock|forex)\s*bot/i,
  /(buy|sell|execute)\s*(trades|orders|positions)/i,
  /trading\s*(algorithm|strategy|system)/i,
  /(crypto|stock|forex)\s*(trading|investment|portfolio)/i,
  /(binance|coinbase|kraken|alpaca)\s*(api|integration)/i,
  /technical\s*(indicator|analysis)/i,
  /(arbitrage|market\s*making|scalping)/i,
  /portfolio\s*(management|optimization|rebalancing)/i,
  /(backtest|paper\s*trade|live\s*trade)/i,
];

const SCRAPER_KEYWORDS = [
  'web scraper', 'scrape', 'scraping', 'crawl', 'crawler',
  'data extraction', 'extract data', 'harvest data',
  'selenium', 'puppeteer', 'playwright', 'cheerio',
  'beautifulsoup', 'parse html', 'parse website',
  'scrape amazon', 'scrape linkedin', 'scrape twitter',
  'price monitoring', 'product scraper', 'job scraper',
  'anti-detection', 'proxy rotation', 'headless browser',
];

const SCRAPER_PATTERNS = [
  /web\s*(scraper|scraping|crawling)/i,
  /(scrape|extract|harvest)\s*(data|content|information)/i,
  /crawl\s*(website|pages|links)/i,
  /(puppeteer|playwright|selenium|cheerio)/i,
  /scrape.*(amazon|linkedin|twitter|facebook|instagram)/i,
  /(price|product|job|real\s*estate)\s*(monitoring|scraping|extraction)/i,
  /headless\s*browser/i,
  /anti.?detection/i,
  /proxy\s*(rotation|pool)/i,
];

const SOCIAL_AUTOMATION_KEYWORDS = [
  'social media bot', 'instagram bot', 'facebook bot',
  'linkedin automation', 'twitter automation',
  'post scheduler', 'content scheduler', 'auto post',
  'social media management', 'social automation',
  'engagement bot', 'like and comment', 'follow bot',
  'dm automation', 'reply bot', 'hashtag monitor',
];

const SOCIAL_AUTOMATION_PATTERNS = [
  /social\s*media\s*(bot|automation|scheduler)/i,
  /(instagram|facebook|linkedin|twitter)\s*(bot|automation)/i,
  /(post|content)\s*schedul(er|ing)/i,
  /auto.?(post|publish|share)/i,
  /(like|comment|follow)\s*automation/i,
  /dm\s*(automation|bot)/i,
  /engagement\s*bot/i,
];

const DATA_PIPELINE_KEYWORDS = [
  'etl', 'data pipeline', 'data processing',
  'data transformation', 'data ingestion', 'data warehouse',
  'apache airflow', 'luigi', 'prefect', 'dagster',
  'spark', 'kafka', 'flink', 'beam',
  'batch processing', 'stream processing', 'real-time processing',
  'data lake', 'data mart', 'olap', 'oltp',
];

const DATA_PIPELINE_PATTERNS = [
  /etl\s*(pipeline|process)/i,
  /data\s*(pipeline|processing|transformation)/i,
  /data\s*(ingestion|extraction|loading)/i,
  /(batch|stream|real.?time)\s*processing/i,
  /(airflow|luigi|prefect|dagster|spark|kafka)/i,
  /data\s*(warehouse|lake|mart)/i,
];

const CLI_TOOL_KEYWORDS = [
  'cli tool', 'command line', 'terminal', 'shell script',
  'cli', 'command line interface', 'terminal app',
  'cli utility', 'developer tool', 'command line tool',
];

const CLI_TOOL_PATTERNS = [
  /cli\s*(tool|utility|application)/i,
  /command\s*line\s*(tool|interface|utility)/i,
  /terminal\s*(app|tool)/i,
  /shell\s*script/i,
];

const BROWSER_EXTENSION_KEYWORDS = [
  'browser extension', 'chrome extension', 'firefox extension',
  'safari extension', 'edge extension',
  'browser plugin', 'chrome plugin', 'web extension',
];

const BROWSER_EXTENSION_PATTERNS = [
  /(chrome|firefox|safari|edge)\s*extension/i,
  /browser\s*(extension|plugin|add.?on)/i,
  /web\s*extension/i,
];

// ============================================================================
// MAIN CLASSIFIER
// ============================================================================

export function enhancedClassifyPrompt(prompt: string): EnhancedClassificationResult {
  const text = prompt.toLowerCase();

  // NEW: Check for specialized types first (highest priority)
  const botScore = detectBotType(text);
  const tradingScore = detectTradingBot(text);
  const scraperScore = detectWebScraper(text);
  const socialScore = detectSocialAutomation(text);
  const dataPipelineScore = detectDataPipeline(text);
  const cliScore = detectCLITool(text);
  const extensionScore = detectBrowserExtension(text);

  // If any specialized type has high confidence, return immediately
  if (botScore > 0.7) {
    return createBotResult(prompt, text, botScore);
  }
  if (tradingScore > 0.7) {
    return createTradingBotResult(prompt, text, tradingScore);
  }
  if (scraperScore > 0.7) {
    return createScraperResult(prompt, text, scraperScore);
  }
  if (socialScore > 0.7) {
    return createSocialAutomationResult(prompt, text, socialScore);
  }
  if (dataPipelineScore > 0.6) {
    return createDataPipelineResult(prompt, text, dataPipelineScore);
  }
  if (cliScore > 0.6) {
    return createCLIToolResult(prompt, text, cliScore);
  }
  if (extensionScore > 0.6) {
    return createBrowserExtensionResult(prompt, text, extensionScore);
  }

  // Detect all features (existing logic)
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

  // Calculate scores (existing logic)
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
// NEW: SPECIALIZED TYPE DETECTION FUNCTIONS
// ============================================================================

function detectBotType(text: string): number {
  let score = 0;

  BOT_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword)) score += 2;
  });

  BOT_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) score += 3;
  });

  // Normalize to 0-1 range
  return Math.min(1.0, score / 15);
}

function detectTradingBot(text: string): number {
  let score = 0;

  TRADING_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword)) score += 2;
  });

  TRADING_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) score += 3;
  });

  // Normalize to 0-1 range
  return Math.min(1.0, score / 15);
}

function detectWebScraper(text: string): number {
  let score = 0;

  SCRAPER_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword)) score += 2;
  });

  SCRAPER_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) score += 3;
  });

  // Normalize to 0-1 range
  return Math.min(1.0, score / 15);
}

function detectSocialAutomation(text: string): number {
  let score = 0;

  SOCIAL_AUTOMATION_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword)) score += 2;
  });

  SOCIAL_AUTOMATION_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) score += 3;
  });

  // Normalize to 0-1 range
  return Math.min(1.0, score / 15);
}

function detectDataPipeline(text: string): number {
  let score = 0;

  DATA_PIPELINE_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword)) score += 2;
  });

  DATA_PIPELINE_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) score += 3;
  });

  // Normalize to 0-1 range
  return Math.min(1.0, score / 15);
}

function detectCLITool(text: string): number {
  let score = 0;

  CLI_TOOL_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword)) score += 2;
  });

  CLI_TOOL_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) score += 3;
  });

  // Normalize to 0-1 range
  return Math.min(1.0, score / 12);
}

function detectBrowserExtension(text: string): number {
  let score = 0;

  BROWSER_EXTENSION_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword)) score += 2;
  });

  BROWSER_EXTENSION_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) score += 3;
  });

  // Normalize to 0-1 range
  return Math.min(1.0, score / 12);
}

// ============================================================================
// NEW: SPECIALIZED RESULT CREATORS
// ============================================================================

function createBotResult(prompt: string, text: string, confidence: number): EnhancedClassificationResult {
  const platform = detectBotPlatform(text);

  return {
    primaryType: 'bot',
    confidence,
    detectedFeatures: {
      hasUI: true, // Bots have admin dashboards
      hasWorkflow: text.includes('schedule') || text.includes('cron'),
      hasAgents: false,
      hasTriggers: text.includes('event') || text.includes('command'),
      hasIntegrations: true, // Bot platforms are integrations
      hasAutonomy: text.includes('auto') || text.includes('automatic'),
      hasBilling: false,
      hasSubscriptions: false,
      hasMultiTenancy: false,
      hasUserManagement: false,
      hasAdminDashboard: true, // All bots get admin dashboards
      hasAPI: true, // Bots use platform APIs
      needsDatabase: true, // For logging, config
      needsAuth: true, // For admin dashboard
      needsInfrastructure: true, // Need deployment
      needsDocker: true,
      needsK8s: false,
      needsCI: false,
    },
    suggestedTechStack: [
      'Node.js',
      'TypeScript',
      platform.includes('discord') ? 'Discord.js' : '',
      platform.includes('telegram') ? 'Telegraf' : '',
      platform.includes('slack') ? 'Slack Bolt' : '',
      platform.includes('twitter') ? 'Twitter API v2' : '',
      platform.includes('whatsapp') ? 'WhatsApp Business API' : '',
      'PostgreSQL (logging)',
      'Next.js (admin dashboard)',
      'Docker',
      'Railway/Render',
    ].filter(Boolean),
    suggestedGenerators: ['bot-generator'],
    reasoning: `Bot detected for platforms: ${platform.join(', ')}. Will generate bot code + admin dashboard + deployment config.`,
  };
}

function createTradingBotResult(prompt: string, text: string, confidence: number): EnhancedClassificationResult {
  return {
    primaryType: 'trading-bot',
    confidence,
    detectedFeatures: {
      hasUI: true, // Trading dashboard
      hasWorkflow: true, // Trading strategies
      hasAgents: text.includes('ai') || text.includes('ml'),
      hasTriggers: true, // Price triggers, indicators
      hasIntegrations: true, // Exchange APIs
      hasAutonomy: true, // Automated trading
      hasBilling: false,
      hasSubscriptions: false,
      hasMultiTenancy: false,
      hasUserManagement: false,
      hasAdminDashboard: true,
      hasAPI: true, // Exchange APIs
      needsDatabase: true, // Trade history, analytics
      needsAuth: true,
      needsInfrastructure: true,
      needsDocker: true,
      needsK8s: false,
      needsCI: false,
    },
    suggestedTechStack: [
      'Node.js',
      'TypeScript',
      'CCXT (crypto exchange library)',
      'Alpaca API (stocks)',
      'PostgreSQL (trade history)',
      'Redis (real-time data)',
      'Next.js (trading dashboard)',
      'Recharts (charts)',
      'WebSockets (live prices)',
      'Docker',
    ],
    suggestedGenerators: ['trading-bot-generator'],
    reasoning: `Trading bot detected. Will generate trading engine + strategy system + real-time dashboard + backtesting + risk management.`,
  };
}

function createScraperResult(prompt: string, text: string, confidence: number): EnhancedClassificationResult {
  return {
    primaryType: 'web-scraper',
    confidence,
    detectedFeatures: {
      hasUI: true, // Scraper dashboard
      hasWorkflow: true, // Scraping workflows
      hasAgents: false,
      hasTriggers: text.includes('schedule') || text.includes('cron'),
      hasIntegrations: false,
      hasAutonomy: text.includes('continuous') || text.includes('monitor'),
      hasBilling: false,
      hasSubscriptions: false,
      hasMultiTenancy: false,
      hasUserManagement: false,
      hasAdminDashboard: true,
      hasAPI: true, // Scraper API
      needsDatabase: true, // Store scraped data
      needsAuth: false,
      needsInfrastructure: true,
      needsDocker: true,
      needsK8s: false,
      needsCI: false,
    },
    suggestedTechStack: [
      'Node.js',
      'TypeScript',
      'Puppeteer/Playwright (headless browser)',
      'Cheerio (HTML parsing)',
      'PostgreSQL (scraped data)',
      'BullMQ (job queue)',
      'Next.js (scraper dashboard)',
      'Proxy rotation',
      'Docker',
    ],
    suggestedGenerators: ['scraper-generator'],
    reasoning: `Web scraper detected. Will generate scraping engine + anti-detection + data storage + scheduling + dashboard.`,
  };
}

function createSocialAutomationResult(prompt: string, text: string, confidence: number): EnhancedClassificationResult {
  return {
    primaryType: 'social-automation',
    confidence,
    detectedFeatures: {
      hasUI: true, // Social media dashboard
      hasWorkflow: true, // Post scheduling
      hasAgents: text.includes('ai') || text.includes('auto reply'),
      hasTriggers: true, // Schedule triggers
      hasIntegrations: true, // Social platforms
      hasAutonomy: true, // Automated posting
      hasBilling: false,
      hasSubscriptions: false,
      hasMultiTenancy: false,
      hasUserManagement: false,
      hasAdminDashboard: true,
      hasAPI: true, // Social media APIs
      needsDatabase: true, // Post queue, analytics
      needsAuth: true, // OAuth for social platforms
      needsInfrastructure: true,
      needsDocker: true,
      needsK8s: false,
      needsCI: false,
    },
    suggestedTechStack: [
      'Node.js',
      'TypeScript',
      'Instagram Graph API',
      'Twitter API v2',
      'LinkedIn API',
      'Facebook Graph API',
      'PostgreSQL (post queue)',
      'BullMQ (scheduler)',
      'Next.js (dashboard)',
      'Docker',
    ],
    suggestedGenerators: ['social-automation-generator'],
    reasoning: `Social media automation detected. Will generate multi-platform posting + scheduling + engagement automation + analytics dashboard.`,
  };
}

function createDataPipelineResult(prompt: string, text: string, confidence: number): EnhancedClassificationResult {
  return {
    primaryType: 'data-pipeline',
    confidence,
    detectedFeatures: {
      hasUI: true, // Pipeline monitoring dashboard
      hasWorkflow: true, // ETL workflows
      hasAgents: false,
      hasTriggers: true, // Scheduled jobs
      hasIntegrations: true, // Data sources
      hasAutonomy: true, // Automated processing
      hasBilling: false,
      hasSubscriptions: false,
      hasMultiTenancy: false,
      hasUserManagement: false,
      hasAdminDashboard: true,
      hasAPI: true,
      needsDatabase: true, // Data warehouse
      needsAuth: false,
      needsInfrastructure: true,
      needsDocker: true,
      needsK8s: text.includes('scale') || text.includes('distributed'),
      needsCI: false,
    },
    suggestedTechStack: [
      'Node.js',
      'TypeScript',
      'Apache Airflow (orchestration)',
      'PostgreSQL (data warehouse)',
      'Redis (caching)',
      'BullMQ (job processing)',
      'Next.js (monitoring dashboard)',
      'Docker',
      text.includes('scale') ? 'Kubernetes' : '',
    ].filter(Boolean),
    suggestedGenerators: ['data-pipeline-generator'],
    reasoning: `Data pipeline/ETL detected. Will generate data extraction + transformation + loading + orchestration + monitoring dashboard.`,
  };
}

function createCLIToolResult(prompt: string, text: string, confidence: number): EnhancedClassificationResult {
  return {
    primaryType: 'cli-tool',
    confidence,
    detectedFeatures: {
      hasUI: false, // CLI tools don't have UI
      hasWorkflow: false,
      hasAgents: false,
      hasTriggers: false,
      hasIntegrations: text.includes('api') || text.includes('integration'),
      hasAutonomy: false,
      hasBilling: false,
      hasSubscriptions: false,
      hasMultiTenancy: false,
      hasUserManagement: false,
      hasAdminDashboard: false,
      hasAPI: false,
      needsDatabase: text.includes('config') || text.includes('cache'),
      needsAuth: text.includes('login') || text.includes('auth'),
      needsInfrastructure: false,
      needsDocker: false,
      needsK8s: false,
      needsCI: false,
    },
    suggestedTechStack: [
      'Node.js',
      'TypeScript',
      'Commander.js (CLI framework)',
      'Inquirer.js (interactive prompts)',
      'Chalk (colored output)',
      'Ora (spinners)',
      'Conf (config management)',
    ],
    suggestedGenerators: ['cli-tool-generator'],
    reasoning: `CLI tool detected. Will generate command-line interface + subcommands + interactive prompts + config management.`,
  };
}

function createBrowserExtensionResult(prompt: string, text: string, confidence: number): EnhancedClassificationResult {
  const browsers = [];
  if (text.includes('chrome')) browsers.push('Chrome');
  if (text.includes('firefox')) browsers.push('Firefox');
  if (text.includes('safari')) browsers.push('Safari');
  if (text.includes('edge')) browsers.push('Edge');
  if (browsers.length === 0) browsers.push('Chrome'); // Default

  return {
    primaryType: 'browser-extension',
    confidence,
    detectedFeatures: {
      hasUI: true, // Extension popup/options page
      hasWorkflow: false,
      hasAgents: false,
      hasTriggers: text.includes('page load') || text.includes('url change'),
      hasIntegrations: text.includes('api'),
      hasAutonomy: false,
      hasBilling: false,
      hasSubscriptions: false,
      hasMultiTenancy: false,
      hasUserManagement: false,
      hasAdminDashboard: false,
      hasAPI: text.includes('api'),
      needsDatabase: text.includes('storage') || text.includes('sync'),
      needsAuth: text.includes('login') || text.includes('auth'),
      needsInfrastructure: false,
      needsDocker: false,
      needsK8s: false,
      needsCI: false,
    },
    suggestedTechStack: [
      'TypeScript',
      'WebExtension API',
      'React (popup UI)',
      'Tailwind CSS',
      'Chrome Storage API',
      'Manifest V3',
      'Webpack (bundling)',
    ],
    suggestedGenerators: ['browser-extension-generator'],
    reasoning: `Browser extension detected for: ${browsers.join(', ')}. Will generate extension manifest + background script + popup UI + content scripts + storage.`,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function detectBotPlatform(text: string): string[] {
  const platforms: string[] = [];

  if (text.includes('discord')) platforms.push('discord');
  if (text.includes('telegram')) platforms.push('telegram');
  if (text.includes('slack')) platforms.push('slack');
  if (text.includes('twitter')) platforms.push('twitter');
  if (text.includes('whatsapp')) platforms.push('whatsapp');

  // Default to Discord if no platform specified
  if (platforms.length === 0) platforms.push('discord');

  return platforms;
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
    // NEW: Specialized generators
    case 'bot':
      generators.push('bot-generator');
      break;
    case 'trading-bot':
      generators.push('trading-bot-generator');
      break;
    case 'web-scraper':
      generators.push('scraper-generator');
      break;
    case 'social-automation':
      generators.push('social-automation-generator');
      break;
    case 'data-pipeline':
      generators.push('data-pipeline-generator');
      break;
    case 'cli-tool':
      generators.push('cli-tool-generator');
      break;
    case 'browser-extension':
      generators.push('browser-extension-generator');
      break;
    case 'mobile-backend':
      generators.push('mobile-backend-generator');
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

    // NEW: Specialized tech stacks
    case 'bot':
      return [
        'Node.js',
        'TypeScript',
        'Discord.js / Telegraf / Slack Bolt',
        'PostgreSQL (logging)',
        'Next.js (admin dashboard)',
        'Docker',
        'Railway/Render (hosting)',
      ];

    case 'trading-bot':
      return [
        'Node.js',
        'TypeScript',
        'CCXT (crypto exchanges)',
        'Alpaca API (stocks)',
        'PostgreSQL (trade history)',
        'Redis (real-time data)',
        'Next.js (trading dashboard)',
        'Recharts (charts)',
        'WebSockets',
        'Docker',
      ];

    case 'web-scraper':
      return [
        'Node.js',
        'TypeScript',
        'Puppeteer/Playwright',
        'Cheerio (HTML parsing)',
        'PostgreSQL (scraped data)',
        'BullMQ (job queue)',
        'Next.js (dashboard)',
        'Proxy rotation',
        'Docker',
      ];

    case 'social-automation':
      return [
        'Node.js',
        'TypeScript',
        'Instagram/Twitter/LinkedIn APIs',
        'PostgreSQL (post queue)',
        'BullMQ (scheduler)',
        'Next.js (dashboard)',
        'Docker',
      ];

    case 'data-pipeline':
      return [
        'Node.js',
        'TypeScript',
        'Apache Airflow',
        'PostgreSQL (data warehouse)',
        'Redis (caching)',
        'BullMQ (job processing)',
        'Next.js (monitoring dashboard)',
        'Docker',
        features.needsK8s ? 'Kubernetes' : '',
      ].filter(Boolean);

    case 'cli-tool':
      return [
        'Node.js',
        'TypeScript',
        'Commander.js (CLI framework)',
        'Inquirer.js (interactive prompts)',
        'Chalk (colored output)',
        'Ora (spinners)',
        'Conf (config management)',
      ];

    case 'browser-extension':
      return [
        'TypeScript',
        'WebExtension API',
        'React (popup UI)',
        'Tailwind CSS',
        'Chrome Storage API',
        'Manifest V3',
        'Webpack (bundling)',
      ];

    case 'mobile-backend':
      return [
        'Next.js 14 API Routes',
        'TypeScript',
        'Prisma (database ORM)',
        'PostgreSQL',
        'NextAuth.js (authentication)',
        'Firebase Cloud Messaging (push notifications)',
        'AWS S3 (file storage)',
        features.needsDocker ? 'Docker' : '',
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
