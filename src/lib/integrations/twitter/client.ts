/**
 * Twitter Integration Client
 *
 * Official Twitter API v2 client with demo mode support
 */

import { OAuthClient, ClientOptions } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';

export class TwitterClient extends OAuthClient {
  private baseUrl = 'https://api.twitter.com/2';

  constructor(options: ClientOptions) {
    super({ ...options, integrationId: 'twitter' });
  }

  /**
   * Initialize client (loads credentials)
   */
  async initialize(): Promise<void> {
    await this.loadCredentials();
  }

  /**
   * Post a tweet
   */
  async postTweet(text: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) {
          await this.refreshAccessToken();
        }

        const response = await fetch(`${this.baseUrl}/tweets`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          throw new Error(`Twitter API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.twitter_postTweet(text),
      'post_tweet'
    );
  }

  /**
   * Get user timeline
   */
  async getTimeline(maxResults: number = 10): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) {
          await this.refreshAccessToken();
        }

        const response = await fetch(
          `${this.baseUrl}/tweets/home_timeline?max_results=${maxResults}`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Twitter API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.twitter_getTimeline(),
      'get_timeline'
    );
  }

  /**
   * Get user info
   */
  async getUserInfo(): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) {
          await this.refreshAccessToken();
        }

        const response = await fetch(`${this.baseUrl}/users/me`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Twitter API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => ({
        data: {
          id: 'demo_123',
          username: 'demo_user',
          name: 'Demo User',
        },
      }),
      'get_user_info'
    );
  }

  /**
   * Refresh OAuth token
   */
  protected async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Twitter token');
    }

    const data = await response.json();

    // Update credentials in database
    if (this.userId && this.credentials) {
      const { prisma } = await import('@/lib/prisma');
      await prisma.integrationCredential.update({
        where: { id: this.credentials.id },
        data: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: new Date(Date.now() + data.expires_in * 1000),
        },
      });

      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.expiresAt = new Date(Date.now() + data.expires_in * 1000);
    }
  }
}
