/**
 * OAuth Authorization Initiation
 *
 * POST /api/oauth/[integration]/authorize
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getIntegration } from '@/lib/integrations/registry';

// OAuth configuration for each integration
const OAUTH_CONFIGS: Record<string, {
  authUrl: string;
  scope: string;
  getAuthParams: (clientId: string, redirectUri: string, state: string, scope: string) => Record<string, string>;
}> = {
  twitter: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    scope: 'tweet.read tweet.write users.read offline.access',
    getAuthParams: (clientId, redirectUri, state, scope) => ({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
      code_challenge: 'challenge', // In production: generate proper PKCE challenge
      code_challenge_method: 'plain',
    }),
  },
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    scope: 'openid profile email w_member_social',
    getAuthParams: (clientId, redirectUri, state, scope) => ({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
    }),
  },
  instagram: {
    authUrl: 'https://api.instagram.com/oauth/authorize',
    scope: 'user_profile,user_media',
    getAuthParams: (clientId, redirectUri, state, scope) => ({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
    }),
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    scope: 'pages_show_list,pages_read_engagement,pages_manage_posts',
    getAuthParams: (clientId, redirectUri, state, scope) => ({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
    }),
  },
  'google-calendar': {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: 'https://www.googleapis.com/auth/calendar',
    getAuthParams: (clientId, redirectUri, state, scope) => ({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
      access_type: 'offline',
      prompt: 'consent',
    }),
  },
  gmail: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: 'https://www.googleapis.com/auth/gmail.modify',
    getAuthParams: (clientId, redirectUri, state, scope) => ({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
      access_type: 'offline',
      prompt: 'consent',
    }),
  },
  shopify: {
    authUrl: '', // Shopify uses shop-specific URLs
    scope: 'read_products,write_products,read_orders,write_orders',
    getAuthParams: (clientId, redirectUri, state, scope) => ({
      client_id: clientId,
      scope,
      redirect_uri: redirectUri,
      state,
    }),
  },
  'stripe-connect': {
    authUrl: 'https://connect.stripe.com/oauth/authorize',
    scope: 'read_write',
    getAuthParams: (clientId, redirectUri, state, scope) => ({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
    }),
  },
  discord: {
    authUrl: 'https://discord.com/api/oauth2/authorize',
    scope: 'identify guilds messages.read',
    getAuthParams: (clientId, redirectUri, state, scope) => ({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
    }),
  },
  slack: {
    authUrl: 'https://slack.com/oauth/v2/authorize',
    scope: 'channels:read,chat:write,files:write',
    getAuthParams: (clientId, redirectUri, state, scope) => ({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
    }),
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    scope: 'repo user',
    getAuthParams: (clientId, redirectUri, state, scope) => ({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
    }),
  },
  notion: {
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    scope: '',
    getAuthParams: (clientId, redirectUri, state, scope) => ({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      owner: 'user',
      state,
    }),
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ integration: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    const { integration: integrationId } = await params;

    // Validate integration
    const config = getIntegration(integrationId);
    if (!config || config.type !== 'oauth') {
      return NextResponse.json(
        { error: 'Invalid OAuth integration' },
        { status: 400 }
      );
    }

    const oauthConfig = OAUTH_CONFIGS[integrationId];
    if (!oauthConfig) {
      return NextResponse.json(
        { error: 'OAuth configuration not found' },
        { status: 404 }
      );
    }

    // Get client ID from environment
    const envVarName = `${integrationId.toUpperCase().replace(/-/g, '_')}_CLIENT_ID`;
    const clientId = process.env[envVarName];
    if (!clientId) {
      return NextResponse.json(
        { error: `OAuth not configured. Missing ${envVarName}` },
        { status: 500 }
      );
    }

    // Build redirect URI
    const redirectUri = `${request.nextUrl.origin}/api/oauth/${integrationId}/callback`;

    // Generate state for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        userId: session.user.id,
        timestamp: Date.now(),
        nonce: Math.random().toString(36),
      })
    ).toString('base64');

    // Special handling for Shopify (requires shop domain)
    if (integrationId === 'shopify') {
      const shopDomain = request.nextUrl.searchParams.get('shop');
      if (!shopDomain) {
        return NextResponse.json(
          { error: 'Shopify shop domain required' },
          { status: 400 }
        );
      }
      const authUrl = `https://${shopDomain}/admin/oauth/authorize`;
      const params = new URLSearchParams(
        oauthConfig.getAuthParams(clientId, redirectUri, state, oauthConfig.scope)
      );
      return NextResponse.redirect(`${authUrl}?${params.toString()}`);
    }

    // Build authorization URL
    const authParams = oauthConfig.getAuthParams(
      clientId,
      redirectUri,
      state,
      config.requiredScopes?.join(' ') || oauthConfig.scope
    );

    const authUrl = `${oauthConfig.authUrl}?${new URLSearchParams(authParams).toString()}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth authorization error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
