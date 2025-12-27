/**
 * Slack Integration Client
 *
 * OAuth-based integration for Slack API
 */

import { OAuthClient } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';

export class SlackClient extends OAuthClient {
  private baseUrl = 'https://slack.com/api';

  constructor(options: { userId?: string }) {
    super('slack', options);
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
  }

  /**
   * Send a message to a Slack channel
   */
  async sendMessage(channel: string, text: string, blocks?: any[]): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/chat.postMessage`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              channel,
              text,
              blocks,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Slack API error: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.ok) {
          throw new Error(`Slack error: ${data.error}`);
        }

        return data;
      },
      async () => IntegrationsDemoMode.slack_sendMessage(channel, text),
      'send_message'
    );
  }

  /**
   * Get list of channels
   */
  async getChannels(): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/conversations.list`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Slack API error: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.ok) {
          throw new Error(`Slack error: ${data.error}`);
        }

        return data;
      },
      async () => IntegrationsDemoMode.slack_getChannels(),
      'get_channels'
    );
  }

  /**
   * Get channel history
   */
  async getChannelHistory(channel: string, limit: number = 100): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/conversations.history?channel=${channel}&limit=${limit}`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Slack API error: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.ok) {
          throw new Error(`Slack error: ${data.error}`);
        }

        return data;
      },
      async () => IntegrationsDemoMode.slack_getChannelHistory(channel),
      'get_channel_history'
    );
  }

  /**
   * Upload a file
   */
  async uploadFile(channel: string, file: Buffer | string, filename: string, title?: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const formData = new FormData();
        formData.append('channels', channel);
        formData.append('filename', filename);
        if (title) formData.append('title', title);

        if (typeof file === 'string') {
          formData.append('content', file);
        } else {
          formData.append('file', new Blob([file]), filename);
        }

        const response = await fetch(
          `${this.baseUrl}/files.upload`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error(`Slack API error: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.ok) {
          throw new Error(`Slack error: ${data.error}`);
        }

        return data;
      },
      async () => IntegrationsDemoMode.slack_uploadFile(channel, filename),
      'upload_file'
    );
  }

  /**
   * Get user info
   */
  async getUserInfo(userId: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/users.info?user=${userId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Slack API error: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.ok) {
          throw new Error(`Slack error: ${data.error}`);
        }

        return data;
      },
      async () => IntegrationsDemoMode.slack_getUserInfo(userId),
      'get_user_info'
    );
  }

  /**
   * Set channel topic
   */
  async setChannelTopic(channel: string, topic: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/conversations.setTopic`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              channel,
              topic,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Slack API error: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.ok) {
          throw new Error(`Slack error: ${data.error}`);
        }

        return data;
      },
      async () => IntegrationsDemoMode.slack_setChannelTopic(channel, topic),
      'set_channel_topic'
    );
  }

  protected async refreshAccessToken(): Promise<void> {
    // Slack tokens don't expire by default unless explicitly revoked
    // No refresh mechanism needed for most Slack OAuth tokens
    return;
  }
}
