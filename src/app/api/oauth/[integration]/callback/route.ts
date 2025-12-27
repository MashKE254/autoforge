/**
 * OAuth Callback Handler
 *
 * GET /api/oauth/[integration]/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getIntegration } from '@/lib/integrations/registry';

// Token exchange configurations
const TOKEN_CONFIGS: Record<string, {
  tokenUrl: string;
  getTokenParams: (code: string, clientId: string, clientSecret: string, redirectUri: string) => Record<string, string>;
  parseTokenResponse: (data: any) => { accessToken: string; refreshToken?: string; expiresIn?: number };
}> = {
  twitter: {
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    getTokenParams: (code, clientId, clientSecret, redirectUri) => ({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: 'challenge', // In production: use stored PKCE verifier
    }),
    parseTokenResponse: (data) => ({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    }),
  },
  linkedin: {
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    getTokenParams: (code, clientId, clientSecret, redirectUri) => ({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    parseTokenResponse: (data) => ({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    }),
  },
  instagram: {
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    getTokenParams: (code, clientId, clientSecret, redirectUri) => ({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    parseTokenResponse: (data) => ({
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    }),
  },
  facebook: {
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    getTokenParams: (code, clientId, clientSecret, redirectUri) => ({
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    parseTokenResponse: (data) => ({
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    }),
  },
  'google-calendar': {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    getTokenParams: (code, clientId, clientSecret, redirectUri) => ({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    parseTokenResponse: (data) => ({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    }),
  },
  gmail: {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    getTokenParams: (code, clientId, clientSecret, redirectUri) => ({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    parseTokenResponse: (data) => ({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    }),
  },
  shopify: {
    tokenUrl: '', // Shopify uses shop-specific URLs
    getTokenParams: (code, clientId, clientSecret, redirectUri) => ({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
    parseTokenResponse: (data) => ({
      accessToken: data.access_token,
    }),
  },
  'stripe-connect': {
    tokenUrl: 'https://connect.stripe.com/oauth/token',
    getTokenParams: (code, clientId, clientSecret, redirectUri) => ({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    parseTokenResponse: (data) => ({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    }),
  },
  discord: {
    tokenUrl: 'https://discord.com/api/oauth2/token',
    getTokenParams: (code, clientId, clientSecret, redirectUri) => ({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    parseTokenResponse: (data) => ({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    }),
  },
  slack: {
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    getTokenParams: (code, clientId, clientSecret, redirectUri) => ({
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    parseTokenResponse: (data) => ({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    }),
  },
  github: {
    tokenUrl: 'https://github.com/login/oauth/access_token',
    getTokenParams: (code, clientId, clientSecret, redirectUri) => ({
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    parseTokenResponse: (data) => ({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    }),
  },
  notion: {
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    getTokenParams: (code, clientId, clientSecret, redirectUri) => ({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
    parseTokenResponse: (data) => ({
      accessToken: data.access_token,
    }),
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ integration: string }> }
) {
  try {
    const { integration: integrationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL(`/integrations?error=${error}`, request.url)
      );
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(
        new URL('/integrations?error=missing_code', request.url)
      );
    }

    // Validate state and extract user ID
    let state: { userId: string; timestamp: number };
    try {
      state = JSON.parse(Buffer.from(stateParam, 'base64').toString());
    } catch {
      return NextResponse.redirect(
        new URL('/integrations?error=invalid_state', request.url)
      );
    }

    // Validate integration
    const config = getIntegration(integrationId);
    if (!config || config.type !== 'oauth') {
      return NextResponse.redirect(
        new URL('/integrations?error=invalid_integration', request.url)
      );
    }

    const tokenConfig = TOKEN_CONFIGS[integrationId];
    if (!tokenConfig) {
      return NextResponse.redirect(
        new URL('/integrations?error=config_not_found', request.url)
      );
    }

    // Get credentials from environment
    const envPrefix = integrationId.toUpperCase().replace(/-/g, '_');
    const clientId = process.env[`${envPrefix}_CLIENT_ID`];
    const clientSecret = process.env[`${envPrefix}_CLIENT_SECRET`];

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/integrations?error=missing_credentials', request.url)
      );
    }

    // Build redirect URI
    const redirectUri = `${request.nextUrl.origin}/api/oauth/${integrationId}/callback`;

    // Exchange code for access token
    let tokenUrl = tokenConfig.tokenUrl;

    // Special handling for Shopify
    if (integrationId === 'shopify') {
      const shop = searchParams.get('shop');
      if (!shop) {
        return NextResponse.redirect(
          new URL('/integrations?error=missing_shop', request.url)
        );
      }
      tokenUrl = `https://${shop}/admin/oauth/access_token`;
    }

    const tokenParams = tokenConfig.getTokenParams(code, clientId, clientSecret, redirectUri);

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        ...(integrationId === 'twitter' && {
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        }),
        ...(integrationId === 'notion' && {
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        }),
      },
      body: new URLSearchParams(tokenParams),
    });

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(
        new URL('/integrations?error=token_exchange_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const { accessToken, refreshToken, expiresIn } = tokenConfig.parseTokenResponse(tokenData);

    // Get account info (varies by integration)
    let accountInfo: any = {};
    try {
      accountInfo = await fetchAccountInfo(integrationId, accessToken, tokenData);
    } catch (error) {
      console.error('Failed to fetch account info:', error);
      // Continue anyway - account info is optional
    }

    // Save credentials to database
    await prisma.integrationCredential.upsert({
      where: {
        userId_integrationId: {
          userId: state.userId,
          integrationId,
        },
      },
      create: {
        userId: state.userId,
        integrationId,
        type: 'oauth',
        accessToken,
        refreshToken,
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
        scopes: config.requiredScopes || [],
        accountInfo,
        isActive: true,
      },
      update: {
        accessToken,
        refreshToken,
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
        accountInfo,
        isActive: true,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Close popup window
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authorization Successful</title>
        </head>
        <body>
          <script>
            window.opener?.postMessage({ type: 'oauth-success', integration: '${integrationId}' }, '*');
            setTimeout(() => window.close(), 1000);
          </script>
          <p>Authorization successful! This window will close automatically...</p>
        </body>
      </html>
      `,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/integrations?error=callback_failed', request.url)
    );
  }
}

async function fetchAccountInfo(integrationId: string, accessToken: string, tokenData: any): Promise<any> {
  switch (integrationId) {
    case 'twitter': {
      const res = await fetch('https://api.twitter.com/2/users/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await res.json();
      return { id: data.data?.id, username: data.data?.username, name: data.data?.name };
    }

    case 'github': {
      const res = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await res.json();
      return { id: data.id, username: data.login, name: data.name };
    }

    case 'stripe-connect':
      return { stripe_user_id: tokenData.stripe_user_id };

    case 'shopify':
      return { shop: tokenData.associated_user_scope };

    case 'instagram':
      return { instagram_business_account: tokenData.user_id };

    // Add other integrations as needed
    default:
      return {};
  }
}
