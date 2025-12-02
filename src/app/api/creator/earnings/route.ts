/**
 * Creator Earnings API
 * 
 * File: src/app/api/creator/earnings/route.ts
 * 
 * Returns revenue summary for the authenticated creator.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getCreatorRevenueSummary } from '@/lib/stripe/connect';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const summary = await getCreatorRevenueSummary(session.user.id);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Get earnings error:', error);
    return NextResponse.json(
      { error: 'Failed to get earnings' },
      { status: 500 }
    );
  }
}
