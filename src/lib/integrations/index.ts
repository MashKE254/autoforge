/**
 * Integration System Exports
 *
 * Central export point for all integrations
 */

// Base classes
export { BaseIntegrationClient, OAuthClient, APIKeyClient } from './base-client';

// OAuth Clients (12)
export { TwitterClient } from './twitter/client';
export { LinkedInClient } from './linkedin/client';
export { InstagramClient } from './instagram/client';
export { FacebookClient } from './facebook/client';
export { GoogleCalendarClient } from './google-calendar/client';
export { GmailClient } from './gmail/client';
export { ShopifyClient } from './shopify/client';
export { StripeConnectClient } from './stripe-connect/client';
export { DiscordClient } from './discord/client';
export { SlackClient } from './slack/client';
export { GitHubClient } from './github/client';
export { NotionClient } from './notion/client';

// API Key Clients (8)
export { OpenAIClient } from './openai/client';
export { AnthropicClient } from './anthropic/client';
export { StripeClient } from './stripe/client';
export { TwilioClient } from './twilio/client';
export { SendGridClient } from './sendgrid/client';
export { AWSS3Client } from './aws-s3/client';
export { GoogleMapsClient } from './google-maps/client';
export { ReplicateClient } from './replicate/client';

// Registry & detection
export * from './registry';
export * from './detection';
export * from './types';

// Helper to get client instance
import { TwitterClient } from './twitter/client';
import { LinkedInClient } from './linkedin/client';
import { InstagramClient } from './instagram/client';
import { FacebookClient } from './facebook/client';
import { GoogleCalendarClient } from './google-calendar/client';
import { GmailClient } from './gmail/client';
import { ShopifyClient } from './shopify/client';
import { StripeConnectClient } from './stripe-connect/client';
import { DiscordClient } from './discord/client';
import { SlackClient } from './slack/client';
import { GitHubClient } from './github/client';
import { NotionClient } from './notion/client';
import { OpenAIClient } from './openai/client';
import { AnthropicClient } from './anthropic/client';
import { StripeClient } from './stripe/client';
import { TwilioClient } from './twilio/client';
import { SendGridClient } from './sendgrid/client';
import { AWSS3Client } from './aws-s3/client';
import { GoogleMapsClient } from './google-maps/client';
import { ReplicateClient } from './replicate/client';

export function getIntegrationClient(integrationId: string, options: any) {
  switch (integrationId) {
    // OAuth integrations
    case 'twitter':
      return new TwitterClient(options);
    case 'linkedin':
      return new LinkedInClient(options);
    case 'instagram':
      return new InstagramClient(options);
    case 'facebook':
      return new FacebookClient(options);
    case 'google-calendar':
      return new GoogleCalendarClient(options);
    case 'gmail':
      return new GmailClient(options);
    case 'shopify':
      return new ShopifyClient(options);
    case 'stripe-connect':
      return new StripeConnectClient(options);
    case 'discord':
      return new DiscordClient(options);
    case 'slack':
      return new SlackClient(options);
    case 'github':
      return new GitHubClient(options);
    case 'notion':
      return new NotionClient(options);

    // API key integrations
    case 'openai':
      return new OpenAIClient(options);
    case 'anthropic':
      return new AnthropicClient(options);
    case 'stripe':
      return new StripeClient(options);
    case 'twilio':
      return new TwilioClient(options);
    case 'sendgrid':
      return new SendGridClient(options);
    case 'aws-s3':
      return new AWSS3Client(options);
    case 'google-maps':
      return new GoogleMapsClient(options);
    case 'replicate':
      return new ReplicateClient(options);

    default:
      throw new Error(`Integration client not found: ${integrationId}`);
  }
}
