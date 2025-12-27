/**
 * Integration System Types
 *
 * Defines all types for the AutoForge integration system
 */

export type IntegrationType = 'oauth' | 'api-key' | 'webhook';

export type IntegrationCategory =
  | 'social-media'
  | 'ai'
  | 'payments'
  | 'communication'
  | 'productivity'
  | 'storage'
  | 'analytics';

export interface IntegrationConfig {
  id: string;
  name: string;
  category: IntegrationCategory;
  type: IntegrationType;
  description: string;
  icon: string; // emoji or icon name
  requiredScopes?: string[]; // For OAuth
  setupVideoUrl?: string;
  docsUrl?: string;
  estimatedSetupTime: number; // in minutes

  // OAuth specific
  oauthConfig?: {
    authUrl: string;
    tokenUrl: string;
    clientIdEnvVar: string;
    clientSecretEnvVar: string;
    redirectUri: string;
  };

  // API Key specific
  apiKeyConfig?: {
    provider: string;
    signupUrl: string;
    docsUrl: string;
    exampleKey: string; // For validation
  };

  // Features this integration provides
  features: string[];

  // Triggers that indicate this integration is needed
  triggers: string[];
}

export interface IntegrationCredentials {
  integrationId: string;
  userId: string;
  type: 'oauth' | 'api-key';

  // OAuth tokens
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;

  // API keys
  apiKey?: string;
  apiSecret?: string;

  // Metadata
  accountInfo?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DemoModeConfig {
  enabled: boolean;
  integrationId: string;
  mockDataGenerator: () => any;
  simulateDelay?: number; // ms to simulate API call
}

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'action' | 'input' | 'oauth';
  component?: string; // Component name to render
  data?: any;
}

export interface IntegrationModule {
  config: IntegrationConfig;
  demoMode: DemoModeConfig;
  setup: SetupStep[];
  client?: any; // The actual API client

  // Methods
  isConfigured: (userId: string) => Promise<boolean>;
  getCredentials: (userId: string) => Promise<IntegrationCredentials | null>;
  testConnection: (credentials: IntegrationCredentials) => Promise<boolean>;
}
