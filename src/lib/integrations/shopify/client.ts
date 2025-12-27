/**
 * Shopify Integration Client
 *
 * OAuth-based integration for Shopify API
 */

import { OAuthClient } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';

export class ShopifyClient extends OAuthClient {
  private shopDomain: string = '';

  constructor(options: { userId?: string; shopDomain?: string }) {
    super('shopify', options);
    this.shopDomain = options.shopDomain || '';
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
    this.shopDomain = this.credentials?.accountInfo?.shop || this.shopDomain;
  }

  private get baseUrl() {
    return `https://${this.shopDomain}/admin/api/2024-01`;
  }

  /**
   * Get products
   */
  async getProducts(limit: number = 50): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/products.json?limit=${limit}`,
          {
            headers: {
              'X-Shopify-Access-Token': this.accessToken!,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Shopify API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.shopify_getProducts(),
      'get_products'
    );
  }

  /**
   * Create a product
   */
  async createProduct(product: {
    title: string;
    description?: string;
    price: number;
    compareAtPrice?: number;
    images?: string[];
    inventory?: number;
  }): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/products.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': this.accessToken!,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              product: {
                title: product.title,
                body_html: product.description,
                variants: [
                  {
                    price: product.price,
                    compare_at_price: product.compareAtPrice,
                    inventory_quantity: product.inventory || 0,
                  },
                ],
                images: product.images?.map((src) => ({ src })),
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Shopify API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.shopify_createProduct(product),
      'create_product'
    );
  }

  /**
   * Get orders
   */
  async getOrders(status: string = 'any', limit: number = 50): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/orders.json?status=${status}&limit=${limit}`,
          {
            headers: {
              'X-Shopify-Access-Token': this.accessToken!,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Shopify API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.shopify_getOrders(),
      'get_orders'
    );
  }

  /**
   * Update order fulfillment
   */
  async fulfillOrder(orderId: string, trackingNumber?: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/orders/${orderId}/fulfillments.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': this.accessToken!,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fulfillment: {
                tracking_number: trackingNumber,
                notify_customer: true,
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Shopify API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.shopify_fulfillOrder(orderId),
      'fulfill_order'
    );
  }

  /**
   * Get customers
   */
  async getCustomers(limit: number = 50): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/customers.json?limit=${limit}`,
          {
            headers: {
              'X-Shopify-Access-Token': this.accessToken!,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Shopify API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.shopify_getCustomers(),
      'get_customers'
    );
  }

  /**
   * Get shop analytics
   */
  async getAnalytics(): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/reports.json`,
          {
            headers: {
              'X-Shopify-Access-Token': this.accessToken!,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Shopify API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.shopify_getAnalytics(),
      'get_analytics'
    );
  }

  /**
   * Update inventory
   */
  async updateInventory(variantId: string, quantity: number): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/variants/${variantId}.json`,
          {
            method: 'PUT',
            headers: {
              'X-Shopify-Access-Token': this.accessToken!,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              variant: {
                inventory_quantity: quantity,
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Shopify API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.shopify_updateInventory(variantId, quantity),
      'update_inventory'
    );
  }

  protected async refreshAccessToken(): Promise<void> {
    // Shopify uses permanent access tokens
    // No refresh needed unless token is manually revoked
    // Token validation happens on each request
    return;
  }
}
