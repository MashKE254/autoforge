/**
 * Creator Transactions API
 * 
 * File: src/app/api/creator/transactions/route.ts
 * 
 * Returns transaction history for the authenticated creator.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get all apps for this creator
    const apps = await prisma.publishedApp.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true },
    });

    const appIds = apps.map(a => a.id);
    const appNameMap = Object.fromEntries(apps.map(a => [a.id, a.name]));

    if (appIds.length === 0) {
      return NextResponse.json({
        transactions: [],
        total: 0,
      });
    }

    // Get transactions
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { publishedAppId: { in: appIds } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({
        where: { publishedAppId: { in: appIds } },
      }),
    ]);

    return NextResponse.json({
      transactions: transactions.map(tx => ({
        id: tx.id,
        appName: appNameMap[tx.publishedAppId] || 'Unknown App',
        type: tx.type,
        grossAmount: tx.grossAmount,
        netAmount: tx.netAmount,
        platformFee: tx.platformFee,
        status: tx.status,
        customerEmail: tx.customerEmail || 'N/A',
        createdAt: tx.createdAt.toISOString(),
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: 'Failed to get transactions' },
      { status: 500 }
    );
  }
}
