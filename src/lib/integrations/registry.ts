/**
 * Integration Registry
 *
 * Central registry of all 20 integrations
 */

import { IntegrationConfig } from './types';

export const INTEGRATIONS: Record<string, IntegrationConfig> = {
  // ============================================================================
  // TIER 1: OAuth Auto-Fetch (12 integrations) - ZERO MANUAL WORK
  // ============================================================================

  twitter: {
    id: 'twitter',
    name: 'Twitter',
    category: 'social-media',
    type: 'oauth',
    description: 'Post tweets, read timeline, manage followers',
    icon: '🐦',
    estimatedSetupTime: 0.5, // 30 seconds
    requiredScopes: ['tweet.read', 'tweet.write', 'users.read'],
    oauthConfig: {
      authUrl: 'https://twitter.com/i/oauth2/authorize',
      tokenUrl: 'https://api.twitter.com/2/oauth2/token',
      clientIdEnvVar: 'TWITTER_CLIENT_ID',
      clientSecretEnvVar: 'TWITTER_CLIENT_SECRET',
      redirectUri: '/api/oauth/twitter/callback',
    },
    features: [
      'post_tweet',
      'read_timeline',
      'get_user_info',
      'manage_followers',
      'read_mentions',
      'like_tweet',
      'retweet',
    ],
    triggers: [
      'twitter',
      'tweet',
      'social media automation',
      'post to twitter',
      'twitter bot',
    ],
  },

  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'social-media',
    type: 'oauth',
    description: 'Share posts, manage company pages, analytics',
    icon: '💼',
    estimatedSetupTime: 0.5,
    requiredScopes: ['w_member_social', 'r_basicprofile', 'r_organization_social'],
    oauthConfig: {
      authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
      clientIdEnvVar: 'LINKEDIN_CLIENT_ID',
      clientSecretEnvVar: 'LINKEDIN_CLIENT_SECRET',
      redirectUri: '/api/oauth/linkedin/callback',
    },
    features: ['share_post', 'get_profile', 'company_page', 'analytics'],
    triggers: ['linkedin', 'professional network', 'b2b social', 'business network'],
  },

  instagram: {
    id: 'instagram',
    name: 'Instagram',
    category: 'social-media',
    type: 'oauth',
    description: 'Post photos, stories, manage comments',
    icon: '📷',
    estimatedSetupTime: 0.5,
    requiredScopes: ['instagram_basic', 'instagram_content_publish'],
    oauthConfig: {
      authUrl: 'https://api.instagram.com/oauth/authorize',
      tokenUrl: 'https://api.instagram.com/oauth/access_token',
      clientIdEnvVar: 'INSTAGRAM_CLIENT_ID',
      clientSecretEnvVar: 'INSTAGRAM_CLIENT_SECRET',
      redirectUri: '/api/oauth/instagram/callback',
    },
    features: ['post_photo', 'post_story', 'get_comments', 'manage_comments'],
    triggers: ['instagram', 'photo sharing', 'social media images', 'ig post'],
  },

  facebook: {
    id: 'facebook',
    name: 'Facebook',
    category: 'social-media',
    type: 'oauth',
    description: 'Manage pages, post updates, read insights',
    icon: '👥',
    estimatedSetupTime: 0.5,
    requiredScopes: ['pages_manage_posts', 'pages_read_engagement'],
    oauthConfig: {
      authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
      clientIdEnvVar: 'FACEBOOK_APP_ID',
      clientSecretEnvVar: 'FACEBOOK_APP_SECRET',
      redirectUri: '/api/oauth/facebook/callback',
    },
    features: ['manage_pages', 'post_update', 'read_insights', 'schedule_posts'],
    triggers: ['facebook', 'fb page', 'social media', 'facebook page management'],
  },

  'google-calendar': {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'productivity',
    type: 'oauth',
    description: 'Create events, read calendar, manage schedules',
    icon: '📅',
    estimatedSetupTime: 0.5,
    requiredScopes: ['https://www.googleapis.com/auth/calendar'],
    oauthConfig: {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientIdEnvVar: 'GOOGLE_CLIENT_ID',
      clientSecretEnvVar: 'GOOGLE_CLIENT_SECRET',
      redirectUri: '/api/oauth/google/callback',
    },
    features: ['create_event', 'read_calendar', 'update_event', 'delete_event'],
    triggers: ['google calendar', 'calendar', 'scheduling', 'appointments', 'meetings'],
  },

  gmail: {
    id: 'gmail',
    name: 'Gmail',
    category: 'communication',
    type: 'oauth',
    description: 'Send emails, read inbox, manage labels',
    icon: '📧',
    estimatedSetupTime: 0.5,
    requiredScopes: ['https://www.googleapis.com/auth/gmail.modify'],
    oauthConfig: {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientIdEnvVar: 'GOOGLE_CLIENT_ID',
      clientSecretEnvVar: 'GOOGLE_CLIENT_SECRET',
      redirectUri: '/api/oauth/google/callback',
    },
    features: ['send_email', 'read_inbox', 'manage_labels', 'search_emails'],
    triggers: ['gmail', 'email', 'send email', 'email automation', 'inbox'],
  },

  shopify: {
    id: 'shopify',
    name: 'Shopify',
    category: 'analytics',
    type: 'oauth',
    description: 'Manage products, orders, inventory',
    icon: '🛍️',
    estimatedSetupTime: 1,
    requiredScopes: ['read_products', 'write_products', 'read_orders'],
    oauthConfig: {
      authUrl: 'https://[shop].myshopify.com/admin/oauth/authorize',
      tokenUrl: 'https://[shop].myshopify.com/admin/oauth/access_token',
      clientIdEnvVar: 'SHOPIFY_API_KEY',
      clientSecretEnvVar: 'SHOPIFY_API_SECRET',
      redirectUri: '/api/oauth/shopify/callback',
    },
    features: ['manage_products', 'read_orders', 'update_inventory', 'analytics'],
    triggers: ['shopify', 'ecommerce', 'online store', 'products', 'orders'],
  },

  'stripe-connect': {
    id: 'stripe-connect',
    name: 'Stripe Connect',
    category: 'payments',
    type: 'oauth',
    description: 'Accept payments, manage sellers (marketplace)',
    icon: '💳',
    estimatedSetupTime: 1,
    requiredScopes: ['read_write'],
    oauthConfig: {
      authUrl: 'https://connect.stripe.com/oauth/authorize',
      tokenUrl: 'https://connect.stripe.com/oauth/token',
      clientIdEnvVar: 'STRIPE_CONNECT_CLIENT_ID',
      clientSecretEnvVar: 'STRIPE_SECRET_KEY',
      redirectUri: '/api/oauth/stripe/callback',
    },
    features: ['accept_payments', 'manage_sellers', 'payouts', 'refunds'],
    triggers: ['stripe connect', 'marketplace payments', 'multi-vendor', 'seller payments'],
  },

  discord: {
    id: 'discord',
    name: 'Discord',
    category: 'communication',
    type: 'oauth',
    description: 'Bot commands, server management, messages',
    icon: '💬',
    estimatedSetupTime: 0.5,
    requiredScopes: ['bot', 'messages.read', 'messages.write'],
    oauthConfig: {
      authUrl: 'https://discord.com/api/oauth2/authorize',
      tokenUrl: 'https://discord.com/api/oauth2/token',
      clientIdEnvVar: 'DISCORD_CLIENT_ID',
      clientSecretEnvVar: 'DISCORD_CLIENT_SECRET',
      redirectUri: '/api/oauth/discord/callback',
    },
    features: ['send_message', 'read_messages', 'manage_roles', 'create_channel'],
    triggers: ['discord', 'discord bot', 'community management', 'server automation'],
  },

  slack: {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    type: 'oauth',
    description: 'Send messages, notifications, slash commands',
    icon: '💼',
    estimatedSetupTime: 0.5,
    requiredScopes: ['chat:write', 'channels:read', 'users:read'],
    oauthConfig: {
      authUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      clientIdEnvVar: 'SLACK_CLIENT_ID',
      clientSecretEnvVar: 'SLACK_CLIENT_SECRET',
      redirectUri: '/api/oauth/slack/callback',
    },
    features: ['send_message', 'create_channel', 'read_users', 'post_notification'],
    triggers: ['slack', 'team chat', 'notifications', 'workspace automation'],
  },

  github: {
    id: 'github',
    name: 'GitHub',
    category: 'productivity',
    type: 'oauth',
    description: 'Manage repos, issues, pull requests',
    icon: '🐙',
    estimatedSetupTime: 0.5,
    requiredScopes: ['repo', 'user', 'workflow'],
    oauthConfig: {
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      clientIdEnvVar: 'GITHUB_CLIENT_ID',
      clientSecretEnvVar: 'GITHUB_CLIENT_SECRET',
      redirectUri: '/api/oauth/github/callback',
    },
    features: ['manage_repos', 'create_issue', 'merge_pr', 'run_actions'],
    triggers: ['github', 'git', 'repository', 'code management', 'pull requests'],
  },

  notion: {
    id: 'notion',
    name: 'Notion',
    category: 'productivity',
    type: 'oauth',
    description: 'Create pages, databases, manage workspace',
    icon: '📝',
    estimatedSetupTime: 0.5,
    requiredScopes: ['read_content', 'insert_content', 'update_content'],
    oauthConfig: {
      authUrl: 'https://api.notion.com/v1/oauth/authorize',
      tokenUrl: 'https://api.notion.com/v1/oauth/token',
      clientIdEnvVar: 'NOTION_CLIENT_ID',
      clientSecretEnvVar: 'NOTION_CLIENT_SECRET',
      redirectUri: '/api/oauth/notion/callback',
    },
    features: ['create_page', 'update_database', 'read_content', 'search'],
    triggers: ['notion', 'notes', 'documentation', 'knowledge base', 'workspace'],
  },

  // ============================================================================
  // TIER 2: Guided Setup (8 integrations) - 5-MIN SETUP
  // ============================================================================

  openai: {
    id: 'openai',
    name: 'OpenAI',
    category: 'ai',
    type: 'api-key',
    description: 'GPT-4, DALL-E, embeddings, function calling',
    icon: '🤖',
    estimatedSetupTime: 5,
    setupVideoUrl: 'https://youtube.com/watch?v=openai-setup',
    docsUrl: 'https://platform.openai.com/docs',
    apiKeyConfig: {
      provider: 'OpenAI',
      signupUrl: 'https://platform.openai.com/signup',
      docsUrl: 'https://platform.openai.com/docs/api-reference',
      exampleKey: 'sk-proj-...',
    },
    features: ['text_generation', 'image_generation', 'embeddings', 'chat', 'function_calling'],
    triggers: ['openai', 'gpt', 'ai', 'chatbot', 'text generation', 'ai assistant'],
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    category: 'ai',
    type: 'api-key',
    description: 'Claude AI for advanced reasoning and analysis',
    icon: '🧠',
    estimatedSetupTime: 5,
    setupVideoUrl: 'https://youtube.com/watch?v=claude-setup',
    docsUrl: 'https://docs.anthropic.com',
    apiKeyConfig: {
      provider: 'Anthropic',
      signupUrl: 'https://console.anthropic.com',
      docsUrl: 'https://docs.anthropic.com/claude/reference',
      exampleKey: 'sk-ant-...',
    },
    features: ['text_generation', 'analysis', 'reasoning', 'long_context'],
    triggers: ['claude', 'anthropic', 'ai reasoning', 'advanced ai', 'ai analysis'],
  },

  stripe: {
    id: 'stripe',
    name: 'Stripe Payments',
    category: 'payments',
    type: 'api-key',
    description: 'Accept payments, subscriptions, invoices',
    icon: '💰',
    estimatedSetupTime: 5,
    setupVideoUrl: 'https://youtube.com/watch?v=stripe-setup',
    docsUrl: 'https://stripe.com/docs',
    apiKeyConfig: {
      provider: 'Stripe',
      signupUrl: 'https://dashboard.stripe.com/register',
      docsUrl: 'https://stripe.com/docs/api',
      exampleKey: 'sk_live_...',
    },
    features: ['payments', 'subscriptions', 'invoices', 'refunds', 'webhooks'],
    triggers: ['stripe', 'payments', 'billing', 'subscriptions', 'checkout', 'payment processing'],
  },

  twilio: {
    id: 'twilio',
    name: 'Twilio',
    category: 'communication',
    type: 'api-key',
    description: 'SMS, voice calls, WhatsApp, verify',
    icon: '📱',
    estimatedSetupTime: 5,
    setupVideoUrl: 'https://youtube.com/watch?v=twilio-setup',
    docsUrl: 'https://www.twilio.com/docs',
    apiKeyConfig: {
      provider: 'Twilio',
      signupUrl: 'https://www.twilio.com/try-twilio',
      docsUrl: 'https://www.twilio.com/docs/usage/api',
      exampleKey: 'SK...',
    },
    features: ['send_sms', 'make_call', 'whatsapp', 'verify', 'messaging'],
    triggers: ['twilio', 'sms', 'text message', 'phone', 'whatsapp', 'voice call'],
  },

  sendgrid: {
    id: 'sendgrid',
    name: 'SendGrid',
    category: 'communication',
    type: 'api-key',
    description: 'Transactional emails, marketing campaigns',
    icon: '✉️',
    estimatedSetupTime: 5,
    setupVideoUrl: 'https://youtube.com/watch?v=sendgrid-setup',
    docsUrl: 'https://docs.sendgrid.com',
    apiKeyConfig: {
      provider: 'SendGrid',
      signupUrl: 'https://signup.sendgrid.com',
      docsUrl: 'https://docs.sendgrid.com/api-reference',
      exampleKey: 'SG...',
    },
    features: ['send_email', 'templates', 'campaigns', 'analytics', 'deliverability'],
    triggers: ['sendgrid', 'email', 'transactional email', 'email campaigns', 'newsletters'],
  },

  's3': {
    id: 's3',
    name: 'AWS S3',
    category: 'storage',
    type: 'api-key',
    description: 'File storage, CDN, backups',
    icon: '☁️',
    estimatedSetupTime: 5,
    setupVideoUrl: 'https://youtube.com/watch?v=s3-setup',
    docsUrl: 'https://docs.aws.amazon.com/s3',
    apiKeyConfig: {
      provider: 'AWS',
      signupUrl: 'https://aws.amazon.com/free',
      docsUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/API',
      exampleKey: 'AKIA...',
    },
    features: ['upload_file', 'download_file', 'list_objects', 'delete_file', 'cdn'],
    triggers: ['s3', 'aws', 'file storage', 'cloud storage', 'file upload', 'cdn'],
  },

  'google-maps': {
    id: 'google-maps',
    name: 'Google Maps',
    category: 'productivity',
    type: 'api-key',
    description: 'Geocoding, directions, places, maps',
    icon: '🗺️',
    estimatedSetupTime: 5,
    setupVideoUrl: 'https://youtube.com/watch?v=google-maps-setup',
    docsUrl: 'https://developers.google.com/maps',
    apiKeyConfig: {
      provider: 'Google Cloud',
      signupUrl: 'https://console.cloud.google.com',
      docsUrl: 'https://developers.google.com/maps/documentation',
      exampleKey: 'AIza...',
    },
    features: ['geocoding', 'directions', 'places', 'distance_matrix', 'static_maps'],
    triggers: ['google maps', 'maps', 'location', 'geocoding', 'directions', 'places'],
  },

  replicate: {
    id: 'replicate',
    name: 'Replicate',
    category: 'ai',
    type: 'api-key',
    description: 'Run AI models: Stable Diffusion, LLaMA, etc.',
    icon: '🎨',
    estimatedSetupTime: 5,
    setupVideoUrl: 'https://youtube.com/watch?v=replicate-setup',
    docsUrl: 'https://replicate.com/docs',
    apiKeyConfig: {
      provider: 'Replicate',
      signupUrl: 'https://replicate.com/signin',
      docsUrl: 'https://replicate.com/docs/reference/http',
      exampleKey: 'r8_...',
    },
    features: ['run_model', 'image_generation', 'text_to_image', 'image_to_image'],
    triggers: ['replicate', 'stable diffusion', 'ai models', 'image generation', 'llama'],
  },
};

// Helper functions
export function getIntegration(id: string): IntegrationConfig | undefined {
  return INTEGRATIONS[id];
}

export function getIntegrationsByCategory(category: IntegrationCategory): IntegrationConfig[] {
  return Object.values(INTEGRATIONS).filter((i) => i.category === category);
}

export function getIntegrationsByType(type: IntegrationType): IntegrationConfig[] {
  return Object.values(INTEGRATIONS).filter((i) => i.type === type);
}

export function detectRequiredIntegrations(prompt: string): string[] {
  const lowercasePrompt = prompt.toLowerCase();
  const detected: string[] = [];

  Object.values(INTEGRATIONS).forEach((integration) => {
    const hasMatch = integration.triggers.some((trigger) =>
      lowercasePrompt.includes(trigger.toLowerCase())
    );

    if (hasMatch) {
      detected.push(integration.id);
    }
  });

  return detected;
}

export function getAllIntegrations(): IntegrationConfig[] {
  return Object.values(INTEGRATIONS);
}
