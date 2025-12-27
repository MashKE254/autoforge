/**
 * LinkedIn Integration Client
 *
 * OAuth-based integration for LinkedIn
 */

import { OAuthClient } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';

export class LinkedInClient extends OAuthClient {
  private baseUrl = 'https://api.linkedin.com/v2';

  constructor(options: { userId?: string }) {
    super('linkedin', options);
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
  }

  /**
   * Create a LinkedIn post
   */
  async createPost(text: string, visibility: 'PUBLIC' | 'CONNECTIONS' = 'PUBLIC'): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(`${this.baseUrl}/ugcPosts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({
            author: `urn:li:person:${await this.getUserId()}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text },
                shareMediaCategory: 'NONE',
              },
            },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': visibility,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`LinkedIn API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.linkedin_createPost(text),
      'create_post'
    );
  }

  /**
   * Get user's LinkedIn profile
   */
  async getProfile(): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(`${this.baseUrl}/me`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`LinkedIn API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.linkedin_getProfile(),
      'get_profile'
    );
  }

  /**
   * Get user's connections
   */
  async getConnections(start: number = 0, count: number = 50): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/connections?start=${start}&count=${count}`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`LinkedIn API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.linkedin_getConnections(),
      'get_connections'
    );
  }

  /**
   * Share an article
   */
  async shareArticle(url: string, title: string, description?: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(`${this.baseUrl}/ugcPosts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({
            author: `urn:li:person:${await this.getUserId()}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                  text: description || title,
                },
                shareMediaCategory: 'ARTICLE',
                media: [
                  {
                    status: 'READY',
                    originalUrl: url,
                    title: { text: title },
                  },
                ],
              },
            },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`LinkedIn API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.linkedin_shareArticle(url, title),
      'share_article'
    );
  }

  /**
   * Get user ID for LinkedIn API calls
   */
  private async getUserId(): Promise<string> {
    // In production, this would be cached from account info
    return this.credentials?.accountInfo?.id || 'demo-user-id';
  }

  protected async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh LinkedIn access token');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token || this.refreshToken;
    this.expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await this.updateStoredTokens({
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresAt: this.expiresAt,
    });
  }
}
