/**
 * Stripe Integration Client
 *
 * API key-based integration for Stripe payments
 */

import { APIKeyClient } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';
import Stripe from 'stripe';

export class StripeClient extends APIKeyClient {
  private client?: Stripe;

  constructor(options: { userId?: string }) {
    super('stripe', options);
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
    if (this.apiKey && !this.isDemoMode) {
      this.client = new Stripe(this.apiKey, { apiVersion: '2024-12-18.acacia' });
    }
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(amount: number, currency: string = 'usd', metadata?: any): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const paymentIntent = await this.client!.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          metadata,
          automatic_payment_methods: { enabled: true },
        });

        return {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
        };
      },
      async () => IntegrationsDemoMode.stripe_createPaymentIntent(amount, currency),
      'create_payment_intent'
    );
  }

  /**
   * Create a customer
   */
  async createCustomer(email: string, name?: string, metadata?: any): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const customer = await this.client!.customers.create({
          email,
          name,
          metadata,
        });

        return {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          created: customer.created,
        };
      },
      async () => IntegrationsDemoMode.stripe_createCustomer(email, name),
      'create_customer'
    );
  }

  /**
   * Create a subscription
   */
  async createSubscription(customerId: string, priceId: string, trialDays?: number): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const subscription = await this.client!.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          trial_period_days: trialDays,
        });

        return {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        };
      },
      async () => IntegrationsDemoMode.stripe_createSubscription(customerId, priceId),
      'create_subscription'
    );
  }

  /**
   * Get payment history
   */
  async getPayments(limit: number = 10): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const charges = await this.client!.charges.list({ limit });

        return {
          payments: charges.data.map((charge) => ({
            id: charge.id,
            amount: charge.amount / 100,
            currency: charge.currency,
            status: charge.status,
            created: charge.created,
            description: charge.description,
          })),
          hasMore: charges.has_more,
        };
      },
      async () => IntegrationsDemoMode.stripe_getPayments(),
      'get_payments'
    );
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentIntentId: string, amount?: number): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const refund = await this.client!.refunds.create({
          payment_intent: paymentIntentId,
          amount: amount ? Math.round(amount * 100) : undefined,
        });

        return {
          id: refund.id,
          amount: refund.amount / 100,
          currency: refund.currency,
          status: refund.status,
          reason: refund.reason,
        };
      },
      async () => IntegrationsDemoMode.stripe_refundPayment(paymentIntentId, amount),
      'refund_payment'
    );
  }

  /**
   * Create a product
   */
  async createProduct(name: string, description?: string, price?: number): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const product = await this.client!.products.create({
          name,
          description,
        });

        let priceObj = null;
        if (price) {
          priceObj = await this.client!.prices.create({
            product: product.id,
            unit_amount: Math.round(price * 100),
            currency: 'usd',
          });
        }

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          price: priceObj ? { id: priceObj.id, amount: price } : null,
        };
      },
      async () => IntegrationsDemoMode.stripe_createProduct(name, description, price),
      'create_product'
    );
  }

  /**
   * Get balance
   */
  async getBalance(): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const balance = await this.client!.balance.retrieve();

        return {
          available: balance.available.map((b) => ({
            amount: b.amount / 100,
            currency: b.currency,
          })),
          pending: balance.pending.map((b) => ({
            amount: b.amount / 100,
            currency: b.currency,
          })),
        };
      },
      async () => IntegrationsDemoMode.stripe_getBalance(),
      'get_balance'
    );
  }
}
