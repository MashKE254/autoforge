/**
 * Instagram Integration Client
 *
 * OAuth-based integration for Instagram Business API
 */

import { OAuthClient } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';

export class InstagramClient extends OAuthClient {
  private baseUrl = 'https://graph.instagram.com';

  constructor(options: { userId?: string }) {
    super('instagram', options);
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
  }

  /**
   * Create an Instagram post (image)
   */
  async createPost(imageUrl: string, caption: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const igUserId = this.credentials?.accountInfo?.instagram_business_account || '';

        // Step 1: Create media container
        const containerResponse = await fetch(
          `${this.baseUrl}/${igUserId}/media`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image_url: imageUrl,
              caption,
              access_token: this.accessToken,
            }),
          }
        );

        if (!containerResponse.ok) {
          throw new Error(`Instagram API error: ${containerResponse.statusText}`);
        }

        const { id: containerId } = await containerResponse.json();

        // Step 2: Publish media
        const publishResponse = await fetch(
          `${this.baseUrl}/${igUserId}/media_publish`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              creation_id: containerId,
              access_token: this.accessToken,
            }),
          }
        );

        if (!publishResponse.ok) {
          throw new Error(`Instagram publish error: ${publishResponse.statusText}`);
        }

        return await publishResponse.json();
      },
      async () => IntegrationsDemoMode.instagram_createPost(imageUrl, caption),
      'create_post'
    );
  }

  /**
   * Get Instagram insights
   */
  async getInsights(metric: string[] = ['impressions', 'reach', 'engagement']): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const igUserId = this.credentials?.accountInfo?.instagram_business_account || '';

        const response = await fetch(
          `${this.baseUrl}/${igUserId}/insights?metric=${metric.join(',')}&period=day&access_token=${this.accessToken}`
        );

        if (!response.ok) {
          throw new Error(`Instagram API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.instagram_getInsights(),
      'get_insights'
    );
  }

  /**
   * Get user's media posts
   */
  async getMedia(limit: number = 25): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const igUserId = this.credentials?.accountInfo?.instagram_business_account || '';

        const response = await fetch(
          `${this.baseUrl}/${igUserId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${limit}&access_token=${this.accessToken}`
        );

        if (!response.ok) {
          throw new Error(`Instagram API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.instagram_getMedia(),
      'get_media'
    );
  }

  /**
   * Get comments on a post
   */
  async getComments(mediaId: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/${mediaId}/comments?fields=id,text,username,timestamp&access_token=${this.accessToken}`
        );

        if (!response.ok) {
          throw new Error(`Instagram API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.instagram_getComments(mediaId),
      'get_comments'
    );
  }

  /**
   * Reply to a comment
   */
  async replyToComment(commentId: string, message: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/${commentId}/replies`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message,
              access_token: this.accessToken,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Instagram API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.instagram_replyToComment(commentId, message),
      'reply_to_comment'
    );
  }

  protected async refreshAccessToken(): Promise<void> {
    // Instagram uses long-lived tokens that last 60 days
    // Refresh by exchanging the current long-lived token for a new one
    const response = await fetch(
      `${this.baseUrl}/refresh_access_token?grant_type=ig_refresh_token&access_token=${this.accessToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to refresh Instagram access token');
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
