/**
 * Stripe Connect Integration Client
 *
 * OAuth-based integration for Stripe Connect (marketplace payments)
 */

import { OAuthClient } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';

export class StripeConnectClient extends OAuthClient {
  private baseUrl = 'https://api.stripe.com/v1';
  private stripeAccountId?: string;

  constructor(options: { userId?: string }) {
    super('stripe-connect', options);
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
    this.stripeAccountId = this.credentials?.accountInfo?.stripe_user_id;
  }

  /**
   * Create a payment on behalf of connected account
   */
  async createPayment(amount: number, currency: string = 'usd', customerId?: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/payment_intents`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Stripe-Account': this.stripeAccountId!,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              amount: amount.toString(),
              currency,
              ...(customerId && { customer: customerId }),
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Stripe API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.stripeConnect_createPayment(amount, currency),
      'create_payment'
    );
  }

  /**
   * Get connected account details
   */
  async getAccountDetails(): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/accounts/${this.stripeAccountId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Stripe API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.stripeConnect_getAccountDetails(),
      'get_account_details'
    );
  }

  /**
   * Create a transfer to connected account
   */
  async createTransfer(amount: number, currency: string = 'usd'): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/transfers`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              amount: amount.toString(),
              currency,
              destination: this.stripeAccountId!,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Stripe API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.stripeConnect_createTransfer(amount, currency),
      'create_transfer'
    );
  }

  /**
   * Get balance for connected account
   */
  async getBalance(): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/balance`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Stripe-Account': this.stripeAccountId!,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Stripe API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.stripeConnect_getBalance(),
      'get_balance'
    );
  }

  /**
   * List recent transactions
   */
  async getTransactions(limit: number = 10): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/balance_transactions?limit=${limit}`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Stripe-Account': this.stripeAccountId!,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Stripe API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.stripeConnect_getTransactions(),
      'get_transactions'
    );
  }

  /**
   * Create a payout
   */
  async createPayout(amount: number, currency: string = 'usd'): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/payouts`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Stripe-Account': this.stripeAccountId!,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              amount: amount.toString(),
              currency,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Stripe API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.stripeConnect_createPayout(amount, currency),
      'create_payout'
    );
  }

  protected async refreshAccessToken(): Promise<void> {
    // Stripe Connect uses permanent access tokens
    // No refresh mechanism - tokens don't expire
    // If revoked, user must re-authorize
    return;
  }
}
