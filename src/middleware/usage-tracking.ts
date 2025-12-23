/**
 * Usage Tracking Middleware - Track resource usage for billing
 *
 * File: src/middleware/usage-tracking.ts
 *
 * Purpose:
 * - Track AI operations, database queries, bandwidth
 * - Enforce usage limits
 * - Calculate costs for billing
 *
 * Tracked Metrics:
 * - AI Operations (chat completions, streaming)
 * - Database storage (MB)
 * - Bandwidth (GB)
 * - Tokens consumed
 */

import { prisma } from '@/lib/prisma';
import type { AppUsageEvent } from '@prisma/client';

export interface TrackUsageParams {
  managedAppId: string;
  userId: string;
  eventType: AppUsageEvent;
  aiOps?: number;
  tokensUsed?: number;
  dbQueries?: number;
  dbStorage?: number;
  bandwidthBytes?: number;
}

// ============================================================================
// Track Usage Event
// ============================================================================

export async function trackUsage(params: TrackUsageParams): Promise<void> {
  const {
    managedAppId,
    userId,
    eventType,
    aiOps = 0,
    tokensUsed = 0,
    dbQueries = 0,
    dbStorage = 0,
    bandwidthBytes = 0,
  } = params;

  try {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    // 1. Record usage event
    await prisma.appUsageRecord.create({
      data: {
        managedAppId,
        eventType,
        aiOps,
        tokensUsed,
        dbQueries,
        dbStorage,
        bandwidthBytes,
      },
    });

    // 2. Update monthly aggregate
    await prisma.monthlyUsage.upsert({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
      create: {
        userId,
        month,
        year,
        totalAiOps: aiOps,
        totalTokens: tokensUsed,
        totalDbStorage: dbStorage,
        totalBandwidth: bandwidthBytes,
        totalApps: 0,
        aiCost: 0,
        storageCost: 0,
        bandwidthCost: 0,
        totalCost: 0,
        overageCost: 0,
      },
      update: {
        totalAiOps: { increment: aiOps },
        totalTokens: { increment: tokensUsed },
        totalDbStorage: { increment: dbStorage },
        totalBandwidth: { increment: bandwidthBytes },
      },
    });

    // 3. Calculate and update costs
    await updateMonthlyCosts(userId, month, year);

  } catch (error) {
    console.error('Failed to track usage:', error);
    // Don't throw - usage tracking failure shouldn't break the app
  }
}

// ============================================================================
// Update Monthly Costs
// ============================================================================

async function updateMonthlyCosts(
  userId: string,
  month: number,
  year: number
): Promise<void> {
  // Get current usage
  const usage = await prisma.monthlyUsage.findUnique({
    where: {
      userId_month_year: { userId, month, year },
    },
  });

  if (!usage) return;

  // Get user's subscription and plan limits
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user?.subscription) return;

  const limits = await prisma.planLimits.findUnique({
    where: { plan: user.subscription.tier },
  });

  if (!limits) return;

  // Calculate costs based on usage and limits
  let aiCost = 0;
  let storageCost = 0;
  let bandwidthCost = 0;
  let overageCost = 0;

  // AI costs (overage only)
  if (usage.totalAiOps > limits.maxAiOps) {
    const overageOps = usage.totalAiOps - limits.maxAiOps;
    aiCost = Math.ceil(overageOps / 1000) * limits.overageAiOps;
    overageCost += aiCost;
  }

  // Storage costs (overage only)
  const storageMB = Math.ceil(usage.totalDbStorage / (1024 * 1024));
  if (storageMB > limits.maxDbStorage) {
    const overageGB = Math.ceil((storageMB - limits.maxDbStorage) / 1024);
    storageCost = overageGB * limits.overageStorage;
    overageCost += storageCost;
  }

  // Bandwidth costs (overage only)
  const bandwidthGB = Math.ceil(usage.totalBandwidth / (1024 * 1024 * 1024));
  if (bandwidthGB > limits.maxBandwidth) {
    const overageGB = bandwidthGB - limits.maxBandwidth;
    bandwidthCost = overageGB * limits.overageBandwidth;
    overageCost += bandwidthCost;
  }

  const totalCost = aiCost + storageCost + bandwidthCost;

  // Update costs (in cents)
  await prisma.monthlyUsage.update({
    where: {
      userId_month_year: { userId, month, year },
    },
    data: {
      aiCost: Math.round(aiCost * 100),
      storageCost: Math.round(storageCost * 100),
      bandwidthCost: Math.round(bandwidthCost * 100),
      totalCost: Math.round(totalCost * 100),
      overageCost: Math.round(overageCost * 100),
    },
  });
}

// ============================================================================
// Check if User is Over Limit
// ============================================================================

export async function checkUsageLimit(
  userId: string,
  resourceType: 'ai' | 'storage' | 'bandwidth'
): Promise<{
  withinLimit: boolean;
  usage: number;
  limit: number;
  remaining: number;
}> {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  // Get current usage
  const usage = await prisma.monthlyUsage.findUnique({
    where: {
      userId_month_year: { userId, month, year },
    },
  });

  // Get plan limits
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user?.subscription) {
    return {
      withinLimit: false,
      usage: 0,
      limit: 0,
      remaining: 0,
    };
  }

  const limits = await prisma.planLimits.findUnique({
    where: { plan: user.subscription.tier },
  });

  if (!limits) {
    return {
      withinLimit: false,
      usage: 0,
      limit: 0,
      remaining: 0,
    };
  }

  // Check specific resource
  let currentUsage = 0;
  let maxLimit = 0;

  switch (resourceType) {
    case 'ai':
      currentUsage = usage?.totalAiOps || 0;
      maxLimit = limits.maxAiOps;
      break;
    case 'storage':
      currentUsage = Math.ceil((usage?.totalDbStorage || 0) / (1024 * 1024)); // Convert to MB
      maxLimit = limits.maxDbStorage;
      break;
    case 'bandwidth':
      currentUsage = Math.ceil((usage?.totalBandwidth || 0) / (1024 * 1024 * 1024)); // Convert to GB
      maxLimit = limits.maxBandwidth;
      break;
  }

  return {
    withinLimit: currentUsage < maxLimit,
    usage: currentUsage,
    limit: maxLimit,
    remaining: Math.max(0, maxLimit - currentUsage),
  };
}

// ============================================================================
// Get Usage Summary for User
// ============================================================================

export async function getUserUsageSummary(userId: string) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  // Get current month usage
  const usage = await prisma.monthlyUsage.findUnique({
    where: {
      userId_month_year: { userId, month, year },
    },
  });

  // Get user's subscription
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user?.subscription) {
    return null;
  }

  // Get plan limits
  const limits = await prisma.planLimits.findUnique({
    where: { plan: user.subscription.tier },
  });

  if (!limits) {
    return null;
  }

  return {
    plan: user.subscription.tier,
    usage: {
      aiOps: usage?.totalAiOps || 0,
      tokens: usage?.totalTokens || 0,
      dbStorageMB: Math.ceil((usage?.totalDbStorage || 0) / (1024 * 1024)),
      bandwidthGB: Math.ceil((usage?.totalBandwidth || 0) / (1024 * 1024 * 1024)),
      apps: usage?.totalApps || 0,
    },
    limits: {
      aiOps: limits.maxAiOps,
      dbStorageMB: limits.maxDbStorage,
      bandwidthGB: limits.maxBandwidth,
      apps: limits.maxApps,
    },
    remaining: {
      aiOps: Math.max(0, limits.maxAiOps - (usage?.totalAiOps || 0)),
      dbStorageMB: Math.max(0, limits.maxDbStorage - Math.ceil((usage?.totalDbStorage || 0) / (1024 * 1024))),
      bandwidthGB: Math.max(0, limits.maxBandwidth - Math.ceil((usage?.totalBandwidth || 0) / (1024 * 1024 * 1024))),
      apps: Math.max(0, limits.maxApps - (usage?.totalApps || 0)),
    },
    costs: {
      aiCostCents: usage?.aiCost || 0,
      storageCostCents: usage?.storageCost || 0,
      bandwidthCostCents: usage?.bandwidthCost || 0,
      totalCostCents: usage?.totalCost || 0,
      overageCostCents: usage?.overageCost || 0,
    },
  };
}

// ============================================================================
// Track Database Query (for middleware)
// ============================================================================

export async function trackDatabaseQuery(
  managedAppId: string,
  userId: string,
  queryType: 'read' | 'write'
): Promise<void> {
  await trackUsage({
    managedAppId,
    userId,
    eventType: queryType === 'write' ? 'DATABASE_WRITE' : 'DATABASE_QUERY',
    dbQueries: 1,
  });
}

// ============================================================================
// Track Bandwidth (for API responses)
// ============================================================================

export async function trackBandwidth(
  managedAppId: string,
  userId: string,
  bytes: number
): Promise<void> {
  await trackUsage({
    managedAppId,
    userId,
    eventType: 'BANDWIDTH_OUT',
    bandwidthBytes: bytes,
  });
}

// ============================================================================
// Track File Upload
// ============================================================================

export async function trackFileUpload(
  managedAppId: string,
  userId: string,
  fileSizeBytes: number
): Promise<void> {
  await trackUsage({
    managedAppId,
    userId,
    eventType: 'FILE_UPLOAD',
    dbStorage: fileSizeBytes,
  });
}
