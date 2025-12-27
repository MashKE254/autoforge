/**
 * Connect Integration with API Key
 *
 * POST /api/integrations/[id]/connect
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getIntegration } from '@/lib/integrations/registry';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: integrationId } = await params;
    const body = await request.json();
    const { apiKey, apiSecret } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 });
    }

    // Get integration config
    const config = getIntegration(integrationId);
    if (!config) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    if (config.type !== 'api-key') {
      return NextResponse.json(
        { error: 'This integration requires OAuth' },
        { status: 400 }
      );
    }

    // Test connection based on integration type
    let accountInfo = {};
    try {
      accountInfo = await testConnection(integrationId, apiKey, apiSecret);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid API key or connection failed' },
        { status: 400 }
      );
    }

    // Save credentials
    await prisma.integrationCredential.upsert({
      where: {
        userId_integrationId: {
          userId: session.user.id,
          integrationId,
        },
      },
      create: {
        userId: session.user.id,
        integrationId,
        type: 'api-key',
        apiKey, // In production, encrypt this
        apiSecret: apiSecret || null,
        accountInfo,
        isActive: true,
      },
      update: {
        apiKey,
        apiSecret: apiSecret || null,
        accountInfo,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      integrationId,
      accountInfo,
    });
  } catch (error) {
    console.error('Connect error:', error);
    return NextResponse.json(
      { error: 'Failed to connect integration' },
      { status: 500 }
    );
  }
}

async function testConnection(integrationId: string, apiKey: string, apiSecret?: string): Promise<any> {
  // Simple validation - in production, make actual API call to verify
  switch (integrationId) {
    case 'openai':
      if (!apiKey.startsWith('sk-')) {
        throw new Error('Invalid OpenAI API key format');
      }
      return { provider: 'OpenAI', keyFormat: 'valid' };

    case 'stripe':
      if (!apiKey.startsWith('sk_')) {
        throw new Error('Invalid Stripe API key format');
      }
      return { provider: 'Stripe', keyFormat: 'valid' };

    case 'anthropic':
      if (!apiKey.startsWith('sk-ant-')) {
        throw new Error('Invalid Anthropic API key format');
      }
      return { provider: 'Anthropic', keyFormat: 'valid' };

    default:
      return { provider: integrationId, keyFormat: 'accepted' };
  }
}
