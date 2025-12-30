/**
 * Share Link Data API
 *
 * File: src/app/api/share/[shareId]/route.ts
 *
 * Retrieves share link data and tracks views
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    // 1. Find share link
    const shareLink = await prisma.shareLink.findUnique({
      where: { shareId },
      include: {
        generationJob: {
          include: {
            files: true,
            deployments: {
              where: { status: 'READY' },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    if (!shareLink.isPublic) {
      return NextResponse.json(
        { error: 'This share link is private' },
        { status: 403 }
      );
    }

    // 2. Track view (async, don't wait)
    trackView(shareLink.id, request).catch(console.error);

    // 3. Return share data
    const deployment = shareLink.generationJob.deployments[0];

    return NextResponse.json({
      success: true,
      share: {
        id: shareLink.id,
        shareId: shareLink.shareId,
        title: shareLink.title,
        description: shareLink.description,
        creatorName: shareLink.creatorName,
        thumbnailUrl: shareLink.thumbnailUrl,
        allowRemix: shareLink.allowRemix,
        showCode: shareLink.showCode,
        viewCount: shareLink.viewCount,
        remixCount: shareLink.remixCount,
        createdAt: shareLink.createdAt,
        generation: {
          id: shareLink.generationJob.id,
          prompt: shareLink.generationJob.prompt,
          status: shareLink.generationJob.status,
          deploymentUrl: deployment?.deploymentUrl,
          files: shareLink.showCode ? shareLink.generationJob.files : undefined
        }
      }
    });

  } catch (error) {
    console.error('Get share link error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve share link' },
      { status: 500 }
    );
  }
}

// Track view asynchronously
async function trackView(shareLinkId: string, request: NextRequest) {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') ||
                      headersList.get('x-real-ip') ||
                      'unknown';
    const userAgent = headersList.get('user-agent') || undefined;
    const referrer = headersList.get('referer') || undefined;

    // Create session ID from IP + User Agent hash
    const sessionId = await hashString(`${ipAddress}-${userAgent}`);

    // Check if this session viewed recently (within last hour)
    const recentView = await prisma.shareView.findFirst({
      where: {
        shareLinkId,
        sessionId,
        viewedAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
        }
      }
    });

    // Only count as new view if no recent view from same session
    if (!recentView) {
      // Create view record
      await prisma.shareView.create({
        data: {
          shareLinkId,
          ipAddress: ipAddress.split(',')[0], // Take first IP if multiple
          userAgent,
          referrer,
          sessionId
        }
      });

      // Increment view count
      await prisma.shareLink.update({
        where: { id: shareLinkId },
        data: {
          viewCount: { increment: 1 },
          lastViewedAt: new Date()
        }
      });
    }
  } catch (error) {
    console.error('Track view error:', error);
  }
}

// Simple hash function for session ID
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
