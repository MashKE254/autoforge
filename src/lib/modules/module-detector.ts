/**
 * Module Detection Service
 *
 * Automatically detects which modules are needed based on user prompts
 */

import { generateGitHubModule, getGitHubModulePrompt } from './github';
import { generateStorageModule, getStorageModulePrompt } from './storage';
import { generateRealtimeModule, getRealtimeModulePrompt } from './realtime';
import { generateVectorDBModule, getVectorDBModulePrompt } from './vector-db';
import { generatePDFModule, getPDFModulePrompt } from './pdf';
import { generatePackageManagerModule, getPackageManagerModulePrompt } from './package-manager';
import { generateMarketplaceModule, getMarketplaceModulePrompt } from './marketplace';

export interface DetectedModule {
  category: string;
  config: any;
  prompt: string;
  files: Array<{ path: string; content: string }>;
  envVars: string[];
  dependencies: string[];
  instructions: string[];
}

/**
 * Detect required modules from user prompt
 */
export function detectRequiredModules(userPrompt: string): DetectedModule[] {
  const prompt = userPrompt.toLowerCase();
  const modules: DetectedModule[] = [];

  // GitHub Integration
  if (
    /github|repository|repositories|commit|commits|pull request|pr|webhook|deployment pipeline/i.test(userPrompt)
  ) {
    const features: Array<'oauth' | 'webhooks' | 'pr-automation' | 'repo-access' | 'workflow-monitoring'> = ['repo-access'];

    if (/webhook/i.test(userPrompt)) features.push('webhooks');
    if (/pull request|pr|automated pr|dependency update/i.test(userPrompt)) features.push('pr-automation');
    if (/deployment|pipeline|workflow|ci\/cd|github actions/i.test(userPrompt)) features.push('workflow-monitoring');
    if (/oauth|sign in|login|authenticate/i.test(userPrompt)) features.push('oauth');

    const config = { features };
    const output = generateGitHubModule(config);

    modules.push({
      category: 'GITHUB',
      config,
      prompt: getGitHubModulePrompt(config),
      ...output,
    });
  }

  // File Storage
  if (
    /file|upload|document|image|attachment|storage|photo|video|pdf|download/i.test(userPrompt)
  ) {
    const config = {
      provider: 'supabase' as const, // Default to Supabase since it's auto-provisioned
      maxFileSize: '10MB',
      allowedTypes: ['image/*', 'application/pdf', 'text/plain'],
      features: ['upload' as const, 'download' as const, 'delete' as const],
    };

    const output = generateStorageModule(config);

    modules.push({
      category: 'STORAGE',
      config,
      prompt: getStorageModulePrompt(config),
      ...output,
    });
  }

  // Real-time/WebSocket
  if (
    /real-time|realtime|live|websocket|socket\.io|collaborative|notifications?|chat|messaging/i.test(userPrompt)
  ) {
    const config = {
      provider: 'supabase-realtime' as const, // Default to Supabase Realtime
      channels: ['notifications', 'updates'],
      features: ['broadcast' as const, 'presence' as const],
    };

    const output = generateRealtimeModule(config);

    modules.push({
      category: 'REALTIME',
      config,
      prompt: getRealtimeModulePrompt(config),
      ...output,
    });
  }

  // Vector Database (for AI features)
  if (
    /ai|vector|embedding|semantic search|similarity|recommendations?|learning|memory|rag|retrieval/i.test(userPrompt)
  ) {
    const config = {
      provider: 'supabase-pgvector' as const, // Use Supabase pgvector (already provisioned)
      dimension: 1536, // OpenAI embedding dimension
      indexType: 'ivfflat',
    };

    const output = generateVectorDBModule(config);

    modules.push({
      category: 'VECTOR_DB',
      config,
      prompt: getVectorDBModulePrompt(config),
      ...output,
    });
  }

  // PDF Generation
  if (
    /invoice|receipt|report|pdf|printable|document generation|export pdf/i.test(userPrompt)
  ) {
    const templates: Array<'invoice' | 'report' | 'receipt' | 'contract'> = [];
    if (/invoice/i.test(userPrompt)) templates.push('invoice');
    if (/report/i.test(userPrompt)) templates.push('report');
    if (/receipt/i.test(userPrompt)) templates.push('receipt');
    if (templates.length === 0) templates.push('invoice'); // Default

    const config = {
      templates,
      engine: 'react-pdf' as const,
    };

    const output = generatePDFModule(config);

    modules.push({
      category: 'PDF',
      config,
      prompt: getPDFModulePrompt(config),
      ...output,
    });
  }

  // Package Manager (for dependency scanning)
  if (
    /dependency|dependencies|package|npm|pip|composer|vulnerability|vulnerabilities|security scan|outdated/i.test(userPrompt)
  ) {
    const managers: Array<'npm' | 'pip' | 'composer' | 'maven' | 'go' | 'cargo'> = [];
    if (/npm|node|javascript|typescript/i.test(userPrompt)) managers.push('npm');
    if (/pip|python/i.test(userPrompt)) managers.push('pip');
    if (/composer|php/i.test(userPrompt)) managers.push('composer');
    if (managers.length === 0) managers.push('npm'); // Default

    const config = {
      managers,
      features: ['scan' as const, 'vulnerability-check' as const, 'auto-pr' as const, 'notifications' as const],
      schedule: '0 9 * * MON', // Every Monday at 9 AM
    };

    const output = generatePackageManagerModule(config);

    modules.push({
      category: 'PACKAGE_MANAGER',
      config,
      prompt: getPackageManagerModulePrompt(config),
      ...output,
    });
  }

  // Marketplace (for monetization)
  if (
    /marketplace|sell|monetize|revenue|payout|creator|earnings|commission/i.test(userPrompt)
  ) {
    const config = {
      platformFeePercent: 7,
      stripeFeePercent: 2.9,
      payoutSchedule: 'weekly' as const,
      minimumPayout: 5000, // $50
    };

    const output = generateMarketplaceModule(config);

    modules.push({
      category: 'MARKETPLACE',
      config,
      prompt: getMarketplaceModulePrompt(config),
      ...output,
    });
  }

  return modules;
}

/**
 * Get combined prompt for all detected modules
 */
export function getModulesPrompt(modules: DetectedModule[]): string {
  if (modules.length === 0) return '';

  return `
# REQUIRED MODULES

The following modules MUST be included in the generated application:

${modules.map((m, idx) => `
## ${idx + 1}. ${m.category} Module

${m.prompt}

### Dependencies to include in package.json:
${m.dependencies.map(d => `- ${d}`).join('\n')}

### Environment variables needed:
${m.envVars.map(v => `- ${v}`).join('\n')}

### Setup instructions:
${m.instructions.map((i, iidx) => `${iidx + 1}. ${i}`).join('\n')}
`).join('\n')}

---

**IMPORTANT**: You MUST generate ALL the required files for each module listed above.
Include complete implementations, not just placeholders.
`;
}

/**
 * Get all files from detected modules
 */
export function getModuleFiles(modules: DetectedModule[]): Array<{ path: string; content: string }> {
  return modules.flatMap(m => m.files);
}

/**
 * Get all dependencies from detected modules
 */
export function getModuleDependencies(modules: DetectedModule[]): string[] {
  const deps = new Set<string>();
  modules.forEach(m => m.dependencies.forEach(d => deps.add(d)));
  return Array.from(deps);
}

/**
 * Get all environment variables from detected modules
 */
export function getModuleEnvVars(modules: DetectedModule[]): string[] {
  const envVars = new Set<string>();
  modules.forEach(m => m.envVars.forEach(v => envVars.add(v)));
  return Array.from(envVars);
}
