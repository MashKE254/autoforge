/**
 * Integration Auto-Detection and File Injection
 *
 * Automatically detects required integrations from prompts and injects
 * integration client code into generated applications
 */

import { analyzePromptForIntegrations, getIntegration } from '../integrations/detection';
import { GeneratedFile } from './bolt-generator';

export interface IntegrationInjectionResult {
  files: GeneratedFile[];
  detectedIntegrations: string[];
  envVars: Record<string, string>;
}

/**
 * Detect integrations and inject necessary files
 */
export function injectIntegrations(
  existingFiles: GeneratedFile[],
  prompt: string
): IntegrationInjectionResult {
  // Analyze prompt for required integrations
  const analysis = analyzePromptForIntegrations(prompt);
  const detectedIds = analysis.integrations.map((i) => i.config.id);

  if (detectedIds.length === 0) {
    return {
      files: existingFiles,
      detectedIntegrations: [],
      envVars: {},
    };
  }

  console.log(`🔌 Detected ${detectedIds.length} integrations:`, detectedIds.join(', '));

  const newFiles: GeneratedFile[] = [...existingFiles];
  const envVars: Record<string, string> = {};

  // Add integration client library files
  for (const integration of analysis.integrations) {
    const config = integration.config;

    // Add environment variable placeholders
    if (config.type === 'oauth') {
      const envPrefix = config.id.toUpperCase().replace(/-/g, '_');
      envVars[`${envPrefix}_CLIENT_ID`] = 'your_client_id_here';
      envVars[`${envPrefix}_CLIENT_SECRET`] = 'your_client_secret_here';
    } else if (config.type === 'api-key') {
      const envPrefix = config.id.toUpperCase().replace(/-/g, '_');
      envVars[`${envPrefix}_API_KEY`] = 'your_api_key_here';
      if (config.id === 'twilio' || config.id === 'aws-s3') {
        envVars[`${envPrefix}_API_SECRET`] = 'your_api_secret_here';
      }
    }
  }

  // Add integration helper hook for React components
  newFiles.push({
    path: 'lib/integrations/use-integration.ts',
    content: `/**
 * Integration Hook
 *
 * React hook for using integrations with automatic demo mode fallback
 */

'use client';

import { useState, useEffect } from 'react';

export function useIntegration<T>(
  integrationId: string,
  clientFactory: (userId?: string) => T
) {
  const [client, setClient] = useState<T | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);

  useEffect(() => {
    async function initialize() {
      try {
        // Check if integration is connected
        const response = await fetch(\`/api/integrations/\${integrationId}/status\`);
        const data = await response.json();

        // Create client instance
        const instance = clientFactory(data.connected ? undefined : undefined);
        await (instance as any).initialize?.();

        setClient(instance);
        setIsDemoMode(!data.connected);
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize integration:', error);
        // Still provide client in demo mode on error
        const instance = clientFactory();
        setClient(instance);
        setIsDemoMode(true);
        setIsReady(true);
      }
    }

    initialize();
  }, [integrationId]);

  return { client, isReady, isDemoMode };
}
`,
    language: 'typescript',
  });

  // Add integration setup instructions
  newFiles.push({
    path: 'INTEGRATIONS.md',
    content: generateIntegrationReadme(analysis.integrations.map((i) => i.config), envVars),
    language: 'markdown',
  });

  // Add .env.example with all required variables
  newFiles.push({
    path: '.env.example',
    content: generateEnvExample(envVars),
    language: 'text',
  });

  // Update package.json to include integration dependencies
  const packageJsonFile = newFiles.find((f) => f.path === 'package.json');
  if (packageJsonFile) {
    try {
      const pkg = JSON.parse(packageJsonFile.content);
      const integrationDeps = getIntegrationDependencies(detectedIds);

      pkg.dependencies = {
        ...pkg.dependencies,
        ...integrationDeps,
      };

      packageJsonFile.content = JSON.stringify(pkg, null, 2);
    } catch (error) {
      console.error('Failed to update package.json:', error);
    }
  }

  return {
    files: newFiles,
    detectedIntegrations: detectedIds,
    envVars,
  };
}

function generateIntegrationReadme(
  configs: Array<{ id: string; name: string; type: string; setupVideoUrl?: string; apiKeyConfig?: any }>,
  envVars: Record<string, string>
): string {
  const oauth = configs.filter((c) => c.type === 'oauth');
  const apiKey = configs.filter((c) => c.type === 'api-key');

  return `# 🔌 Integration Setup

This application uses ${configs.length} integration${configs.length > 1 ? 's' : ''}.

## Demo Mode (Available Immediately)

Your app works RIGHT NOW with simulated data. All features are functional:
- Try all integration features
- See realistic data and responses
- Perfect for testing and demonstration

**No setup required for demo mode!**

## Going Live with Real Data

When you're ready to connect real services:

${oauth.length > 0 ? `### OAuth Integrations (30 seconds each)

${oauth.map((c) => `
#### ${c.name}
1. Click "Connect ${c.name}" in your app
2. Authorize AutoForge
3. Done! ✅

`).join('')}
` : ''}

${apiKey.length > 0 ? `### API Key Integrations (5 minutes each)

${apiKey.map((c) => `
#### ${c.name}
1. Go to ${c.apiKeyConfig?.signupUrl || 'provider website'}
2. Sign up (free tier available)
3. Create an API key
4. Add to environment variables:
   \`\`\`
   ${Object.keys(envVars)
     .filter((k) => k.includes(c.id.toUpperCase().replace(/-/g, '_')))
     .map((k) => `${k}=${envVars[k]}`)
     .join('\n   ')}
   \`\`\`
${c.setupVideoUrl ? `5. Watch setup tutorial: ${c.setupVideoUrl}` : ''}

`).join('')}
` : ''}

## Environment Variables

Copy \`.env.example\` to \`.env.local\` and fill in your credentials:

\`\`\`bash
cp .env.example .env.local
\`\`\`

## Need Help?

- Each integration has a setup wizard in the app
- Video tutorials available for API key integrations
- All integrations work in demo mode without setup
`;
}

function generateEnvExample(envVars: Record<string, string>): string {
  return `# Integration Environment Variables
# Copy this file to .env.local and fill in your credentials

${Object.entries(envVars)
    .map(([key, value]) => `${key}="${value}"`)
    .join('\n')}
`;
}

function getIntegrationDependencies(integrationIds: string[]): Record<string, string> {
  const deps: Record<string, string> = {};

  // Common dependencies for all integrations
  deps['@prisma/client'] = '^5.0.0';

  for (const id of integrationIds) {
    switch (id) {
      case 'openai':
        deps['openai'] = '^4.0.0';
        break;
      case 'anthropic':
        deps['@anthropic-ai/sdk'] = '^0.20.0';
        break;
      case 'stripe':
      case 'stripe-connect':
        deps['stripe'] = '^14.0.0';
        break;
      case 'twilio':
        deps['twilio'] = '^5.0.0';
        break;
      case 'sendgrid':
        deps['@sendgrid/mail'] = '^8.0.0';
        break;
      case 'aws-s3':
        deps['@aws-sdk/client-s3'] = '^3.0.0';
        deps['@aws-sdk/s3-request-presigner'] = '^3.0.0';
        break;
      case 'replicate':
        deps['replicate'] = '^0.30.0';
        break;
    }
  }

  return deps;
}
