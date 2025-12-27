/**
 * Check Integration Connection Status
 *
 * GET /api/integrations/[id]/status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: integrationId } = await params;

    // Check if integration credential exists
    const credential = await prisma.integrationCredential.findUnique({
      where: {
        userId_integrationId: {
          userId: session.user.id,
          integrationId,
        },
      },
    });

    return NextResponse.json({
      connected: credential?.isActive === true,
      integrationId,
      accountInfo: credential?.accountInfo || null,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
