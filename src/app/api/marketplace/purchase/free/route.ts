/**
 * FREE APP PURCHASE API
 *
 * File: src/app/api/marketplace/purchase/free/route.ts
 *
 * Instant activation for free apps
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Please sign in to continue' },
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

    // 3. Parse request
    const body = await request.json();
    const { appId } = body;

    if (!appId) {
      return NextResponse.json(
        { error: 'App ID is required' },
        { status: 400 }
      );
    }

    // 4. Get app and verify it's free
    const app = await prisma.publishedApp.findUnique({
      where: { id: appId },
    });

    if (!app) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 404 }
      );
    }

    if (app.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'App is not available' },
        { status: 400 }
      );
    }

    if (app.pricingModel !== 'FREE') {
      return NextResponse.json(
        { error: 'This app is not free' },
        { status: 400 }
      );
    }

    // 5. Check if user already has access
    const existingSubscription = await prisma.appSubscription.findFirst({
      where: {
        userId: user.id,
        publishedAppId: app.id,
        status: 'ACTIVE',
      },
    });

    if (existingSubscription) {
      return NextResponse.json({
        success: true,
        message: 'You already have access to this app',
        subscriptionId: existingSubscription.id,
      });
    }

    // 6. Create subscription (free)
    const subscription = await prisma.appSubscription.create({
      data: {
        userId: user.id,
        publishedAppId: app.id,
        status: 'ACTIVE',
        startedAt: new Date(),
      },
    });

    // 7. Update app customer count
    await prisma.publishedApp.update({
      where: { id: app.id },
      data: {
        totalCustomers: { increment: 1 },
      },
    });

    // 8. Create transaction record
    await prisma.transaction.create({
      data: {
        userId: user.id,
        publishedAppId: app.id,
        amount: 0,
        currency: 'USD',
        type: 'SUBSCRIPTION_PAYMENT',
        status: 'SUCCEEDED',
        description: `Free access to ${app.name}`,
      },
    });

    console.log(`✅ Free app activated: ${app.name} for user ${user.email}`);

    return NextResponse.json({
      success: true,
      message: `You now have access to ${app.name}!`,
      subscriptionId: subscription.id,
    });

  } catch (error) {
    console.error('Free purchase error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to activate app',
      },
      { status: 500 }
    );
  }
}
