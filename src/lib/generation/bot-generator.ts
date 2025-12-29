/**
 * BOT GENERATOR
 *
 * File: src/lib/generation/bot-generator.ts
 *
 * Purpose:
 * - Generate bots for multiple platforms (Discord, Telegram, Slack, Twitter, WhatsApp)
 * - Support various bot types (moderation, utility, games, automation)
 * - Auto-generate bot-specific admin dashboards
 * - Handle authentication and deployment configs
 *
 * This enables users to build:
 * - Discord moderation bots
 * - Telegram notification bots
 * - Trading bots
 * - Social media automation
 * - Customer service bots
 * - And much more
 */

import Anthropic from '@anthropic-ai/sdk';

import { GeneratedFile, GenerationResult, StreamCallbacks } from './bolt-generator';

// ============================================================================
// TYPES
// ============================================================================

export type BotPlatform = 'discord' | 'telegram' | 'slack' | 'twitter' | 'whatsapp' | 'generic';

export type BotType =
  | 'moderation'      // Spam detection, bans, warnings
  | 'utility'         // Commands, info, tools
  | 'game'            // Interactive games
  | 'notification'    // Alerts, reminders
  | 'automation'      // Scheduled tasks, workflows
  | 'trading'         // Financial trading
  | 'customer-service' // Support, FAQ
  | 'analytics'       // Tracking, reporting
  | 'content'         // Post scheduling, generation
  | 'multi-purpose';  // General purpose bot

export interface BotConfig {
  platform: BotPlatform;
  type: BotType;
  features: BotFeature[];
  integrations: string[];
  database: boolean;
  ai: boolean;
}

export interface BotFeature {
  name: string;
  description: string;
  commands?: string[];
  events?: string[];
}

// ============================================================================
// BOT GENERATOR CLASS
// ============================================================================

export class BotGenerator {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  /**
   * Main generation method
   */
  async generate(
    prompt: string,
    jobId?: string,
    callbacks?: StreamCallbacks
  ): Promise<GenerationResult> {
    console.log('🤖 Bot Generator starting...');
    callbacks?.onProgress?.('🤖 Analyzing bot requirements...');

    try {
      // Step 1: Analyze prompt and extract bot configuration
      const config = await this.analyzeBotPrompt(prompt);
      console.log(`   → Platform: ${config.platform}`);
      console.log(`   → Type: ${config.type}`);
      console.log(`   → Features: ${config.features.length}`);

      // Step 2: Generate bot code based on platform
      callbacks?.onProgress?.(`🔧 Generating ${config.platform} bot code...`);
      const files = await this.generateBotCode(prompt, config, callbacks);

      // Step 3: Generate admin dashboard
      if (config.database) {
        callbacks?.onProgress?.('🎨 Generating bot admin dashboard...');
        const dashboardFiles = await this.generateBotDashboard(config);
        files.push(...dashboardFiles);
      }

      // Step 4: Generate deployment configuration
      callbacks?.onProgress?.('🚀 Generating deployment configuration...');
      const deployFiles = await this.generateDeploymentConfig(config);
      files.push(...deployFiles);

      // Step 5: Generate README with setup instructions
      callbacks?.onProgress?.('📝 Generating documentation...');
      const readme = this.generateReadme(config);
      files.push(readme);

      console.log(`✅ Bot generation complete: ${files.length} files`);

      return {
        success: true,
        files,
        message: `Generated ${config.platform} bot with ${config.features.length} features`,
      };
    } catch (error) {
      console.error('Bot generation failed:', error);
      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Analyze prompt to determine bot configuration
   */
  private async analyzeBotPrompt(prompt: string): Promise<BotConfig> {
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Analyze this bot request and extract configuration.

User Request: "${prompt}"

Determine:
1. Platform (discord, telegram, slack, twitter, whatsapp, or generic)
2. Bot Type (moderation, utility, game, notification, automation, trading, customer-service, analytics, content, multi-purpose)
3. Features needed (list each feature with description and commands/events)
4. Required integrations (APIs, services)
5. Whether it needs a database
6. Whether it needs AI capabilities

Output JSON:
{
  "platform": "discord",
  "type": "moderation",
  "features": [
    {
      "name": "Spam Detection",
      "description": "Detect and ban spam messages",
      "commands": ["/ban", "/warn"],
      "events": ["messageCreate"]
    }
  ],
  "integrations": ["OpenAI", "Database"],
  "database": true,
  "ai": true
}`,
        },
      ],
    });

    const response = message.content[0];
    if (response.type !== 'text') {
      throw new Error('Invalid AI response');
    }

    const jsonMatch = response.text.match(/```json\n([\s\S]+?)\n```/) || response.text.match(/\{[\s\S]+\}/);
    if (!jsonMatch) {
      // Fallback to generic bot
      return {
        platform: 'generic',
        type: 'multi-purpose',
        features: [],
        integrations: [],
        database: false,
        ai: false,
      };
    }

    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
  }

  /**
   * Generate bot code based on platform and configuration
   */
  private async generateBotCode(
    prompt: string,
    config: BotConfig,
    callbacks?: StreamCallbacks
  ): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate platform-specific bot code
    switch (config.platform) {
      case 'discord':
        files.push(...await this.generateDiscordBot(prompt, config, callbacks));
        break;
      case 'telegram':
        files.push(...await this.generateTelegramBot(prompt, config, callbacks));
        break;
      case 'slack':
        files.push(...await this.generateSlackBot(prompt, config, callbacks));
        break;
      case 'twitter':
        files.push(...await this.generateTwitterBot(prompt, config, callbacks));
        break;
      case 'whatsapp':
        files.push(...await this.generateWhatsAppBot(prompt, config, callbacks));
        break;
      default:
        files.push(...await this.generateGenericBot(prompt, config, callbacks));
    }

    // Add common files
    files.push(this.generatePackageJson(config));
    files.push(this.generateTsConfig());
    files.push(this.generateEnvExample(config));

    if (config.database) {
      files.push(this.generatePrismaSchema(config));
    }

    return files;
  }

  /**
   * Generate Discord bot
   */
  private async generateDiscordBot(
    prompt: string,
    config: BotConfig,
    callbacks?: StreamCallbacks
  ): Promise<GeneratedFile[]> {
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: `Generate a complete Discord bot for this request:

"${prompt}"

Configuration:
- Type: ${config.type}
- Features: ${config.features.map(f => f.name).join(', ')}
- Database: ${config.database ? 'Yes (Prisma)' : 'No'}
- AI: ${config.ai ? 'Yes (Claude/OpenAI)' : 'No'}

Requirements:
1. Use discord.js v14
2. TypeScript
3. Command handler with slash commands
4. Event handler
5. Error handling and logging
${config.database ? '6. Prisma integration for data storage' : ''}
${config.ai ? '7. AI integration for smart responses' : ''}

Generate these files:
1. src/index.ts - Main bot entry point
2. src/commands/ - Command files (one per feature)
3. src/events/ - Event handlers
4. src/utils/ - Helper functions
${config.database ? '5. src/database/ - Database utilities' : ''}
${config.ai ? '6. src/ai/ - AI integration' : ''}

Output each file with its path and content.`,
        },
      ],
    });

    return this.parseGeneratedFiles(message.content[0]);
  }

  /**
   * Generate Telegram bot
   */
  private async generateTelegramBot(
    prompt: string,
    config: BotConfig,
    callbacks?: StreamCallbacks
  ): Promise<GeneratedFile[]> {
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: `Generate a complete Telegram bot for this request:

"${prompt}"

Configuration:
- Type: ${config.type}
- Features: ${config.features.map(f => f.name).join(', ')}
- Database: ${config.database ? 'Yes (Prisma)' : 'No'}
- AI: ${config.ai ? 'Yes (Claude/OpenAI)' : 'No'}

Requirements:
1. Use node-telegram-bot-api or telegraf
2. TypeScript
3. Command handlers
4. Inline keyboards and buttons
5. Error handling
${config.database ? '6. Prisma integration' : ''}
${config.ai ? '7. AI-powered responses' : ''}

Generate complete bot code with all files.`,
        },
      ],
    });

    return this.parseGeneratedFiles(message.content[0]);
  }

  /**
   * Generate Slack bot
   */
  private async generateSlackBot(
    prompt: string,
    config: BotConfig,
    callbacks?: StreamCallbacks
  ): Promise<GeneratedFile[]> {
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: `Generate a complete Slack bot for this request:

"${prompt}"

Configuration:
- Type: ${config.type}
- Features: ${config.features.map(f => f.name).join(', ')}
- Database: ${config.database ? 'Yes (Prisma)' : 'No'}
- AI: ${config.ai ? 'Yes (Claude/OpenAI)' : 'No'}

Requirements:
1. Use @slack/bolt
2. TypeScript
3. Slash commands
4. Interactive messages and modals
5. Event subscriptions
${config.database ? '6. Data persistence with Prisma' : ''}
${config.ai ? '7. AI integration for smart workflows' : ''}

Generate complete bot application.`,
        },
      ],
    });

    return this.parseGeneratedFiles(message.content[0]);
  }

  /**
   * Generate Twitter bot
   */
  private async generateTwitterBot(
    prompt: string,
    config: BotConfig,
    callbacks?: StreamCallbacks
  ): Promise<GeneratedFile[]> {
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: `Generate a complete Twitter bot for this request:

"${prompt}"

Configuration:
- Type: ${config.type}
- Features: ${config.features.map(f => f.name).join(', ')}
- Database: ${config.database ? 'Yes (Prisma)' : 'No'}
- AI: ${config.ai ? 'Yes (Claude/OpenAI)' : 'No'}

Requirements:
1. Use twitter-api-v2
2. TypeScript
3. Tweet posting, scheduling
4. Mention/DM monitoring
5. Engagement tracking
${config.database ? '6. Store tweets and analytics in database' : ''}
${config.ai ? '7. AI-generated content' : ''}

Generate complete bot with scheduler.`,
        },
      ],
    });

    return this.parseGeneratedFiles(message.content[0]);
  }

  /**
   * Generate WhatsApp bot
   */
  private async generateWhatsAppBot(
    prompt: string,
    config: BotConfig,
    callbacks?: StreamCallbacks
  ): Promise<GeneratedFile[]> {
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: `Generate a complete WhatsApp bot for this request:

"${prompt}"

Configuration:
- Type: ${config.type}
- Features: ${config.features.map(f => f.name).join(', ')}
- Database: ${config.database ? 'Yes (Prisma)' : 'No'}
- AI: ${config.ai ? 'Yes (Claude/OpenAI)' : 'No'}

Requirements:
1. Use whatsapp-web.js or Twilio WhatsApp API
2. TypeScript
3. Message handling
4. Media support (images, files)
5. Group chat support
${config.database ? '6. Conversation history in database' : ''}
${config.ai ? '7. AI-powered customer service' : ''}

Generate complete WhatsApp bot.`,
        },
      ],
    });

    return this.parseGeneratedFiles(message.content[0]);
  }

  /**
   * Generate generic bot (platform-agnostic)
   */
  private async generateGenericBot(
    prompt: string,
    config: BotConfig,
    callbacks?: StreamCallbacks
  ): Promise<GeneratedFile[]> {
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: `Generate a bot application for this request:

"${prompt}"

Configuration:
- Type: ${config.type}
- Features: ${config.features.map(f => f.name).join(', ')}
- Database: ${config.database ? 'Yes (Prisma)' : 'No'}
- AI: ${config.ai ? 'Yes (Claude/OpenAI)' : 'No'}

Create a flexible bot architecture that can be adapted to various platforms.
Include webhooks, API endpoints, and event handlers.`,
        },
      ],
    });

    return this.parseGeneratedFiles(message.content[0]);
  }

  /**
   * Generate bot-specific admin dashboard
   */
  private async generateBotDashboard(config: BotConfig): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Dashboard showing bot activity, logs, stats
    files.push({
      path: 'app/admin/page.tsx',
      content: this.getBotDashboardTemplate(config),
      language: 'typescript',
    });

    // Logs page
    files.push({
      path: 'app/admin/logs/page.tsx',
      content: this.getBotLogsTemplate(config),
      language: 'typescript',
    });

    // Settings page
    files.push({
      path: 'app/admin/settings/page.tsx',
      content: this.getBotSettingsTemplate(config),
      language: 'typescript',
    });

    // Analytics page
    if (config.type === 'analytics' || config.type === 'trading' || config.type === 'content') {
      files.push({
        path: 'app/admin/analytics/page.tsx',
        content: this.getBotAnalyticsTemplate(config),
        language: 'typescript',
      });
    }

    return files;
  }

  /**
   * Generate deployment configuration
   */
  private async generateDeploymentConfig(config: BotConfig): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Dockerfile
    files.push({
      path: 'Dockerfile',
      content: this.getDockerfileTemplate(config),
      language: 'dockerfile',
    });

    // Docker Compose (for local development)
    files.push({
      path: 'docker-compose.yml',
      content: this.getDockerComposeTemplate(config),
      language: 'yaml',
    });

    // Railway config (popular for bot hosting)
    files.push({
      path: 'railway.json',
      content: JSON.stringify({
        build: {
          builder: 'DOCKERFILE',
        },
        deploy: {
          startCommand: 'npm start',
          restartPolicyType: 'ON_FAILURE',
        },
      }, null, 2),
      language: 'json',
    });

    // Render config
    files.push({
      path: 'render.yaml',
      content: this.getRenderConfigTemplate(config),
      language: 'yaml',
    });

    return files;
  }

  /**
   * Generate README with setup instructions
   */
  private generateReadme(config: BotConfig): GeneratedFile {
    const platformInstructions = this.getPlatformSetupInstructions(config.platform);

    return {
      path: 'README.md',
      content: `# ${config.platform.charAt(0).toUpperCase() + config.platform.slice(1)} Bot

A ${config.type} bot built with AutoForge.

## Features

${config.features.map(f => `- **${f.name}**: ${f.description}`).join('\n')}

## Setup

### Prerequisites

- Node.js 18+
- ${config.database ? 'PostgreSQL database' : 'No database required'}
- ${config.platform.charAt(0).toUpperCase() + config.platform.slice(1)} account

### Environment Variables

Copy \`.env.example\` to \`.env\` and fill in your credentials:

\`\`\`bash
cp .env.example .env
\`\`\`

${platformInstructions}

### Installation

\`\`\`bash
npm install
${config.database ? 'npx prisma generate\nnpx prisma db push' : ''}
\`\`\`

### Development

\`\`\`bash
npm run dev
\`\`\`

### Production

\`\`\`bash
npm run build
npm start
\`\`\`

## Deployment

### Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

### Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### Docker

\`\`\`bash
docker build -t my-bot .
docker run -d --env-file .env my-bot
\`\`\`

## Admin Dashboard

Access the admin dashboard at \`http://localhost:3000/admin\` to:

- View bot activity and logs
- Monitor performance
- Configure settings
- View analytics

## Commands

${config.features
  .filter(f => f.commands && f.commands.length > 0)
  .map(f => `### ${f.name}\n\n${f.commands?.map(cmd => `- \`${cmd}\`: ${f.description}`).join('\n')}`)
  .join('\n\n')}

## Support

Built with [AutoForge](https://autoforge.app) - The Shopify for Software

Need help? [Join our Discord](https://discord.gg/autoforge)

## License

MIT
`,
      language: 'markdown',
    };
  }

  // ============================================================================
  // TEMPLATE HELPERS
  // ============================================================================

  private getBotDashboardTemplate(config: BotConfig): string {
    return `import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users, MessageSquare, TrendingUp } from 'lucide-react';

export default async function BotDashboard() {
  // Fetch bot stats from database
  const stats = {
    totalMessages: 1234,
    activeUsers: 456,
    commandsExecuted: 789,
    uptime: 99.9,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bot Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Monitor your ${config.platform} bot performance
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Messages
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</div>
            <p className="text-xs text-green-600 mt-1">↑ +12% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Users
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-green-600 mt-1">↑ +8% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Commands Executed
            </CardTitle>
            <Activity className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.commandsExecuted}</div>
            <p className="text-xs text-green-600 mt-1">↑ +23% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Uptime
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uptime}%</div>
            <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="font-medium">New user joined</p>
                <p className="text-sm text-gray-500">@username123</p>
              </div>
              <span className="text-sm text-gray-500">2 minutes ago</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="font-medium">Command executed</p>
                <p className="text-sm text-gray-500">/help by @user456</p>
              </div>
              <span className="text-sm text-gray-500">5 minutes ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}`;
  }

  private getBotLogsTemplate(config: BotConfig): string {
    return `import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function BotLogs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bot Logs</h1>
        <p className="text-gray-600 mt-2">View all bot activity and errors</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-sm space-y-2 max-h-96 overflow-y-auto bg-gray-900 text-green-400 p-4 rounded">
            <div>[INFO] Bot started successfully</div>
            <div>[INFO] Connected to ${config.platform}</div>
            <div>[INFO] Command /help executed by user123</div>
            <div>[WARN] Rate limit approaching</div>
            <div>[INFO] Message processed: 1234</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}`;
  }

  private getBotSettingsTemplate(config: BotConfig): string {
    return `import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function BotSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bot Settings</h1>
        <p className="text-gray-600 mt-2">Configure your bot behavior</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Bot Name</Label>
            <Input defaultValue="My Bot" />
          </div>

          <div className="space-y-2">
            <Label>Command Prefix</Label>
            <Input defaultValue="/" />
          </div>

          ${config.ai ? `
          <div className="space-y-2">
            <Label>AI Model</Label>
            <select className="w-full p-2 border rounded">
              <option>Claude Sonnet</option>
              <option>GPT-4</option>
              <option>GPT-3.5</option>
            </select>
          </div>
          ` : ''}

          <Button>Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}`;
  }

  private getBotAnalyticsTemplate(config: BotConfig): string {
    return `import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BotAnalytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-gray-600 mt-2">Track your bot's performance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
            <p className="text-gray-500">Chart would go here (Recharts)</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Commands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>/help</span>
                <span className="font-bold">234</span>
              </div>
              <div className="flex justify-between">
                <span>/stats</span>
                <span className="font-bold">156</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>@user123</span>
                <span className="font-bold">89 msgs</span>
              </div>
              <div className="flex justify-between">
                <span>@user456</span>
                <span className="font-bold">67 msgs</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}`;
  }

  private generatePackageJson(config: BotConfig): GeneratedFile {
    const dependencies: Record<string, string> = {
      'typescript': '^5.0.0',
      'ts-node': '^10.9.0',
      '@types/node': '^20.0.0',
      'dotenv': '^16.0.0',
    };

    // Platform-specific dependencies
    if (config.platform === 'discord') {
      dependencies['discord.js'] = '^14.14.0';
    } else if (config.platform === 'telegram') {
      dependencies['node-telegram-bot-api'] = '^0.64.0';
      dependencies['@types/node-telegram-bot-api'] = '^0.64.0';
    } else if (config.platform === 'slack') {
      dependencies['@slack/bolt'] = '^3.17.0';
    } else if (config.platform === 'twitter') {
      dependencies['twitter-api-v2'] = '^1.16.0';
    } else if (config.platform === 'whatsapp') {
      dependencies['whatsapp-web.js'] = '^1.23.0';
    }

    // Database
    if (config.database) {
      dependencies['@prisma/client'] = '^5.8.0';
      dependencies['prisma'] = '^5.8.0';
    }

    // AI
    if (config.ai) {
      dependencies['@anthropic-ai/sdk'] = '^0.68.0';
      dependencies['openai'] = '^4.24.0';
    }

    return {
      path: 'package.json',
      content: JSON.stringify({
        name: `${config.platform}-bot`,
        version: '1.0.0',
        description: `A ${config.type} bot for ${config.platform}`,
        main: 'dist/index.js',
        scripts: {
          dev: 'ts-node src/index.ts',
          build: 'tsc',
          start: 'node dist/index.js',
          ...(config.database ? { 'db:push': 'prisma db push' } : {}),
        },
        keywords: [config.platform, 'bot', config.type],
        dependencies,
      }, null, 2),
      language: 'json',
    };
  }

  private generateTsConfig(): GeneratedFile {
    return {
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          lib: ['ES2020'],
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          resolveJsonModule: true,
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist'],
      }, null, 2),
      language: 'json',
    };
  }

  private generateEnvExample(config: BotConfig): GeneratedFile {
    let envVars = '';

    if (config.platform === 'discord') {
      envVars += 'DISCORD_TOKEN=your_bot_token_here\nDISCORD_CLIENT_ID=your_client_id_here\n';
    } else if (config.platform === 'telegram') {
      envVars += 'TELEGRAM_BOT_TOKEN=your_bot_token_here\n';
    } else if (config.platform === 'slack') {
      envVars += 'SLACK_BOT_TOKEN=your_bot_token_here\nSLACK_SIGNING_SECRET=your_signing_secret_here\n';
    } else if (config.platform === 'twitter') {
      envVars += 'TWITTER_API_KEY=your_api_key\nTWITTER_API_SECRET=your_api_secret\nTWITTER_ACCESS_TOKEN=your_access_token\nTWITTER_ACCESS_SECRET=your_access_secret\n';
    }

    if (config.database) {
      envVars += '\nDATABASE_URL=postgresql://user:password@localhost:5432/botdb\n';
    }

    if (config.ai) {
      envVars += '\nANTHROPIC_API_KEY=your_anthropic_key\nOPENAI_API_KEY=your_openai_key\n';
    }

    return {
      path: '.env.example',
      content: envVars,
      language: 'plaintext',
    };
  }

  private generatePrismaSchema(config: BotConfig): GeneratedFile {
    return {
      path: 'prisma/schema.prisma',
      content: `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  platformId String  @unique // Discord ID, Telegram ID, etc.
  username  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  messages  Message[]
  commands  CommandLog[]
}

model Message {
  id        String   @id @default(cuid())
  userId    String
  content   String
  timestamp DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([timestamp])
}

model CommandLog {
  id        String   @id @default(cuid())
  userId    String
  command   String
  args      String?
  success   Boolean
  timestamp DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([command])
  @@index([timestamp])
}

${config.type === 'moderation' ? `
model ModAction {
  id        String   @id @default(cuid())
  userId    String
  action    String   // ban, warn, mute
  reason    String?
  timestamp DateTime @default(now())

  @@index([userId])
  @@index([timestamp])
}
` : ''}

${config.type === 'trading' ? `
model Trade {
  id        String   @id @default(cuid())
  symbol    String
  action    String   // buy, sell
  price     Float
  amount    Float
  profit    Float?
  timestamp DateTime @default(now())

  @@index([symbol])
  @@index([timestamp])
}
` : ''}
`,
      language: 'prisma',
    };
  }

  private getDockerfileTemplate(config: BotConfig): string {
    return `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

${config.database ? 'RUN npx prisma generate' : ''}

CMD ["npm", "start"]
`;
  }

  private getDockerComposeTemplate(config: BotConfig): string {
    return `version: '3.8'

services:
  bot:
    build: .
    env_file:
      - .env
    restart: unless-stopped
${config.database ? `
  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: botuser
      POSTGRES_PASSWORD: botpass
      POSTGRES_DB: botdb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
` : ''}
`;
  }

  private getRenderConfigTemplate(config: BotConfig): string {
    return `services:
  - type: worker
    name: ${config.platform}-bot
    env: node
    buildCommand: npm install && npm run build${config.database ? ' && npx prisma generate' : ''}
    startCommand: npm start
    envVars:
${config.platform === 'discord' ? `      - key: DISCORD_TOKEN
        sync: false
      - key: DISCORD_CLIENT_ID
        sync: false` : ''}
${config.platform === 'telegram' ? `      - key: TELEGRAM_BOT_TOKEN
        sync: false` : ''}
${config.database ? `      - key: DATABASE_URL
        fromDatabase:
          name: bot-db
          property: connectionString` : ''}
${config.database ? `
databases:
  - name: bot-db
    plan: starter
` : ''}
`;
  }

  private getPlatformSetupInstructions(platform: BotPlatform): string {
    switch (platform) {
      case 'discord':
        return `#### Discord Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Go to "Bot" tab and click "Add Bot"
4. Copy the bot token and add to \`.env\` as \`DISCORD_TOKEN\`
5. Enable required intents (Message Content, Server Members, etc.)
6. Go to OAuth2 → URL Generator
7. Select scopes: \`bot\`, \`applications.commands\`
8. Select permissions based on your bot's needs
9. Use the generated URL to invite bot to your server`;

      case 'telegram':
        return `#### Telegram Setup

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send \`/newbot\` and follow the prompts
3. Copy the bot token and add to \`.env\` as \`TELEGRAM_BOT_TOKEN\`
4. Configure bot settings with BotFather (optional)`;

      case 'slack':
        return `#### Slack Setup

1. Go to [Slack API](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Add required OAuth scopes in "OAuth & Permissions"
4. Install app to workspace
5. Copy Bot Token and add to \`.env\` as \`SLACK_BOT_TOKEN\`
6. Copy Signing Secret and add to \`.env\` as \`SLACK_SIGNING_SECRET\``;

      case 'twitter':
        return `#### Twitter Setup

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new project and app
3. Generate API keys and tokens
4. Add to \`.env\`:
   - \`TWITTER_API_KEY\`
   - \`TWITTER_API_SECRET\`
   - \`TWITTER_ACCESS_TOKEN\`
   - \`TWITTER_ACCESS_SECRET\``;

      default:
        return `#### Setup Instructions

Follow the platform-specific documentation to obtain API credentials.`;
    }
  }

  /**
   * Parse generated files from AI response
   */
  private parseGeneratedFiles(content: any): GeneratedFile[] {
    if (content.type !== 'text') return [];

    const files: GeneratedFile[] = [];
    const text = content.text;

    // Extract code blocks with file paths
    const fileRegex = /(?:File:|Path:|\/\/|#)\s*([^\n]+)\n```(\w+)?\n([\s\S]+?)```/g;
    let match;

    while ((match = fileRegex.exec(text)) !== null) {
      const path = match[1].trim().replace(/^[:\-]\s*/, '');
      const language = match[2] || this.detectLanguage(path);
      const content = match[3].trim();

      files.push({
        path,
        content,
        language,
      });
    }

    return files;
  }

  private detectLanguage(path: string): string {
    if (path.endsWith('.ts')) return 'typescript';
    if (path.endsWith('.js')) return 'javascript';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.md')) return 'markdown';
    if (path.endsWith('.yml') || path.endsWith('.yaml')) return 'yaml';
    if (path.includes('Dockerfile')) return 'dockerfile';
    return 'plaintext';
  }
}

// Export singleton instance
export const botGenerator = new BotGenerator();
