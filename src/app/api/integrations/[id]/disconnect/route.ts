/**
 * Disconnect Integration
 *
 * POST /api/integrations/[id]/disconnect
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

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

    // Delete integration credential
    await prisma.integrationCredential.delete({
      where: {
        userId_integrationId: {
          userId: session.user.id,
          integrationId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      integrationId,
      disconnected: true,
    });
  } catch (error) {
    // If credential doesn't exist, that's fine - it's already disconnected
    if ((error as any).code === 'P2025') {
      return NextResponse.json({
        success: true,
        integrationId: (await params).id,
        disconnected: true,
      });
    }

    console.error('Disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect integration' },
      { status: 500 }
    );
  }
}
