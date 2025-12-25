/**
 * Uptime Monitoring Cron Job
 * File: src/app/api/cron/monitor/route.ts
 *
 * This runs every minute to check all deployed apps for uptime.
 *
 * Setup with Vercel Cron:
 * vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/monitor",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { monitoringService } from '@/services/monitoring-service';

export const maxDuration = 60; // 60 seconds max execution

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (Vercel adds a special header)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Monitoring cron job started');

    // Run monitoring sweep
    await monitoringService.monitorAllApps();

    console.log('✅ Monitoring cron job completed');

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Monitoring cron error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
