/**
 * Integration Detection System
 *
 * Analyzes user prompts to detect required integrations
 */

import { detectRequiredIntegrations, getIntegration } from './registry';
import { IntegrationConfig } from './types';

export interface DetectedIntegration {
  config: IntegrationConfig;
  confidence: number; // 0-1
  triggeredBy: string[]; // Which keywords triggered detection
}

export interface IntegrationDetectionResult {
  integrations: DetectedIntegration[];
  summary: {
    total: number;
    oauth: number;
    apiKey: number;
    estimatedSetupTime: number;
  };
}

export function analyzePromptForIntegrations(prompt: string): IntegrationDetectionResult {
  const lowercasePrompt = prompt.toLowerCase();
  const detectedIds = detectRequiredIntegrations(prompt);

  const integrations: DetectedIntegration[] = detectedIds.map((id) => {
    const config = getIntegration(id)!;

    // Calculate confidence based on how many triggers matched
    const matchedTriggers = config.triggers.filter((trigger) =>
      lowercasePrompt.includes(trigger.toLowerCase())
    );

    const confidence = Math.min(matchedTriggers.length / config.triggers.length, 1);

    return {
      config,
      confidence,
      triggeredBy: matchedTriggers,
    };
  });

  // Sort by confidence
  integrations.sort((a, b) => b.confidence - a.confidence);

  // Calculate summary
  const summary = {
    total: integrations.length,
    oauth: integrations.filter((i) => i.config.type === 'oauth').length,
    apiKey: integrations.filter((i) => i.config.type === 'api-key').length,
    estimatedSetupTime: integrations.reduce((sum, i) => sum + i.config.estimatedSetupTime, 0),
  };

  return {
    integrations,
    summary,
  };
}

/**
 * Generate integration imports and initialization code
 */
export function generateIntegrationCode(integrationIds: string[]): {
  imports: string[];
  initialization: string[];
  envVars: string[];
} {
  const imports: string[] = [];
  const initialization: string[] = [];
  const envVars: string[] = [];

  integrationIds.forEach((id) => {
    const config = getIntegration(id);
    if (!config) return;

    // Add imports
    imports.push(`import { ${id}Client } from '@/lib/integrations/${id}/client';`);

    // Add initialization
    if (config.type === 'oauth') {
      initialization.push(`// ${config.name} (OAuth) - Auto-configured`);
      initialization.push(`const ${id} = new ${id}Client();`);
    } else {
      // API key
      const envVar = config.apiKeyConfig?.exampleKey.split('_')[0] + '_API_KEY';
      envVars.push(`${envVar}=your-api-key-here`);
      initialization.push(`// ${config.name} (API Key)`);
      initialization.push(`const ${id} = new ${id}Client(process.env.${envVar});`);
    }
  });

  return {
    imports,
    initialization,
    envVars,
  };
}
