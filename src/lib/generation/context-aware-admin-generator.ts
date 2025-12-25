/**
 * CONTEXT-AWARE ADMIN PANEL GENERATOR
 *
 * File: src/lib/generation/context-aware-admin-generator.ts
 *
 * Purpose:
 * - Detect app type (bot, trading system, scraper, CRM, etc.)
 * - Generate SPECIALIZED admin panels optimized for each type
 * - Bots get: activity logs, command stats, error monitoring
 * - Trading systems get: P&L charts, position tracking, strategy settings
 * - Scrapers get: job queue, scraped data table, schedule management
 * - CRMs get: traditional data tables and forms
 *
 * This is what makes AutoForge capable of building COMPLEX software,
 * not just CRMs.
 */

import Anthropic from '@anthropic-ai/sdk';
import { GeneratedFile } from './bolt-generator';
import { AdminPanelGenerator } from './admin-panel-generator';
import { enhancedClassifyPrompt, EnhancedGenerationType } from './enhanced-prompt-classifier';

// ============================================================================
// TYPES
// ============================================================================

export interface ContextAwareAdminConfig {
  appType: EnhancedGenerationType;
  appName: string;
  appDescription: string;
  prismaSchema?: string;
  primaryColor: string;
  enableRealTime?: boolean;
  enableExport?: boolean;
  platformSpecific?: {
    // For bots
    platform?: 'discord' | 'telegram' | 'slack' | 'twitter' | 'whatsapp';

    // For trading bots
    exchange?: 'binance' | 'coinbase' | 'alpaca';

    // For scrapers
    scrapeTargets?: string[];
  };
}

export interface ContextAwareAdminResult {
  success: boolean;
  files: GeneratedFile[];
  error?: string;
  dashboardType: string;
  features: string[];
}

// ============================================================================
// CONTEXT-AWARE ADMIN GENERATOR
// ============================================================================

export class ContextAwareAdminGenerator {
  private anthropic: Anthropic;
  private fallbackGenerator: AdminPanelGenerator;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.anthropic = new Anthropic({ apiKey });
    this.fallbackGenerator = new AdminPanelGenerator();
  }

  /**
   * Main entry point - detects app type and generates appropriate admin panel
   */
  async generate(
    prompt: string,
    appName: string,
    prismaSchema?: string,
    existingFiles: GeneratedFile[] = []
  ): Promise<ContextAwareAdminResult> {
    console.log('🎨 Generating context-aware admin panel...');

    // Step 1: Detect app type
    const classification = enhancedClassifyPrompt(prompt);
    console.log(`   → Detected app type: ${classification.primaryType} (confidence: ${Math.round(classification.confidence * 100)}%)`);

    const config: ContextAwareAdminConfig = {
      appType: classification.primaryType,
      appName,
      appDescription: prompt,
      prismaSchema,
      primaryColor: this.getColorForAppType(classification.primaryType),
      enableRealTime: classification.detectedFeatures.hasWorkflow || classification.primaryType === 'trading-bot',
      enableExport: true,
    };

    // Step 2: Generate specialized admin panel based on type
    try {
      switch (classification.primaryType) {
        case 'bot':
          return await this.generateBotAdminPanel(config);

        case 'trading-bot':
          return await this.generateTradingBotAdminPanel(config);

        case 'web-scraper':
          return await this.generateScraperAdminPanel(config);

        case 'social-automation':
          return await this.generateSocialAutomationAdminPanel(config);

        case 'data-pipeline':
          return await this.generateDataPipelineAdminPanel(config);

        case 'cli-tool':
          // CLI tools don't have admin panels
          return {
            success: true,
            files: [],
            dashboardType: 'none',
            features: ['CLI tool - no admin panel needed'],
          };

        case 'browser-extension':
          return await this.generateExtensionOptionsPage(config);

        default:
          // Fall back to schema-driven admin panel
          if (prismaSchema) {
            const result = await this.fallbackGenerator.generate(prismaSchema, appName, existingFiles);
            return {
              success: result.success,
              files: result.files,
              error: result.error,
              dashboardType: 'generic',
              features: ['Data tables', 'CRUD forms', 'Analytics dashboard'],
            };
          }
          return {
            success: false,
            error: 'No Prisma schema provided for generic admin panel',
            files: [],
            dashboardType: 'none',
            features: [],
          };
      }
    } catch (error) {
      console.error('Admin panel generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        files: [],
        dashboardType: 'error',
        features: [],
      };
    }
  }

  /**
   * Generate Bot Admin Panel
   * Features: Activity logs, command stats, error monitoring, platform-specific metrics
   */
  private async generateBotAdminPanel(config: ContextAwareAdminConfig): Promise<ContextAwareAdminResult> {
    console.log('   → Generating BOT admin panel...');

    const files: GeneratedFile[] = [];

    // Dashboard with bot-specific widgets
    files.push({
      path: 'src/app/admin/page.tsx',
      content: this.generateBotDashboard(config),
      language: 'typescript',
    });

    // Activity Logs Page
    files.push({
      path: 'src/app/admin/logs/page.tsx',
      content: this.generateBotLogsPage(config),
      language: 'typescript',
    });

    // Command Stats Page
    files.push({
      path: 'src/app/admin/commands/page.tsx',
      content: this.generateBotCommandsPage(config),
      language: 'typescript',
    });

    // Bot Settings Page
    files.push({
      path: 'src/app/admin/settings/page.tsx',
      content: this.generateBotSettingsPage(config),
      language: 'typescript',
    });

    // API routes for bot data
    files.push({
      path: 'src/app/api/admin/bot-stats/route.ts',
      content: this.generateBotStatsAPI(config),
      language: 'typescript',
    });

    // Real-time activity component
    files.push({
      path: 'src/components/admin/BotActivityFeed.tsx',
      content: this.generateBotActivityFeed(config),
      language: 'typescript',
    });

    // Admin layout with bot-specific navigation
    files.push({
      path: 'src/app/admin/layout.tsx',
      content: this.generateBotAdminLayout(config),
      language: 'typescript',
    });

    return {
      success: true,
      files,
      dashboardType: 'bot',
      features: [
        'Real-time activity feed',
        'Command usage analytics',
        'Error monitoring',
        'Platform-specific metrics',
        'Bot configuration settings',
      ],
    };
  }

  /**
   * Generate Trading Bot Admin Panel
   * Features: P/L dashboard, position tracking, strategy settings, live charts
   */
  private async generateTradingBotAdminPanel(config: ContextAwareAdminConfig): Promise<ContextAwareAdminResult> {
    console.log('   → Generating TRADING BOT admin panel...');

    const files: GeneratedFile[] = [];

    // Trading Dashboard with charts
    files.push({
      path: 'src/app/admin/page.tsx',
      content: this.generateTradingDashboard(config),
      language: 'typescript',
    });

    // Positions Page
    files.push({
      path: 'src/app/admin/positions/page.tsx',
      content: this.generateTradingPositionsPage(config),
      language: 'typescript',
    });

    // Trade History Page
    files.push({
      path: 'src/app/admin/history/page.tsx',
      content: this.generateTradingHistoryPage(config),
      language: 'typescript',
    });

    // Strategy Settings Page
    files.push({
      path: 'src/app/admin/strategy/page.tsx',
      content: this.generateStrategySettingsPage(config),
      language: 'typescript',
    });

    // P/L Analytics Component
    files.push({
      path: 'src/components/admin/PLChart.tsx',
      content: this.generatePLChart(config),
      language: 'typescript',
    });

    // Risk Metrics Component
    files.push({
      path: 'src/components/admin/RiskMetrics.tsx',
      content: this.generateRiskMetrics(config),
      language: 'typescript',
    });

    // Admin layout
    files.push({
      path: 'src/app/admin/layout.tsx',
      content: this.generateTradingAdminLayout(config),
      language: 'typescript',
    });

    return {
      success: true,
      files,
      dashboardType: 'trading-bot',
      features: [
        'Real-time P/L tracking',
        'Position management',
        'Trade history with analytics',
        'Strategy configuration',
        'Risk metrics dashboard',
        'Live price charts',
      ],
    };
  }

  /**
   * Generate Web Scraper Admin Panel
   * Features: Job queue, scraped data table, schedule management
   */
  private async generateScraperAdminPanel(config: ContextAwareAdminConfig): Promise<ContextAwareAdminResult> {
    console.log('   → Generating SCRAPER admin panel...');

    const files: GeneratedFile[] = [];

    // Scraper Dashboard
    files.push({
      path: 'src/app/admin/page.tsx',
      content: this.generateScraperDashboard(config),
      language: 'typescript',
    });

    // Job Queue Page
    files.push({
      path: 'src/app/admin/jobs/page.tsx',
      content: this.generateScraperJobsPage(config),
      language: 'typescript',
    });

    // Scraped Data Page
    files.push({
      path: 'src/app/admin/data/page.tsx',
      content: this.generateScrapedDataPage(config),
      language: 'typescript',
    });

    // Schedule Management Page
    files.push({
      path: 'src/app/admin/schedule/page.tsx',
      content: this.generateScraperSchedulePage(config),
      language: 'typescript',
    });

    // Admin layout
    files.push({
      path: 'src/app/admin/layout.tsx',
      content: this.generateScraperAdminLayout(config),
      language: 'typescript',
    });

    return {
      success: true,
      files,
      dashboardType: 'web-scraper',
      features: [
        'Job queue management',
        'Scraped data browser',
        'Success/failure analytics',
        'Schedule management',
        'Data export options',
      ],
    };
  }

  /**
   * Generate Social Automation Admin Panel
   * Features: Post scheduler, content calendar, engagement analytics
   */
  private async generateSocialAutomationAdminPanel(config: ContextAwareAdminConfig): Promise<ContextAwareAdminResult> {
    console.log('   → Generating SOCIAL AUTOMATION admin panel...');

    const files: GeneratedFile[] = [];

    // Social Dashboard
    files.push({
      path: 'src/app/admin/page.tsx',
      content: this.generateSocialDashboard(config),
      language: 'typescript',
    });

    // Post Scheduler Page
    files.push({
      path: 'src/app/admin/schedule/page.tsx',
      content: this.generatePostSchedulerPage(config),
      language: 'typescript',
    });

    // Analytics Page
    files.push({
      path: 'src/app/admin/analytics/page.tsx',
      content: this.generateSocialAnalyticsPage(config),
      language: 'typescript',
    });

    // Accounts Management Page
    files.push({
      path: 'src/app/admin/accounts/page.tsx',
      content: this.generateSocialAccountsPage(config),
      language: 'typescript',
    });

    // Admin layout
    files.push({
      path: 'src/app/admin/layout.tsx',
      content: this.generateSocialAdminLayout(config),
      language: 'typescript',
    });

    return {
      success: true,
      files,
      dashboardType: 'social-automation',
      features: [
        'Post scheduler',
        'Content calendar',
        'Engagement analytics',
        'Multi-platform account management',
        'Content performance tracking',
      ],
    };
  }

  /**
   * Generate Data Pipeline Admin Panel
   * Features: Pipeline monitoring, job status, data lineage
   */
  private async generateDataPipelineAdminPanel(config: ContextAwareAdminConfig): Promise<ContextAwareAdminResult> {
    console.log('   → Generating DATA PIPELINE admin panel...');

    const files: GeneratedFile[] = [];

    // Pipeline Dashboard
    files.push({
      path: 'src/app/admin/page.tsx',
      content: this.generatePipelineDashboard(config),
      language: 'typescript',
    });

    // Jobs Page
    files.push({
      path: 'src/app/admin/jobs/page.tsx',
      content: this.generatePipelineJobsPage(config),
      language: 'typescript',
    });

    // Data Lineage Page
    files.push({
      path: 'src/app/admin/lineage/page.tsx',
      content: this.generateDataLineagePage(config),
      language: 'typescript',
    });

    // Admin layout
    files.push({
      path: 'src/app/admin/layout.tsx',
      content: this.generatePipelineAdminLayout(config),
      language: 'typescript',
    });

    return {
      success: true,
      files,
      dashboardType: 'data-pipeline',
      features: [
        'Pipeline monitoring',
        'Job execution tracking',
        'Data lineage visualization',
        'Error handling dashboard',
        'Schedule management',
      ],
    };
  }

  /**
   * Generate Browser Extension Options Page
   * Features: Extension settings, user preferences
   */
  private async generateExtensionOptionsPage(config: ContextAwareAdminConfig): Promise<ContextAwareAdminResult> {
    console.log('   → Generating EXTENSION options page...');

    const files: GeneratedFile[] = [];

    // Extension Options Page
    files.push({
      path: 'src/options/index.html',
      content: this.generateExtensionOptionsHTML(config),
      language: 'html',
    });

    files.push({
      path: 'src/options/options.tsx',
      content: this.generateExtensionOptionsUI(config),
      language: 'typescript',
    });

    return {
      success: true,
      files,
      dashboardType: 'extension-options',
      features: [
        'Extension settings',
        'User preferences',
        'Storage management',
        'Sync configuration',
      ],
    };
  }

  // ============================================================================
  // HELPER METHODS - Generate specific file contents
  // ============================================================================

  private getColorForAppType(appType: EnhancedGenerationType): string {
    const colorMap: Record<EnhancedGenerationType, string> = {
      'bot': '#5865F2', // Discord blue
      'trading-bot': '#10B981', // Green
      'web-scraper': '#8B5CF6', // Purple
      'social-automation': '#EC4899', // Pink
      'data-pipeline': '#F59E0B', // Orange
      'cli-tool': '#6B7280', // Gray
      'browser-extension': '#3B82F6', // Blue
      'ui-application': '#0EA5E9', // Sky
      'full-saas': '#EF4444', // Red
      'api-backend': '#14B8A6', // Teal
      'workflow-automation': '#F97316', // Orange-red
      'ai-agent-network': '#A855F7', // Purple
      'hybrid-workflow-ui': '#F97316',
      'hybrid-agent-ui': '#A855F7',
      'infrastructure': '#6B7280',
      'full-stack-saas': '#EF4444',
      'mobile-backend': '#06B6D4', // Cyan
    };
    return colorMap[appType] || '#3B82F6';
  }

  // Bot dashboard and components will be implemented in the next sections
  // These are placeholder methods that will generate actual React/Next.js code

  private generateBotDashboard(config: ContextAwareAdminConfig): string {
    // Will generate actual dashboard code
    return `// Bot Dashboard - to be implemented`;
  }

  private generateBotLogsPage(config: ContextAwareAdminConfig): string {
    return `// Bot Logs Page - to be implemented`;
  }

  private generateBotCommandsPage(config: ContextAwareAdminConfig): string {
    return `// Bot Commands Page - to be implemented`;
  }

  private generateBotSettingsPage(config: ContextAwareAdminConfig): string {
    return `// Bot Settings Page - to be implemented`;
  }

  private generateBotStatsAPI(config: ContextAwareAdminConfig): string {
    return `// Bot Stats API - to be implemented`;
  }

  private generateBotActivityFeed(config: ContextAwareAdminConfig): string {
    return `// Bot Activity Feed Component - to be implemented`;
  }

  private generateBotAdminLayout(config: ContextAwareAdminConfig): string {
    return `// Bot Admin Layout - to be implemented`;
  }

  private generateTradingDashboard(config: ContextAwareAdminConfig): string {
    return `// Trading Dashboard - to be implemented`;
  }

  private generateTradingPositionsPage(config: ContextAwareAdminConfig): string {
    return `// Trading Positions Page - to be implemented`;
  }

  private generateTradingHistoryPage(config: ContextAwareAdminConfig): string {
    return `// Trading History Page - to be implemented`;
  }

  private generateStrategySettingsPage(config: ContextAwareAdminConfig): string {
    return `// Strategy Settings Page - to be implemented`;
  }

  private generatePLChart(config: ContextAwareAdminConfig): string {
    return `// P/L Chart Component - to be implemented`;
  }

  private generateRiskMetrics(config: ContextAwareAdminConfig): string {
    return `// Risk Metrics Component - to be implemented`;
  }

  private generateTradingAdminLayout(config: ContextAwareAdminConfig): string {
    return `// Trading Admin Layout - to be implemented`;
  }

  private generateScraperDashboard(config: ContextAwareAdminConfig): string {
    return `// Scraper Dashboard - to be implemented`;
  }

  private generateScraperJobsPage(config: ContextAwareAdminConfig): string {
    return `// Scraper Jobs Page - to be implemented`;
  }

  private generateScrapedDataPage(config: ContextAwareAdminConfig): string {
    return `// Scraped Data Page - to be implemented`;
  }

  private generateScraperSchedulePage(config: ContextAwareAdminConfig): string {
    return `// Scraper Schedule Page - to be implemented`;
  }

  private generateScraperAdminLayout(config: ContextAwareAdminConfig): string {
    return `// Scraper Admin Layout - to be implemented`;
  }

  private generateSocialDashboard(config: ContextAwareAdminConfig): string {
    return `// Social Dashboard - to be implemented`;
  }

  private generatePostSchedulerPage(config: ContextAwareAdminConfig): string {
    return `// Post Scheduler Page - to be implemented`;
  }

  private generateSocialAnalyticsPage(config: ContextAwareAdminConfig): string {
    return `// Social Analytics Page - to be implemented`;
  }

  private generateSocialAccountsPage(config: ContextAwareAdminConfig): string {
    return `// Social Accounts Page - to be implemented`;
  }

  private generateSocialAdminLayout(config: ContextAwareAdminConfig): string {
    return `// Social Admin Layout - to be implemented`;
  }

  private generatePipelineDashboard(config: ContextAwareAdminConfig): string {
    return `// Pipeline Dashboard - to be implemented`;
  }

  private generatePipelineJobsPage(config: ContextAwareAdminConfig): string {
    return `// Pipeline Jobs Page - to be implemented`;
  }

  private generateDataLineagePage(config: ContextAwareAdminConfig): string {
    return `// Data Lineage Page - to be implemented`;
  }

  private generatePipelineAdminLayout(config: ContextAwareAdminConfig): string {
    return `// Pipeline Admin Layout - to be implemented`;
  }

  private generateExtensionOptionsHTML(config: ContextAwareAdminConfig): string {
    return `// Extension Options HTML - to be implemented`;
  }

  private generateExtensionOptionsUI(config: ContextAwareAdminConfig): string {
    return `// Extension Options UI - to be implemented`;
  }
}
