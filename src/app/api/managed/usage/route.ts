/**
 * Usage API - View usage statistics and limits
 *
 * File: src/app/api/managed/usage/route.ts
 *
 * Purpose:
 * - Get current month usage
 * - Check limits
 * - View historical usage
 * - Calculate overage costs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getUserUsageSummary } from '@/middleware/usage-tracking';

// ============================================================================
// GET: Get Usage Summary
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 3. Get usage summary
    const summary = await getUserUsageSummary(user.id);

    if (!summary) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // 4. Get historical usage (last 6 months)
    const now = new Date();
    const historicalUsage = [];

    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = monthDate.getMonth();
      const year = monthDate.getFullYear();

      const usage = await prisma.monthlyUsage.findUnique({
        where: {
          userId_month_year: {
            userId: user.id,
            month,
            year,
          },
        },
      });

      historicalUsage.push({
        month,
        year,
        monthName: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        usage: usage
          ? {
              aiOps: usage.totalAiOps,
              tokens: usage.totalTokens,
              dbStorageMB: Math.ceil(usage.totalDbStorage / (1024 * 1024)),
              bandwidthGB: Math.ceil(usage.totalBandwidth / (1024 * 1024 * 1024)),
              apps: usage.totalApps,
            }
          : null,
        costs: usage
          ? {
              aiCostCents: usage.aiCost,
              storageCostCents: usage.storageCost,
              bandwidthCostCents: usage.bandwidthCost,
              totalCostCents: usage.totalCost,
              overageCostCents: usage.overageCost,
            }
          : null,
      });
    }

    return NextResponse.json({
      currentMonth: summary,
      historical: historicalUsage,
      subscription: {
        tier: user.subscription?.tier,
        status: user.subscription?.status,
      },
    });

  } catch (error) {
    console.error('Failed to get usage:', error);

    return NextResponse.json(
      { error: 'Failed to get usage' },
      { status: 500 }
    );
  }
}
