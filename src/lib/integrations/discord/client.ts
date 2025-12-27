/**
 * Discord Integration Client
 *
 * OAuth-based integration for Discord API
 */

import { OAuthClient } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';

export class DiscordClient extends OAuthClient {
  private baseUrl = 'https://discord.com/api/v10';

  constructor(options: { userId?: string }) {
    super('discord', options);
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
  }

  /**
   * Send a message to a Discord channel
   */
  async sendMessage(channelId: string, content: string, embeds?: any[]): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/channels/${channelId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content,
              embeds,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Discord API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.discord_sendMessage(channelId, content),
      'send_message'
    );
  }

  /**
   * Get user's guilds (servers)
   */
  async getGuilds(): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/users/@me/guilds`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Discord API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.discord_getGuilds(),
      'get_guilds'
    );
  }

  /**
   * Get channels in a guild
   */
  async getGuildChannels(guildId: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/guilds/${guildId}/channels`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Discord API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.discord_getGuildChannels(guildId),
      'get_guild_channels'
    );
  }

  /**
   * Get messages from a channel
   */
  async getMessages(channelId: string, limit: number = 50): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/channels/${channelId}/messages?limit=${limit}`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Discord API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.discord_getMessages(channelId),
      'get_messages'
    );
  }

  /**
   * Create a channel webhook
   */
  async createWebhook(channelId: string, name: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/channels/${channelId}/webhooks`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
          }
        );

        if (!response.ok) {
          throw new Error(`Discord API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.discord_createWebhook(channelId, name),
      'create_webhook'
    );
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/users/@me`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Discord API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.discord_getCurrentUser(),
      'get_current_user'
    );
  }

  protected async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Discord access token');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await this.updateStoredTokens({
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresAt: this.expiresAt,
    });
  }
}
