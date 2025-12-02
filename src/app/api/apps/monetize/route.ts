/**
 * App Monetization API
 * 
 * File: src/app/api/apps/monetize/route.ts
 * 
 * Handles publishing an app with pricing:
 * - Creates Stripe product/prices on creator's connected account
 * - Updates app with pricing configuration
 * - Generates paywall code to inject into the app
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { createAppStripeProduct } from '@/lib/stripe/connect';
import { canPublishMoreApps } from '@/lib/stripe/plans';
import { PlanTier, PricingModel } from '@prisma/client';

// =============================================================================
// POST: Monetize an app
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request
    const body = await request.json();
    const {
      generationJobId,
      name,
      slug,
      description,
      pricingModel,
      monthlyPrice,  // In dollars
      yearlyPrice,   // In dollars
      oneTimePrice,  // In dollars
      trialDays = 0,
    } = body as {
      generationJobId: string;
      name: string;
      slug: string;
      description?: string;
      pricingModel: PricingModel;
      monthlyPrice?: number;
      yearlyPrice?: number;
      oneTimePrice?: number;
      trialDays?: number;
    };

    // 3. Validate required fields
    if (!generationJobId || !name || !slug) {
      return NextResponse.json(
        { error: 'Missing required fields: generationJobId, name, slug' },
        { status: 400 }
      );
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Check slug availability
    const existingSlug = await prisma.publishedApp.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: 'This slug is already taken' },
        { status: 400 }
      );
    }

    // 4. Get user with subscription and Connect account
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        subscription: true,
        connectedAccount: true,
        publishedApps: { select: { id: true } },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 5. Check subscription status
    if (user.subscription?.status !== 'ACTIVE' && user.subscription?.status !== 'TRIALING') {
      return NextResponse.json(
        { error: 'Active subscription required to publish apps' },
        { status: 403 }
      );
    }

    // 6. Check app limit
    const userPlan = user.subscription?.plan || 'STARTER';
    if (!canPublishMoreApps(userPlan as PlanTier, user.publishedApps.length)) {
      return NextResponse.json(
        { error: 'You have reached your app limit. Upgrade to publish more apps.' },
        { status: 403 }
      );
    }

    // 7. Check Connect account (required for paid apps)
    if (pricingModel !== 'FREE') {
      if (!user.connectedAccount?.stripeAccountId) {
        return NextResponse.json(
          { error: 'Please connect your Stripe account first' },
          { status: 400 }
        );
      }

      if (!user.connectedAccount.chargesEnabled) {
        return NextResponse.json(
          { error: 'Please complete Stripe onboarding to accept payments' },
          { status: 400 }
        );
      }
    }

    // 8. Verify generation job exists and belongs to user
    const job = await prisma.generationJob.findFirst({
      where: {
        id: generationJobId,
        userId: session.user.id,
        status: 'COMPLETED',
      },
      include: {
        deployments: {
          where: { status: 'READY' },
          take: 1,
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Generation job not found or not completed' },
        { status: 404 }
      );
    }

    // 9. Create published app record
    const publishedApp = await prisma.publishedApp.create({
      data: {
        userId: session.user.id,
        generationJobId,
        name,
        slug,
        description,
        pricingModel,
        monthlyPrice: monthlyPrice ? Math.round(monthlyPrice * 100) : null,
        yearlyPrice: yearlyPrice ? Math.round(yearlyPrice * 100) : null,
        oneTimePrice: oneTimePrice ? Math.round(oneTimePrice * 100) : null,
        trialDays,
        deploymentUrl: job.deployments[0]?.deploymentUrl,
        vercelProjectId: job.deployments[0]?.vercelProjectId,
        status: 'DRAFT',
      },
    });

    // 10. Create Stripe product/prices (for paid apps)
    let stripeIds = {};

    if (pricingModel !== 'FREE' && user.connectedAccount?.stripeAccountId) {
      try {
        stripeIds = await createAppStripeProduct({
          publishedAppId: publishedApp.id,
          name,
          description,
          monthlyPrice: monthlyPrice ? Math.round(monthlyPrice * 100) : undefined,
          yearlyPrice: yearlyPrice ? Math.round(yearlyPrice * 100) : undefined,
          oneTimePrice: oneTimePrice ? Math.round(oneTimePrice * 100) : undefined,
          connectedAccountId: user.connectedAccount.stripeAccountId,
        });
      } catch (stripeError) {
        console.error('Stripe product creation failed:', stripeError);
        
        // Delete the app record since Stripe failed
        await prisma.publishedApp.delete({
          where: { id: publishedApp.id },
        });

        return NextResponse.json(
          { error: 'Failed to create Stripe product. Please try again.' },
          { status: 500 }
        );
      }
    }

    // 11. Update status to pending review (or auto-publish for now)
    await prisma.publishedApp.update({
      where: { id: publishedApp.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    // 12. Return success
    return NextResponse.json({
      success: true,
      app: {
        id: publishedApp.id,
        name,
        slug,
        url: `https://${slug}.autoforge.app`,
        pricingModel,
        status: 'PUBLISHED',
        ...stripeIds,
      },
      message: 'App published successfully!',
    });

  } catch (error) {
    console.error('Monetize error:', error);
    return NextResponse.json(
      { error: 'Failed to publish app' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET: Get user's published apps
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const apps = await prisma.publishedApp.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { customers: true, transactions: true },
        },
      },
    });

    return NextResponse.json({
      apps: apps.map(app => ({
        id: app.id,
        name: app.name,
        slug: app.slug,
        url: `https://${app.slug}.autoforge.app`,
        status: app.status,
        pricingModel: app.pricingModel,
        monthlyPrice: app.monthlyPrice ? app.monthlyPrice / 100 : null,
        totalRevenue: app.totalRevenue / 100,
        totalCustomers: app._count.customers,
        totalTransactions: app._count.transactions,
        createdAt: app.createdAt,
        publishedAt: app.publishedAt,
      })),
    });

  } catch (error) {
    console.error('Get apps error:', error);
    return NextResponse.json(
      { error: 'Failed to get apps' },
      { status: 500 }
    );
  }
}
