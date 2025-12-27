/**
 * Notion Integration Client
 *
 * OAuth-based integration for Notion API
 */

import { OAuthClient } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';

export class NotionClient extends OAuthClient {
  private baseUrl = 'https://api.notion.com/v1';

  constructor(options: { userId?: string }) {
    super('notion', options);
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
  }

  /**
   * Search for pages and databases
   */
  async search(query: string, filter?: { property: string; value: string }): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/search`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              filter,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Notion API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.notion_search(query),
      'search'
    );
  }

  /**
   * Get a page
   */
  async getPage(pageId: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/pages/${pageId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Notion-Version': '2022-06-28',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Notion API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.notion_getPage(pageId),
      'get_page'
    );
  }

  /**
   * Create a page
   */
  async createPage(parentId: string, title: string, properties?: any, children?: any[]): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/pages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              parent: { page_id: parentId },
              properties: {
                title: {
                  title: [{ text: { content: title } }],
                },
                ...properties,
              },
              children,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Notion API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.notion_createPage(parentId, title),
      'create_page'
    );
  }

  /**
   * Query a database
   */
  async queryDatabase(databaseId: string, filter?: any, sorts?: any[]): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/databases/${databaseId}/query`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filter,
              sorts,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Notion API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.notion_queryDatabase(databaseId),
      'query_database'
    );
  }

  /**
   * Create a database
   */
  async createDatabase(parentPageId: string, title: string, properties: any): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/databases`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              parent: { page_id: parentPageId },
              title: [{ text: { content: title } }],
              properties,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Notion API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.notion_createDatabase(parentPageId, title),
      'create_database'
    );
  }

  /**
   * Update page properties
   */
  async updatePage(pageId: string, properties: any): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/pages/${pageId}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ properties }),
          }
        );

        if (!response.ok) {
          throw new Error(`Notion API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.notion_updatePage(pageId, properties),
      'update_page'
    );
  }

  /**
   * Append blocks to a page
   */
  async appendBlocks(pageId: string, blocks: any[]): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/blocks/${pageId}/children`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ children: blocks }),
          }
        );

        if (!response.ok) {
          throw new Error(`Notion API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.notion_appendBlocks(pageId, blocks),
      'append_blocks'
    );
  }

  protected async refreshAccessToken(): Promise<void> {
    // Notion OAuth tokens don't expire by default
    // They remain valid until explicitly revoked
    return;
  }
}
