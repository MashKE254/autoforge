/**
 * Stripe Provisioner for Managed Infrastructure
 * 
 * File: src/lib/infrastructure/providers/stripe.ts
 * 
 * Handles Stripe configuration for generated apps:
 * - Creates webhook endpoints for each managed project
 * - Configures test mode for preview environments
 * - Manages transition to live mode for production
 * - Creates products/prices for app monetization
 * 
 * Note: This uses AutoForge's platform Stripe account in test mode
 * for preview environments. When users "Go Live" to production,
 * they connect their own Stripe account via Stripe Connect.
 */

import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '../../encryption';
// If your encryption file is located elsewhere, adjust the path accordingly, e.g.:
// import { encrypt, decrypt } from '../../encryption';
// import { encrypt, decrypt } from '../../../lib/encryption';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateTestWebhookResult {
  webhookId: string;
  webhookSecret: string;
  webhookUrl: string;
}

export interface CreateProductResult {
  productId: string;
  priceId: string;
  priceIdYearly?: string;
}

export interface StripeConfigResult {
  testPublishableKey: string;
  testSecretKey: string; // Encrypted
  webhookId: string;
  webhookSecret: string; // Encrypted
  webhookUrl: string;
}

export interface TransitionToLiveResult {
  success: boolean;
  liveWebhookId?: string;
  liveWebhookSecret?: string;
  error?: string;
}

// ============================================================================
// STRIPE PROVISIONER CLASS
// ============================================================================

export class StripeProvisioner {
  private stripe: Stripe;
  private testStripe: Stripe;
  private platformUrl: string;

  constructor() {
    // Live mode Stripe (for platform operations)
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    });

    // Test mode Stripe (for preview environments)
    this.testStripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY!, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    });

    this.platformUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://autoforge.app';
  }

  // ==========================================================================
  // TEST MODE CONFIGURATION (For Preview Environments)
  // ==========================================================================

  /**
   * Configure Stripe test mode for a managed project
   * This sets up webhooks to handle payments during preview
   */
  async configureTestMode(params: {
    managedProjectId: string;
    projectUrl: string;
  }): Promise<StripeConfigResult> {
    const { managedProjectId, projectUrl } = params;

    console.log(`🔧 Configuring Stripe test mode for project: ${managedProjectId}`);

    // Create a webhook endpoint for this specific project
    // Webhooks go to AutoForge platform, which routes to the correct project
    const webhookResult = await this.createTestWebhook({
      managedProjectId,
      projectUrl,
    });

    return {
      testPublishableKey: process.env.STRIPE_TEST_PUBLISHABLE_KEY!,
      testSecretKey: encrypt(process.env.STRIPE_TEST_SECRET_KEY!),
      webhookId: webhookResult.webhookId,
      webhookSecret: encrypt(webhookResult.webhookSecret),
      webhookUrl: webhookResult.webhookUrl,
    };
  }

  /**
   * Create a webhook endpoint for a managed project
   * All webhooks route through AutoForge platform for security
   */
  async createTestWebhook(params: {
    managedProjectId: string;
    projectUrl?: string;
  }): Promise<CreateTestWebhookResult> {
    const { managedProjectId } = params;

    // Webhook URL points to AutoForge platform
    // We route based on metadata in the webhook payload
    const webhookUrl = `${this.platformUrl}/api/managed/webhook/${managedProjectId}`;

    console.log(`📡 Creating test webhook: ${webhookUrl}`);

    try {
      // Create webhook endpoint in test mode
      const webhook = await this.testStripe.webhookEndpoints.create({
        url: webhookUrl,
        enabled_events: [
          // Checkout events
          'checkout.session.completed',
          'checkout.session.expired',
          
          // Subscription events
          'customer.subscription.created',
          'customer.subscription.updated',
          'customer.subscription.deleted',
          'customer.subscription.trial_will_end',
          
          // Payment events
          'invoice.paid',
          'invoice.payment_failed',
          'invoice.payment_action_required',
          
          // Customer events
          'customer.created',
          'customer.updated',
          'customer.deleted',
          
          // Payment Intent events (for one-time payments)
          'payment_intent.succeeded',
          'payment_intent.payment_failed',
        ],
        metadata: {
          managed_project_id: managedProjectId,
          environment: 'test',
          created_by: 'autoforge',
        },
        description: `AutoForge managed project: ${managedProjectId}`,
      });

      console.log(`✅ Test webhook created: ${webhook.id}`);

      return {
        webhookId: webhook.id,
        webhookSecret: webhook.secret!,
        webhookUrl,
      };
    } catch (error) {
      console.error('Failed to create test webhook:', error);
      throw new Error(`Failed to create Stripe webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a webhook endpoint
   */
  async deleteWebhook(webhookId: string, isTestMode: boolean = true): Promise<void> {
    const client = isTestMode ? this.testStripe : this.stripe;

    try {
      await client.webhookEndpoints.del(webhookId);
      console.log(`🗑️ Deleted webhook: ${webhookId}`);
    } catch (error) {
      // Webhook might already be deleted
      console.warn(`Warning: Could not delete webhook ${webhookId}:`, error);
    }
  }

  // ==========================================================================
  // PRODUCT & PRICE CREATION
  // ==========================================================================

  /**
   * Create a Stripe product and price for a published app
   * Used when a creator monetizes their generated app
   */
  async createProduct(params: {
    name: string;
    description?: string;
    monthlyPrice?: number; // In cents
    yearlyPrice?: number; // In cents
    oneTimePrice?: number; // In cents
    metadata?: Record<string, string>;
    connectedAccountId?: string; // If using Connect
    isTestMode?: boolean;
  }): Promise<CreateProductResult> {
    const {
      name,
      description,
      monthlyPrice,
      yearlyPrice,
      oneTimePrice,
      metadata = {},
      connectedAccountId,
      isTestMode = false,
    } = params;

    const client = isTestMode ? this.testStripe : this.stripe;
    const stripeAccount = connectedAccountId ? { stripeAccount: connectedAccountId } : undefined;

    console.log(`📦 Creating Stripe product: ${name}`);

    // Create the product
    const product = await client.products.create(
      {
        name,
        description: description || `Generated by AutoForge`,
        metadata: {
          ...metadata,
          created_by: 'autoforge',
        },
      },
      stripeAccount
    );

    let priceId: string = '';
    let priceIdYearly: string | undefined;

    // Create monthly subscription price
    if (monthlyPrice && monthlyPrice > 0) {
      const price = await client.prices.create(
        {
          product: product.id,
          unit_amount: monthlyPrice,
          currency: 'usd',
          recurring: {
            interval: 'month',
          },
          metadata: {
            type: 'monthly',
          },
        },
        stripeAccount
      );
      priceId = price.id;
    }

    // Create yearly subscription price
    if (yearlyPrice && yearlyPrice > 0) {
      const price = await client.prices.create(
        {
          product: product.id,
          unit_amount: yearlyPrice,
          currency: 'usd',
          recurring: {
            interval: 'year',
          },
          metadata: {
            type: 'yearly',
          },
        },
        stripeAccount
      );
      priceIdYearly = price.id;
    }

    // Create one-time price
    if (oneTimePrice && oneTimePrice > 0) {
      const price = await client.prices.create(
        {
          product: product.id,
          unit_amount: oneTimePrice,
          currency: 'usd',
          metadata: {
            type: 'one_time',
          },
        },
        stripeAccount
      );
      priceId = price.id;
    }

    console.log(`✅ Product created: ${product.id}, Price: ${priceId}`);

    return {
      productId: product.id,
      priceId,
      priceIdYearly,
    };
  }

  // ==========================================================================
  // CHECKOUT SESSION CREATION
  // ==========================================================================

  /**
   * Create a checkout session for a managed project's customer
   */
  async createCheckoutSession(params: {
    managedProjectId: string;
    priceId: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
    mode?: 'subscription' | 'payment';
    trialDays?: number;
    metadata?: Record<string, string>;
    isTestMode?: boolean;
  }): Promise<{ sessionId: string; url: string }> {
    const {
      managedProjectId,
      priceId,
      customerEmail,
      successUrl,
      cancelUrl,
      mode = 'subscription',
      trialDays,
      metadata = {},
      isTestMode = true,
    } = params;

    const client = isTestMode ? this.testStripe : this.stripe;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        managed_project_id: managedProjectId,
        ...metadata,
      },
    };

    // Add trial period for subscriptions
    if (mode === 'subscription' && trialDays && trialDays > 0) {
      sessionParams.subscription_data = {
        trial_period_days: trialDays,
      };
    }

    const session = await client.checkout.sessions.create(sessionParams);

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  // ==========================================================================
  // CUSTOMER PORTAL
  // ==========================================================================

  /**
   * Create a customer portal session
   */
  async createPortalSession(params: {
    customerId: string;
    returnUrl: string;
    isTestMode?: boolean;
  }): Promise<{ url: string }> {
    const { customerId, returnUrl, isTestMode = true } = params;
    const client = isTestMode ? this.testStripe : this.stripe;

    const session = await client.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  // ==========================================================================
  // LIVE MODE TRANSITION
  // ==========================================================================

  /**
   * Transition a managed project from test to live mode
   * This is called when a user deploys to production with their own Stripe
   */
  async transitionToLive(params: {
    managedProjectId: string;
    connectedAccountId: string;
    projectUrl: string;
  }): Promise<TransitionToLiveResult> {
    const { managedProjectId, connectedAccountId } = params;

    console.log(`🚀 Transitioning project ${managedProjectId} to live mode`);

    try {
      // Verify the connected account is ready
      const account = await this.stripe.accounts.retrieve(connectedAccountId);

      if (!account.charges_enabled || !account.payouts_enabled) {
        return {
          success: false,
          error: 'Stripe account is not fully onboarded',
        };
      }

      // Create a live webhook endpoint
      const webhookUrl = `${this.platformUrl}/api/managed/webhook/${managedProjectId}`;

      const webhook = await this.stripe.webhookEndpoints.create({
        url: webhookUrl,
        enabled_events: [
          'checkout.session.completed',
          'customer.subscription.created',
          'customer.subscription.updated',
          'customer.subscription.deleted',
          'invoice.paid',
          'invoice.payment_failed',
          'payment_intent.succeeded',
          'payment_intent.payment_failed',
        ],
        metadata: {
          managed_project_id: managedProjectId,
          connected_account_id: connectedAccountId,
          environment: 'live',
        },
        connect: true, // This is for Connect webhooks
      });

      // Update the managed project record
      await prisma.managedProject.update({
        where: { id: managedProjectId },
        data: {
          stripeLiveWebhookId: webhook.id,
          stripeLiveWebhookSecret: encrypt(webhook.secret!),
          status: 'DEPLOYED',
        },
      });

      console.log(`✅ Project transitioned to live mode`);

      return {
        success: true,
        liveWebhookId: webhook.id,
        liveWebhookSecret: webhook.secret,
      };
    } catch (error) {
      console.error('Failed to transition to live mode:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==========================================================================
  // WEBHOOK VERIFICATION
  // ==========================================================================

  /**
   * Verify a webhook signature
   */
  verifyWebhookSignature(params: {
    payload: string | Buffer;
    signature: string;
    secret: string;
    isTestMode?: boolean;
  }): Stripe.Event {
    const { payload, signature, secret, isTestMode = true } = params;
    const client = isTestMode ? this.testStripe : this.stripe;

    return client.webhooks.constructEvent(payload, signature, secret);
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clean up Stripe resources for a managed project
   */
  async cleanup(params: {
    testWebhookId?: string;
    liveWebhookId?: string;
    productIds?: string[];
  }): Promise<void> {
    const { testWebhookId, liveWebhookId, productIds = [] } = params;

    console.log(`🧹 Cleaning up Stripe resources`);

    // Delete test webhook
    if (testWebhookId) {
      await this.deleteWebhook(testWebhookId, true);
    }

    // Delete live webhook
    if (liveWebhookId) {
      await this.deleteWebhook(liveWebhookId, false);
    }

    // Archive products (don't delete, just archive)
    for (const productId of productIds) {
      try {
        await this.testStripe.products.update(productId, { active: false });
        console.log(`📦 Archived product: ${productId}`);
      } catch (error) {
        console.warn(`Could not archive product ${productId}:`, error);
      }
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get test mode keys for environment variables
   */
  getTestModeKeys(): { publishableKey: string; secretKey: string } {
    return {
      publishableKey: process.env.STRIPE_TEST_PUBLISHABLE_KEY!,
      secretKey: process.env.STRIPE_TEST_SECRET_KEY!,
    };
  }

  /**
   * Verify test mode is properly configured
   */
  async verifyTestModeConfig(): Promise<boolean> {
    try {
      // Try to list customers (simple API call to verify credentials)
      await this.testStripe.customers.list({ limit: 1 });
      return true;
    } catch (error) {
      console.error('Test mode Stripe not configured:', error);
      return false;
    }
  }

  /**
   * Create a test customer
   */
  async createTestCustomer(params: {
    email: string;
    name?: string;
    metadata?: Record<string, string>;
  }): Promise<string> {
    const { email, name, metadata = {} } = params;

    const customer = await this.testStripe.customers.create({
      email,
      name,
      metadata: {
        ...metadata,
        created_by: 'autoforge',
      },
    });

    return customer.id;
  }

  /**
   * Retrieve a customer
   */
  async getCustomer(customerId: string, isTestMode: boolean = true): Promise<Stripe.Customer | null> {
    const client = isTestMode ? this.testStripe : this.stripe;

    try {
      const customer = await client.customers.retrieve(customerId);
      if (customer.deleted) {
        return null;
      }
      return customer as Stripe.Customer;
    } catch {
      return null;
    }
  }

  /**
   * List subscriptions for a customer
   */
  async listSubscriptions(customerId: string, isTestMode: boolean = true): Promise<Stripe.Subscription[]> {
    const client = isTestMode ? this.testStripe : this.stripe;

    const subscriptions = await client.subscriptions.list({
      customer: customerId,
      status: 'all',
    });

    return subscriptions.data;
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false,
    isTestMode: boolean = true
  ): Promise<Stripe.Subscription> {
    const client = isTestMode ? this.testStripe : this.stripe;

    if (immediately) {
      return await client.subscriptions.cancel(subscriptionId);
    } else {
      return await client.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const stripeProvisioner = new StripeProvisioner();

// ============================================================================
// WEBHOOK HANDLER FOR MANAGED PROJECTS
// ============================================================================

/**
 * Process a webhook event for a managed project
 * This is called from the platform webhook handler
 */
export async function handleManagedProjectWebhook(params: {
  managedProjectId: string;
  event: Stripe.Event;
}): Promise<void> {
  const { managedProjectId, event } = params;

  console.log(`📨 Processing webhook for managed project ${managedProjectId}: ${event.type}`);

  // Get the managed project
  const project = await prisma.managedProject.findUnique({
    where: { id: managedProjectId },
    include: {
      generationJob: true,
      user: true,
    },
  });

  if (!project) {
    console.error(`Managed project not found: ${managedProjectId}`);
    return;
  }

  // Handle different event types
  switch (event.type) {
    case 'checkout.session.completed': {
      console.log(`✅ Checkout completed for project ${managedProjectId}`);
      // The generated app should handle this via its own webhook handler
      // We just log it here for platform analytics
      break;
    }

    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`✅ Subscription created: ${subscription.id}`);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`❌ Subscription cancelled: ${subscription.id}`);
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`💰 Invoice paid: ${invoice.id}, Amount: ${invoice.amount_paid / 100}`);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`❌ Payment failed: ${invoice.id}`);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

// ============================================================================
// ENVIRONMENT VARIABLE BUILDER
// ============================================================================

/**
 * Build Stripe environment variables for a managed project
 */
export function buildStripeEnvVars(params: {
  isTestMode: boolean;
  publishableKey: string;
  secretKey: string; // Already encrypted
  webhookSecret: string; // Already encrypted
}): Record<string, string> {
  const { isTestMode, publishableKey, secretKey, webhookSecret } = params;

  return {
    [`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`]: publishableKey,
    [`STRIPE_SECRET_KEY`]: decrypt(secretKey),
    [`STRIPE_WEBHOOK_SECRET`]: decrypt(webhookSecret),
    // Also include the test/live indicators
    [`STRIPE_MODE`]: isTestMode ? 'test' : 'live',
  };
}