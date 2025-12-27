/**
 * Gmail Integration Client
 *
 * OAuth-based integration for Gmail API
 */

import { OAuthClient } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';

export class GmailClient extends OAuthClient {
  private baseUrl = 'https://gmail.googleapis.com/gmail/v1';

  constructor(options: { userId?: string }) {
    super('gmail', options);
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
  }

  /**
   * Send an email
   */
  async sendEmail(to: string | string[], subject: string, body: string, html?: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const toAddresses = Array.isArray(to) ? to.join(', ') : to;
        const message = [
          `To: ${toAddresses}`,
          `Subject: ${subject}`,
          'Content-Type: text/html; charset=utf-8',
          '',
          html || body,
        ].join('\n');

        const encodedMessage = Buffer.from(message)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const response = await fetch(
          `${this.baseUrl}/users/me/messages/send`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              raw: encodedMessage,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Gmail API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.gmail_sendEmail(to, subject, body),
      'send_email'
    );
  }

  /**
   * Get inbox messages
   */
  async getMessages(maxResults: number = 10, query?: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        let url = `${this.baseUrl}/users/me/messages?maxResults=${maxResults}`;
        if (query) {
          url += `&q=${encodeURIComponent(query)}`;
        }

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Gmail API error: ${response.statusText}`);
        }

        const data = await response.json();

        // Fetch full message details
        if (data.messages) {
          const messages = await Promise.all(
            data.messages.slice(0, maxResults).map(async (msg: any) => {
              return this.getMessage(msg.id);
            })
          );
          return { messages };
        }

        return data;
      },
      async () => IntegrationsDemoMode.gmail_getMessages(),
      'get_messages'
    );
  }

  /**
   * Get a specific message
   */
  async getMessage(messageId: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/users/me/messages/${messageId}?format=full`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Gmail API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.gmail_getMessage(messageId),
      'get_message'
    );
  }

  /**
   * Search emails
   */
  async searchEmails(query: string, maxResults: number = 10): Promise<any> {
    return this.getMessages(maxResults, query);
  }

  /**
   * Create a draft email
   */
  async createDraft(to: string | string[], subject: string, body: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const toAddresses = Array.isArray(to) ? to.join(', ') : to;
        const message = [
          `To: ${toAddresses}`,
          `Subject: ${subject}`,
          'Content-Type: text/plain; charset=utf-8',
          '',
          body,
        ].join('\n');

        const encodedMessage = Buffer.from(message)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const response = await fetch(
          `${this.baseUrl}/users/me/drafts`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                raw: encodedMessage,
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Gmail API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.gmail_createDraft(to, subject, body),
      'create_draft'
    );
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/users/me/messages/${messageId}/modify`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              removeLabelIds: ['UNREAD'],
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Gmail API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.gmail_markAsRead(messageId),
      'mark_as_read'
    );
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/users/me/messages/${messageId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Gmail API error: ${response.statusText}`);
        }

        return { success: true, deletedId: messageId };
      },
      async () => IntegrationsDemoMode.gmail_deleteMessage(messageId),
      'delete_message'
    );
  }

  protected async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Google access token');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await this.updateStoredTokens({
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresAt: this.expiresAt,
    });
  }
}
