/**
 * Trending Shares API
 *
 * File: src/app/api/share/trending/route.ts
 *
 * Returns trending shared apps based on views, remixes, or recency
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'views';
    const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 100);

    // Build order by clause
    let orderBy: any;
    switch (sortBy) {
      case 'remixes':
        orderBy = { remixCount: 'desc' };
        break;
      case 'recent':
        orderBy = { createdAt: 'desc' };
        break;
      case 'views':
      default:
        orderBy = { viewCount: 'desc' };
    }

    // Fetch trending apps
    const shareLinks = await prisma.shareLink.findMany({
      where: {
        isPublic: true,
      },
      orderBy,
      take: limit,
      select: {
        id: true,
        shareId: true,
        title: true,
        description: true,
        creatorName: true,
        thumbnailUrl: true,
        viewCount: true,
        remixCount: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      apps: shareLinks,
      sortBy,
    });

  } catch (error) {
    console.error('Trending apps error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending apps' },
      { status: 500 }
    );
  }
}
