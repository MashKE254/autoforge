// src/app/api/cron/cleanup/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cleanupService } from '@/lib/infrastructure/cleanup-service';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await cleanupService.cleanupExpiredProjects();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cleanup cron failed:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}