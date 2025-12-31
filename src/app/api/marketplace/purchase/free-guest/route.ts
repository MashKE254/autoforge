/**
 * FREE APP GUEST ACTIVATION API
 *
 * File: src/app/api/marketplace/purchase/free-guest/route.ts
 *
 * Handles free app activation for guests (no account required):
 * 1. Collect email
 * 2. Create CUSTOMER account (auto)
 * 3. Activate app
 * 4. Send magic link email
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateMagicLink } from '@/lib/auth/magic-link';
import { sendMagicLinkEmail } from '@/lib/email/magic-link';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse request
    const body = await request.json();
    const { appId, email } = body;

    if (!appId || !email) {
      return NextResponse.json(
        { error: 'App ID and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Get app and verify it's free
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

    // 3. Find or create user (CUSTOMER role)
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    let isNewUser = false;

    if (!user) {
      // Auto-create CUSTOMER account
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: normalizedEmail.split('@')[0], // Use email prefix as name
          role: 'CUSTOMER', // Not a creator, just a customer
          // No password - they use magic links
        },
      });

      isNewUser = true;
      console.log(`✅ Auto-created CUSTOMER account: ${normalizedEmail}`);
    }

    // 4. Check if user already has access
    const existingSubscription = await prisma.appSubscription.findFirst({
      where: {
        userId: user.id,
        publishedAppId: app.id,
        status: 'ACTIVE',
      },
    });

    if (existingSubscription) {
      // User already has access - just send magic link
      const magicLink = await generateMagicLink(user.id);

      await sendMagicLinkEmail({
        to: normalizedEmail,
        appName: app.name,
        magicLink,
        isReturning: true,
      });

      return NextResponse.json({
        success: true,
        message: 'You already have access! Check your email for login link.',
        isExisting: true,
      });
    }

    // 5. Create subscription (free)
    const subscription = await prisma.appSubscription.create({
      data: {
        userId: user.id,
        publishedAppId: app.id,
        status: 'ACTIVE',
        startedAt: new Date(),
      },
    });

    // 6. Update app customer count
    await prisma.publishedApp.update({
      where: { id: app.id },
      data: {
        totalCustomers: { increment: 1 },
      },
    });

    // 7. Create transaction record
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

    // 8. Generate magic link for instant access
    const magicLink = await generateMagicLink(user.id);

    // 9. Send magic link email
    await sendMagicLinkEmail({
      to: normalizedEmail,
      appName: app.name,
      magicLink,
      isNewUser,
    });

    console.log(`✅ Free app activated for guest: ${app.name} → ${normalizedEmail}`);
    console.log(`   New user: ${isNewUser}`);
    console.log(`   Magic link sent`);

    return NextResponse.json({
      success: true,
      message: `Check your email! We sent you a link to access ${app.name}`,
      subscriptionId: subscription.id,
      isNewUser,
    });

  } catch (error) {
    console.error('Guest free activation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to activate app',
      },
      { status: 500 }
    );
  }
}
