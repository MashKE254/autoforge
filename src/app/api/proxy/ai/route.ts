/**
 * AI Proxy Endpoint - PHASE 1: MANAGED PLATFORM
 *
 * File: src/app/api/proxy/ai/route.ts
 *
 * Purpose:
 * - Apps hosted on AutoForge call THIS instead of Anthropic directly
 * - User NEVER sees API keys - just works!
 * - We check their subscription limits and track usage
 * - We use our master Anthropic key
 *
 * Example from a generated app:
 * ```
 * const response = await fetch('https://autoforge.dev/api/proxy/ai', {
 *   method: 'POST',
 *   headers: {
 *     'X-App-ID': process.env.NEXT_PUBLIC_APP_ID,
 *     'Authorization': `Bearer ${process.env.APP_SECRET}`,
 *   },
 *   body: JSON.stringify({
 *     messages: [{ role: 'user', content: 'Hello!' }],
 *     stream: false,
 *   }),
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client with master key
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// Helper: Verify App Credentials
// ============================================================================

async function verifyAppCredentials(appId: string, apiKey: string) {
  const app = await prisma.managedApp.findUnique({
    where: { id: appId },
    include: {
      user: {
        include: {
          subscription: true,
        },
      },
    },
  });

  if (!app) {
    return { valid: false, error: 'Invalid app ID' };
  }

  if (app.apiKey !== apiKey) {
    return { valid: false, error: 'Invalid API key' };
  }

  if (app.status === 'SUSPENDED') {
    return { valid: false, error: 'App suspended due to limit exceeded' };
  }

  if (app.status === 'DELETED') {
    return { valid: false, error: 'App has been deleted' };
  }

  return { valid: true, app };
}

// ============================================================================
// Helper: Check Usage Limits
// ============================================================================

async function checkUsageLimits(managedAppId: string, userId: string) {
  // Get current month usage
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  let monthlyUsage = await prisma.monthlyUsage.findUnique({
    where: {
      userId_month_year: {
        userId,
        month,
        year,
      },
    },
  });

  // Create if doesn't exist
  if (!monthlyUsage) {
    monthlyUsage = await prisma.monthlyUsage.create({
      data: {
        userId,
        month,
        year,
        totalAiOps: 0,
        totalTokens: 0,
        totalDbStorage: 0,
        totalBandwidth: 0,
        totalApps: 0,
        aiCost: 0,
        storageCost: 0,
        bandwidthCost: 0,
        totalCost: 0,
        overageCost: 0,
      },
    });
  }

  // Get user's subscription
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user?.subscription) {
    return {
      allowed: false,
      error: 'No active subscription',
    };
  }

  // Get plan limits
  const planLimits = await prisma.planLimits.findUnique({
    where: { plan: user.subscription.tier },
  });

  if (!planLimits) {
    return {
      allowed: false,
      error: 'Plan limits not configured',
    };
  }

  // Check if exceeded AI ops limit
  if (monthlyUsage.totalAiOps >= planLimits.maxAiOps) {
    // Suspend the app
    await prisma.managedApp.update({
      where: { id: managedAppId },
      data: { status: 'SUSPENDED' },
    });

    return {
      allowed: false,
      error: `Monthly AI operations limit exceeded (${planLimits.maxAiOps}). Please upgrade your plan.`,
      usage: monthlyUsage.totalAiOps,
      limit: planLimits.maxAiOps,
    };
  }

  return {
    allowed: true,
    usage: monthlyUsage.totalAiOps,
    limit: planLimits.maxAiOps,
  };
}

// ============================================================================
// Helper: Track Usage
// ============================================================================

async function trackUsage(
  managedAppId: string,
  userId: string,
  tokensUsed: number
) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  // Record usage event
  await prisma.appUsageRecord.create({
    data: {
      managedAppId,
      eventType: 'AI_CHAT_COMPLETION',
      aiOps: 1,
      tokensUsed,
    },
  });

  // Update monthly aggregate
  await prisma.monthlyUsage.upsert({
    where: {
      userId_month_year: {
        userId,
        month,
        year,
      },
    },
    update: {
      totalAiOps: { increment: 1 },
      totalTokens: { increment: tokensUsed },
    },
    create: {
      userId,
      month,
      year,
      totalAiOps: 1,
      totalTokens: tokensUsed,
      totalDbStorage: 0,
      totalBandwidth: 0,
      totalApps: 0,
      aiCost: 0,
      storageCost: 0,
      bandwidthCost: 0,
      totalCost: 0,
      overageCost: 0,
    },
  });
}

// ============================================================================
// POST: AI Chat Completion (Non-Streaming)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Extract credentials from headers
    const appId = request.headers.get('X-App-ID');
    const authHeader = request.headers.get('Authorization');

    if (!appId || !authHeader) {
      return NextResponse.json(
        { error: 'Missing X-App-ID or Authorization header' },
        { status: 401 }
      );
    }

    const apiKey = authHeader.replace('Bearer ', '');

    // 2. Verify app credentials
    const verification = await verifyAppCredentials(appId, apiKey);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error },
        { status: 401 }
      );
    }

    const { app } = verification;
    if (!app) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 401 }
      );
    }

    // 3. Check usage limits
    const limitCheck = await checkUsageLimits(app.id, app.userId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: limitCheck.error,
          usage: limitCheck.usage,
          limit: limitCheck.limit,
        },
        { status: 429 }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const { messages, model = 'claude-3-5-sonnet-20241022', max_tokens = 4096, stream = false } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      );
    }

    // 5. Handle streaming vs non-streaming
    if (stream) {
      // Streaming response
      const stream = await anthropic.messages.stream({
        model,
        max_tokens,
        messages,
      });

      // Convert to ReadableStream
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const data = JSON.stringify(chunk);
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }

            // Track usage after streaming completes
            const finalMessage = await stream.finalMessage();
            const tokensUsed = finalMessage.usage.input_tokens + finalMessage.usage.output_tokens;
            await trackUsage(app.id, app.userId, tokensUsed);

            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming response
      const response = await anthropic.messages.create({
        model,
        max_tokens,
        messages,
      });

      // Track usage
      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
      await trackUsage(app.id, app.userId, tokensUsed);

      // Return response with usage info
      return NextResponse.json({
        ...response,
        usage_info: {
          tokens_used: tokensUsed,
          monthly_usage: limitCheck.usage! + 1,
          monthly_limit: limitCheck.limit!,
          remaining: limitCheck.limit! - (limitCheck.usage! + 1),
        },
      });
    }

  } catch (error) {
    console.error('AI Proxy error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'AI request failed',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET: Check Usage and Limits
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const appId = request.headers.get('X-App-ID');
    const authHeader = request.headers.get('Authorization');

    if (!appId || !authHeader) {
      return NextResponse.json(
        { error: 'Missing credentials' },
        { status: 401 }
      );
    }

    const apiKey = authHeader.replace('Bearer ', '');

    // Verify credentials
    const verification = await verifyAppCredentials(appId, apiKey);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error },
        { status: 401 }
      );
    }

    const { app } = verification;
    if (!app) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 401 }
      );
    }

    // Get current usage
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const monthlyUsage = await prisma.monthlyUsage.findUnique({
      where: {
        userId_month_year: {
          userId: app.userId,
          month,
          year,
        },
      },
    });

    // Get plan limits
    const user = await prisma.user.findUnique({
      where: { id: app.userId },
      include: { subscription: true },
    });

    const planLimits = user?.subscription
      ? await prisma.planLimits.findUnique({
          where: { plan: user.subscription.tier },
        })
      : null;

    return NextResponse.json({
      app: {
        id: app.id,
        name: app.name,
        status: app.status,
      },
      usage: {
        aiOps: monthlyUsage?.totalAiOps || 0,
        tokens: monthlyUsage?.totalTokens || 0,
        dbStorage: monthlyUsage?.totalDbStorage || 0,
        bandwidth: monthlyUsage?.totalBandwidth || 0,
      },
      limits: planLimits
        ? {
            maxAiOps: planLimits.maxAiOps,
            maxDbStorage: planLimits.maxDbStorage,
            maxBandwidth: planLimits.maxBandwidth,
          }
        : null,
      remaining: planLimits
        ? {
            aiOps: Math.max(0, planLimits.maxAiOps - (monthlyUsage?.totalAiOps || 0)),
          }
        : null,
    });
  } catch (error) {
    console.error('Usage check error:', error);
    return NextResponse.json(
      { error: 'Failed to check usage' },
      { status: 500 }
    );
  }
}
