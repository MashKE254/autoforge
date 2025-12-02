/**
 * Creator Balance API
 * 
 * File: src/app/api/creator/balance/route.ts
 * 
 * Returns available and pending balance for the authenticated creator.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getCreatorBalance } from '@/lib/stripe/connect';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const balance = await getCreatorBalance(session.user.id);

    return NextResponse.json(balance);
  } catch (error) {
    console.error('Get balance error:', error);
    return NextResponse.json(
      { error: 'Failed to get balance' },
      { status: 500 }
    );
  }
}
