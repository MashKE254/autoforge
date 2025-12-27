/**
 * Base Integration Client
 *
 * Foundation class for all integration clients with demo mode support
 */

import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';
import { prisma } from '@/lib/prisma';

export interface ClientOptions {
  userId?: string;
  integrationId: string;
  isDemoMode?: boolean;
}

export abstract class BaseIntegrationClient {
  protected userId?: string;
  protected integrationId: string;
  protected isDemoMode: boolean;
  protected credentials: any = null;

  constructor(options: ClientOptions) {
    this.userId = options.userId;
    this.integrationId = options.integrationId;
    this.isDemoMode = options.isDemoMode ?? false;
  }

  /**
   * Load credentials from database
   */
  protected async loadCredentials(): Promise<boolean> {
    if (!this.userId) {
      this.isDemoMode = true;
      return false;
    }

    try {
      const credential = await prisma.integrationCredential.findUnique({
        where: {
          userId_integrationId: {
            userId: this.userId,
            integrationId: this.integrationId,
          },
        },
      });

      if (credential && credential.isActive) {
        this.credentials = credential;
        this.isDemoMode = false;
        return true;
      }

      this.isDemoMode = true;
      return false;
    } catch (error) {
      console.error(`Failed to load credentials for ${this.integrationId}:`, error);
      this.isDemoMode = true;
      return false;
    }
  }

  /**
   * Log integration usage for analytics
   */
  protected async logUsage(action: string, success: boolean, metadata?: any): Promise<void> {
    if (!this.userId) return;

    try {
      await prisma.integrationUsage.create({
        data: {
          userId: this.userId,
          integrationId: this.integrationId,
          action,
          success,
          isDemoMode: this.isDemoMode,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        },
      });
    } catch (error) {
      // Silent fail - don't break the app if logging fails
      console.error('Failed to log integration usage:', error);
    }
  }

  /**
   * Execute with automatic demo mode fallback
   */
  protected async executeWithFallback<T>(
    realFn: () => Promise<T>,
    demoFn: () => Promise<T>,
    action: string
  ): Promise<T> {
    try {
      if (this.isDemoMode) {
        const result = await demoFn();
        await this.logUsage(action, true, { demo: true });
        return result;
      }

      const result = await realFn();
      await this.logUsage(action, true);
      return result;
    } catch (error) {
      await this.logUsage(action, false, { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Check if integration is configured (has credentials)
   */
  async isConfigured(): Promise<boolean> {
    if (this.isDemoMode) return false;
    if (this.credentials) return true;
    return await this.loadCredentials();
  }

  /**
   * Get demo mode status
   */
  getDemoMode(): boolean {
    return this.isDemoMode;
  }
}

/**
 * OAuth Client Base
 */
export abstract class OAuthClient extends BaseIntegrationClient {
  protected accessToken?: string;
  protected refreshToken?: string;
  protected expiresAt?: Date;

  constructor(options: ClientOptions) {
    super(options);
  }

  protected override async loadCredentials(): Promise<boolean> {
    const loaded = await super.loadCredentials();

    if (loaded && this.credentials) {
      this.accessToken = this.credentials.accessToken;
      this.refreshToken = this.credentials.refreshToken;
      this.expiresAt = this.credentials.expiresAt;
    }

    return loaded;
  }

  /**
   * Check if access token is expired
   */
  protected isTokenExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() >= this.expiresAt;
  }

  /**
   * Refresh access token if expired
   */
  protected abstract refreshAccessToken(): Promise<void>;
}

/**
 * API Key Client Base
 */
export abstract class APIKeyClient extends BaseIntegrationClient {
  protected apiKey?: string;
  protected apiSecret?: string;

  constructor(options: ClientOptions & { apiKey?: string; apiSecret?: string }) {
    super(options);
    this.apiKey = options.apiKey;
    this.apiSecret = options.apiSecret;
  }

  protected override async loadCredentials(): Promise<boolean> {
    const loaded = await super.loadCredentials();

    if (loaded && this.credentials) {
      this.apiKey = this.credentials.apiKey;
      this.apiSecret = this.credentials.apiSecret;
    }

    return loaded;
  }
}
