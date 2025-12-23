/**
 * Managed App Provisioning API - ONE-CLICK DEPLOYMENT
 *
 * File: src/app/api/managed/provision/route.ts
 *
 * Purpose:
 * - API endpoint for provisioning managed apps
 * - Called after code generation completes
 * - Handles complete end-to-end provisioning
 *
 * User Journey:
 * 1. User generates app via /api/generate
 * 2. User clicks "Publish to AutoForge" button
 * 3. Frontend calls this endpoint
 * 4. This endpoint provisions everything
 * 5. User gets live URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { provisionManagedApp } from '@/services/managed-app-provisioner';

// ============================================================================
// POST: Provision Managed App
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // 2. Get user from database
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

    // 3. Check if user has active subscription
    if (!user.subscription || user.subscription.status !== 'ACTIVE') {
      return NextResponse.json(
        {
          error: 'Active subscription required to use managed platform',
          upgrade_url: '/pricing',
        },
        { status: 403 }
      );
    }

    // 4. Parse request
    const body = await request.json();
    const { generationJobId, appName, subdomain } = body;

    if (!generationJobId || !appName || !subdomain) {
      return NextResponse.json(
        { error: 'Missing required fields: generationJobId, appName, subdomain' },
        { status: 400 }
      );
    }

    // 5. Validate subdomain
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomain)) {
      return NextResponse.json(
        { error: 'Invalid subdomain. Use only lowercase letters, numbers, and hyphens.' },
        { status: 400 }
      );
    }

    // Check subdomain availability
    const existingApp = await prisma.managedApp.findUnique({
      where: { subdomain },
    });

    if (existingApp) {
      return NextResponse.json(
        { error: 'Subdomain already taken. Please choose another.' },
        { status: 409 }
      );
    }

    // 6. Get generation job
    const job = await prisma.generationJob.findUnique({
      where: { id: generationJobId },
      include: {
        files: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Generation job not found' },
        { status: 404 }
      );
    }

    if (job.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to provision this job' },
        { status: 403 }
      );
    }

    if (job.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Generation job must be completed before provisioning' },
        { status: 400 }
      );
    }

    // 7. Check app limits
    const currentApps = await prisma.managedApp.count({
      where: {
        userId: user.id,
        status: { in: ['PROVISIONING', 'ACTIVE'] },
      },
    });

    const planLimits = await prisma.planLimits.findUnique({
      where: { plan: user.subscription.tier },
    });

    if (planLimits && currentApps >= planLimits.maxApps) {
      return NextResponse.json(
        {
          error: `App limit reached (${planLimits.maxApps} apps on ${user.subscription.tier} plan)`,
          upgrade_url: '/pricing',
        },
        { status: 403 }
      );
    }

    // 8. Convert files from database format to provisioner format
    const files = job.files.map(f => ({
      path: f.path,
      content: f.content,
      language: f.language,
    }));

    // 9. Provision managed app (this is the BIG step!)
    console.log(`\n🚀 Starting managed app provisioning for user ${user.email}...`);

    const result = await provisionManagedApp({
      userId: user.id,
      generationJobId: job.id,
      appName,
      subdomain,
      files,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Provisioning failed',
          details: result.details,
        },
        { status: 500 }
      );
    }

    // 10. Return success with app details
    return NextResponse.json({
      success: true,
      message: 'App provisioned successfully!',
      app: result.managedApp,
      details: result.details,
    });

  } catch (error) {
    console.error('❌ Managed provisioning error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Provisioning failed',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET: List User's Managed Apps
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
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 3. Get managed apps
    const apps = await prisma.managedApp.findMany({
      where: {
        userId: user.id,
        status: { not: 'DELETED' },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        subdomain: true,
        deploymentUrl: true,
        status: true,
        createdAt: true,
        publishedAt: true,
      },
    });

    // 4. Get current month usage
    const now = new Date();
    const monthlyUsage = await prisma.monthlyUsage.findUnique({
      where: {
        userId_month_year: {
          userId: user.id,
          month: now.getMonth(),
          year: now.getFullYear(),
        },
      },
    });

    return NextResponse.json({
      apps,
      usage: monthlyUsage
        ? {
            aiOps: monthlyUsage.totalAiOps,
            tokens: monthlyUsage.totalTokens,
            dbStorage: monthlyUsage.totalDbStorage,
            bandwidth: monthlyUsage.totalBandwidth,
            totalApps: apps.length,
          }
        : null,
    });

  } catch (error) {
    console.error('Failed to list managed apps:', error);

    return NextResponse.json(
      { error: 'Failed to list apps' },
      { status: 500 }
    );
  }
}
