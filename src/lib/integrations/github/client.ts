/**
 * GitHub Integration Client
 *
 * OAuth-based integration for GitHub API
 */

import { OAuthClient } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';

export class GitHubClient extends OAuthClient {
  private baseUrl = 'https://api.github.com';

  constructor(options: { userId?: string }) {
    super('github', options);
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
  }

  /**
   * Get user's repositories
   */
  async getRepositories(type: 'all' | 'owner' | 'member' = 'owner'): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/user/repos?type=${type}&sort=updated&per_page=100`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Accept': 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.github_getRepositories(),
      'get_repositories'
    );
  }

  /**
   * Create a repository
   */
  async createRepository(name: string, description?: string, isPrivate: boolean = false): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/user/repos`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Accept': 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name,
              description,
              private: isPrivate,
              auto_init: true,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.github_createRepository(name, description),
      'create_repository'
    );
  }

  /**
   * Get repository issues
   */
  async getIssues(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/repos/${owner}/${repo}/issues?state=${state}&per_page=100`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Accept': 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.github_getIssues(owner, repo),
      'get_issues'
    );
  }

  /**
   * Create an issue
   */
  async createIssue(owner: string, repo: string, title: string, body?: string, labels?: string[]): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/repos/${owner}/${repo}/issues`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Accept': 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title,
              body,
              labels,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.github_createIssue(owner, repo, title),
      'create_issue'
    );
  }

  /**
   * Get pull requests
   */
  async getPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/repos/${owner}/${repo}/pulls?state=${state}&per_page=100`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Accept': 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.github_getPullRequests(owner, repo),
      'get_pull_requests'
    );
  }

  /**
   * Get commits for a repository
   */
  async getCommits(owner: string, repo: string, branch?: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        let url = `${this.baseUrl}/repos/${owner}/${repo}/commits?per_page=100`;
        if (branch) url += `&sha=${branch}`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.github_getCommits(owner, repo),
      'get_commits'
    );
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/user`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Accept': 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.github_getCurrentUser(),
      'get_current_user'
    );
  }

  protected async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: process.env.GITHUB_CLIENT_ID!,
        client_secret: process.env.GITHUB_CLIENT_SECRET!,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh GitHub access token');
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
