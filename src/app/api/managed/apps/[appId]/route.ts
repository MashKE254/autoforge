/**
 * Managed App Details API - Get/Update/Delete individual apps
 *
 * File: src/app/api/managed/apps/[appId]/route.ts
 *
 * Purpose:
 * - Get app details and usage
 * - Update app configuration
 * - Delete app and clean up resources
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getManagedAppDetails, deleteManagedApp } from '@/services/managed-app-provisioner';
import { getUserUsageSummary } from '@/middleware/usage-tracking';

// ============================================================================
// GET: Get App Details
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { appId: string } }
) {
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

    // 3. Get app details
    const appId = params.appId;
    const details = await getManagedAppDetails(appId);

    if (!details) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 404 }
      );
    }

    // 4. Check ownership
    if (details.app.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to access this app' },
        { status: 403 }
      );
    }

    // 5. Return app details
    return NextResponse.json({
      app: {
        id: details.app.id,
        name: details.app.name,
        subdomain: details.app.subdomain,
        deploymentUrl: details.app.deploymentUrl,
        status: details.app.status,
        createdAt: details.app.createdAt,
        publishedAt: details.app.publishedAt,
      },
      database: {
        schemaName: details.app.schemaName,
        // Don't expose connection string for security
      },
      usage: details.usage
        ? {
            aiOps: details.usage.totalAiOps,
            tokens: details.usage.totalTokens,
            dbStorageMB: Math.ceil(details.usage.totalDbStorage / (1024 * 1024)),
            bandwidthGB: Math.ceil(details.usage.totalBandwidth / (1024 * 1024 * 1024)),
          }
        : null,
      limits: details.limits
        ? {
            aiOps: details.limits.maxAiOps,
            dbStorageMB: details.limits.maxDbStorage,
            bandwidthGB: details.limits.maxBandwidth,
          }
        : null,
      recentActivity: details.app.usageRecords.slice(0, 10).map(r => ({
        eventType: r.eventType,
        aiOps: r.aiOps,
        tokensUsed: r.tokensUsed,
        createdAt: r.createdAt,
      })),
    });

  } catch (error) {
    console.error('Failed to get app details:', error);

    return NextResponse.json(
      { error: 'Failed to get app details' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE: Delete App
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { appId: string } }
) {
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

    // 3. Get app
    const appId = params.appId;
    const app = await prisma.managedApp.findUnique({
      where: { id: appId },
    });

    if (!app) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 404 }
      );
    }

    // 4. Check ownership
    if (app.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this app' },
        { status: 403 }
      );
    }

    // 5. Delete app
    const result = await deleteManagedApp(appId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete app' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'App deleted successfully',
    });

  } catch (error) {
    console.error('Failed to delete app:', error);

    return NextResponse.json(
      { error: 'Failed to delete app' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH: Update App Settings
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { appId: string } }
) {
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

    // 3. Get app
    const appId = params.appId;
    const app = await prisma.managedApp.findUnique({
      where: { id: appId },
    });

    if (!app) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 404 }
      );
    }

    // 4. Check ownership
    if (app.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to update this app' },
        { status: 403 }
      );
    }

    // 5. Parse request
    const body = await request.json();
    const { name, customDomain } = body;

    // 6. Update app
    const updated = await prisma.managedApp.update({
      where: { id: appId },
      data: {
        ...(name && { name }),
        ...(customDomain !== undefined && { customDomain }),
      },
    });

    return NextResponse.json({
      success: true,
      app: {
        id: updated.id,
        name: updated.name,
        subdomain: updated.subdomain,
        customDomain: updated.customDomain,
        status: updated.status,
      },
    });

  } catch (error) {
    console.error('Failed to update app:', error);

    return NextResponse.json(
      { error: 'Failed to update app' },
      { status: 500 }
    );
  }
}
