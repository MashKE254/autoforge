import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';

export const runtime = 'edge';
export const alt = 'AutoForge Share';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;

  try {
    // Fetch share data
    const shareLink = await prisma.shareLink.findUnique({
      where: { shareId },
      select: {
        title: true,
        description: true,
        creatorName: true,
        viewCount: true,
        remixCount: true
      }
    });

    if (!shareLink) {
      return new ImageResponse(
        (
          <div
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'sans-serif',
            }}
          >
            <div style={{ fontSize: 60, color: 'white' }}>
              Share Not Found
            </div>
          </div>
        ),
        { ...size }
      );
    }

    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: 60,
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
              }}
            >
              ⚡
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, color: 'white' }}>
              AutoForge
            </div>
          </div>

          {/* Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: '80%' }}>
            <div style={{ fontSize: 56, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
              {shareLink.title}
            </div>
            <div style={{ fontSize: 28, color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.4 }}>
              {shareLink.description?.slice(0, 120)}
              {(shareLink.description?.length || 0) > 120 ? '...' : ''}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 40, fontSize: 24, color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>👤</span>
              <span>{shareLink.creatorName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>👁️</span>
              <span>{shareLink.viewCount.toLocaleString()} views</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>🔀</span>
              <span>{shareLink.remixCount.toLocaleString()} remixes</span>
            </div>
          </div>
        </div>
      ),
      { ...size }
    );
  } catch (error) {
    console.error('OG image generation error:', error);

    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ fontSize: 60, color: 'white', fontWeight: 700 }}>
            AutoForge
          </div>
        </div>
      ),
      { ...size }
    );
  }
}
