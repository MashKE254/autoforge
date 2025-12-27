/**
 * Facebook Integration Client
 *
 * OAuth-based integration for Facebook Graph API
 */

import { OAuthClient } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';

export class FacebookClient extends OAuthClient {
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(options: { userId?: string }) {
    super('facebook', options);
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
  }

  /**
   * Create a Facebook post
   */
  async createPost(message: string, pageId?: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const targetId = pageId || this.credentials?.accountInfo?.id || 'me';

        const response = await fetch(
          `${this.baseUrl}/${targetId}/feed`,
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
          throw new Error(`Facebook API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.facebook_createPost(message),
      'create_post'
    );
  }

  /**
   * Get user's Facebook pages
   */
  async getPages(): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/me/accounts?access_token=${this.accessToken}`
        );

        if (!response.ok) {
          throw new Error(`Facebook API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.facebook_getPages(),
      'get_pages'
    );
  }

  /**
   * Get page insights
   */
  async getPageInsights(
    pageId: string,
    metrics: string[] = ['page_views', 'page_fans', 'page_engagement']
  ): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/${pageId}/insights?metric=${metrics.join(',')}&access_token=${this.accessToken}`
        );

        if (!response.ok) {
          throw new Error(`Facebook API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.facebook_getPageInsights(pageId),
      'get_page_insights'
    );
  }

  /**
   * Get posts from a page
   */
  async getPagePosts(pageId: string, limit: number = 25): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/${pageId}/posts?fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&limit=${limit}&access_token=${this.accessToken}`
        );

        if (!response.ok) {
          throw new Error(`Facebook API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.facebook_getPagePosts(pageId),
      'get_page_posts'
    );
  }

  /**
   * Post a photo
   */
  async postPhoto(imageUrl: string, caption: string, pageId?: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const targetId = pageId || this.credentials?.accountInfo?.id || 'me';

        const response = await fetch(
          `${this.baseUrl}/${targetId}/photos`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: imageUrl,
              caption,
              access_token: this.accessToken,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Facebook API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.facebook_postPhoto(imageUrl, caption),
      'post_photo'
    );
  }

  /**
   * Get comments on a post
   */
  async getComments(postId: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/${postId}/comments?fields=id,message,from,created_time&access_token=${this.accessToken}`
        );

        if (!response.ok) {
          throw new Error(`Facebook API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.facebook_getComments(postId),
      'get_comments'
    );
  }

  protected async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(
      `${this.baseUrl}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${this.accessToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to refresh Facebook access token');
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
