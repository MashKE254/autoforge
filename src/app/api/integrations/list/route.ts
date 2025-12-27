/**
 * List User Integrations
 *
 * GET /api/integrations/list
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getIntegration, INTEGRATIONS } from '@/lib/integrations/registry';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all user's credentials
    const credentials = await prisma.integrationCredential.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        integrationId: true,
        type: true,
        isActive: true,
        accountInfo: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Map to integration configs and add connection status
    const integrations = Object.values(INTEGRATIONS).map((config) => {
      const credential = credentials.find((c: typeof credentials[0]) => c.integrationId === config.id);

      return {
        id: config.id,
        name: config.name,
        category: config.category,
        type: config.type,
        icon: config.icon,
        description: config.description,
        features: config.features,
        connected: credential?.isActive || false,
        accountInfo: credential?.accountInfo || null,
        lastUsed: credential?.lastUsedAt || null,
        connectedAt: credential?.createdAt || null,
      };
    });

    // Separate connected and available
    const connected = integrations.filter((i) => i.connected);
    const available = integrations.filter((i) => !i.connected);

    return NextResponse.json({
      integrations: {
        connected,
        available,
        total: integrations.length,
        connectedCount: connected.length,
      },
    });
  } catch (error) {
    console.error('List integrations error:', error);
    return NextResponse.json(
      { error: 'Failed to list integrations' },
      { status: 500 }
    );
  }
}
