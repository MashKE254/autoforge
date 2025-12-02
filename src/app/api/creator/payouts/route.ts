/**
 * Creator Payouts API
 * 
 * File: src/app/api/creator/payouts/route.ts
 * 
 * Returns payout history for the authenticated creator.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getPayoutHistory } from '@/lib/stripe/connect';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    const payouts = await getPayoutHistory(session.user.id, limit);

    return NextResponse.json({
      payouts,
    });
  } catch (error) {
    console.error('Get payouts error:', error);
    return NextResponse.json(
      { error: 'Failed to get payouts' },
      { status: 500 }
    );
  }
}
