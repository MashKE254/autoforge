/**
 * App Publishing API Route
 * * File: src/app/api/apps/publish/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';
import Stripe from 'stripe';

// Fix: Cast version to avoid TypeScript literal mismatch
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

interface PublishRequestBody {
  generationJobId: string;
  pricingModel: 'free' | 'one-time' | 'subscription';
  price: number; // In cents
  currency: string;
  name?: string;
  description?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: PublishRequestBody = await request.json();
    const { 
      generationJobId, 
      pricingModel, 
      price, 
      currency = 'usd',
      name,
      description,
    } = body;

    if (!generationJobId) {
      return NextResponse.json(
        { error: 'Generation job ID required' },
        { status: 400 }
      );
    }

    // 1. Verify job ownership and fetch relations based on YOUR SCHEMA
    const job = await prisma.generationJob.findUnique({
      where: { id: generationJobId },
      include: { 
        user: {
          include: {
            // Schema has 'connectedAccount', not 'stripeConnectAccountId'
            connectedAccount: true, 
          }
        },
        // Schema defines this as a list: publishedApps[]
        publishedApps: true, 
      },
    });

    if (!job || job.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // 2. Check if already published (Handling the 1-to-many relation)
    if (job.publishedApps.length > 0) {
      return NextResponse.json(
        { error: 'App is already published' },
        { status: 400 }
      );
    }

    // 3. Verify Stripe Connect (Using the correct relation)
    if (pricingModel !== 'free') {
      const stripeAccountId = job.user.connectedAccount?.stripeAccountId;
      
      if (!stripeAccountId) {
        return NextResponse.json(
          { error: 'Stripe Connect account required for paid apps' },
          { status: 400 }
        );
      }
      
      // Optional: Check if payouts are enabled
      if (!job.user.connectedAccount?.payoutsEnabled) {
         return NextResponse.json(
          { error: 'Your Stripe account is not fully onboarded for payouts' },
          { status: 400 }
        );
      }
    }

    // Get deployment URL
    const deployment = await prisma.deployment.findFirst({
      where: {
        generationJobId,
        status: 'READY',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Schema calls this 'deploymentUrl'
    const appUrl = deployment?.deploymentUrl;

    // Create Stripe product and price for paid apps
    let stripeProductId: string | null = null;
    let stripePriceId: string | null = null;

    if (pricingModel !== 'free' && price > 0) {
      try {
        const product = await stripe.products.create({
          name: name || job.prompt.slice(0, 50),
          description: description || `Generated app: ${job.prompt.slice(0, 100)}`,
          metadata: {
            generationJobId,
            creatorId: session.user.id,
          },
        });
        stripeProductId = product.id;

        const priceOptions: Stripe.PriceCreateParams = {
          product: product.id,
          unit_amount: price,
          currency,
        };

        if (pricingModel === 'subscription') {
          priceOptions.recurring = { interval: 'month' };
        }

        const stripePrice = await stripe.prices.create(priceOptions);
        stripePriceId = stripePrice.id;

      } catch (stripeError) {
        console.error('Stripe error:', stripeError);
        return NextResponse.json(
          { error: 'Failed to create Stripe product' },
          { status: 500 }
        );
      }
    }

    // 4. Map Pricing logic to Schema Fields
    // Schema has specific fields: monthlyPrice, oneTimePrice. It does NOT have a generic 'price' field.
    const monthlyPrice = pricingModel === 'subscription' ? price : null;
    const oneTimePrice = pricingModel === 'one-time' ? price : null;

    // Schema expects Enums for PricingModel
    let dbPricingModel: 'FREE' | 'SUBSCRIPTION' | 'ONE_TIME' = 'FREE';
    if (pricingModel === 'subscription') dbPricingModel = 'SUBSCRIPTION';
    if (pricingModel === 'one-time') dbPricingModel = 'ONE_TIME';

    // 5. Create PublishedApp
    const publishedApp = await prisma.publishedApp.create({
      data: {
        generationJobId,
        userId: session.user.id, // Schema requires this
        name: name || job.prompt.slice(0, 50),
        description: description || job.prompt,
        slug: generateSlug(name || job.prompt),
        
        pricingModel: dbPricingModel,
        
        // Map the prices to the correct schema columns
        monthlyPrice,
        oneTimePrice,
        
        // Map Stripe IDs
        stripeProductId,
        // Map the generic stripePriceId to the correct schema column
        stripePriceMonthly: pricingModel === 'subscription' ? stripePriceId : undefined,
        stripePriceOneTime: pricingModel === 'one-time' ? stripePriceId : undefined,

        deploymentUrl: appUrl,
        
        // Schema uses 'AppStatus' Enum
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      publishedApp: {
        id: publishedApp.id,
        slug: publishedApp.slug,
        pricingModel: publishedApp.pricingModel,
        // Return the active price for the frontend
        price: publishedApp.monthlyPrice || publishedApp.oneTimePrice || 0,
        appUrl: publishedApp.deploymentUrl,
      },
    });

  } catch (error) {
    console.error('Publish app error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to publish app' },
      { status: 500 }
    );
  }
}

// GET: Get published app info
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID required' },
        { status: 400 }
      );
    }

    // Use findFirst because schema has publishedApps[] (plural)
    const publishedApp = await prisma.publishedApp.findFirst({
      where: { generationJobId: jobId },
    });

    if (!publishedApp) {
      return NextResponse.json({
        published: false,
      });
    }

    return NextResponse.json({
      published: true,
      app: {
        id: publishedApp.id,
        name: publishedApp.name,
        slug: publishedApp.slug,
        pricingModel: publishedApp.pricingModel,
        // Resolve price for frontend convenience
        price: publishedApp.monthlyPrice || publishedApp.oneTimePrice || 0,
        // Schema doesn't have a currency field on PublishedApp, defaulting to USD
        currency: 'usd', 
        appUrl: publishedApp.deploymentUrl,
        isPublished: publishedApp.status === 'PUBLISHED',
        createdAt: publishedApp.createdAt,
      },
    });

  } catch (error) {
    console.error('Get published app error:', error);
    return NextResponse.json(
      { error: 'Failed to get app info' },
      { status: 500 }
    );
  }
}

// Helper function to generate URL-safe slug
function generateSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${suffix}`;
}