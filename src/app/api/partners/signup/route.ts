/**
 * PARTNER SIGNUP API
 *
 * File: src/app/api/partners/signup/route.ts
 *
 * Enrolls users in partner program
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
    const { tier } = body;

    if (!tier || !['affiliate', 'agency', 'reseller'].includes(tier)) {
      return NextResponse.json(
        { error: 'Valid partner tier is required (affiliate, agency, reseller)' },
        { status: 400 }
      );
    }

    // 4. Check if user is already a partner
    const existingPartner = await prisma.partner.findUnique({
      where: { userId: user.id },
    });

    if (existingPartner) {
      // Upgrade tier if different
      if (existingPartner.tier !== tier.toUpperCase()) {
        await prisma.partner.update({
          where: { id: existingPartner.id },
          data: {
            tier: tier.toUpperCase(),
            updatedAt: new Date(),
          },
        });

        console.log(`✅ Partner tier upgraded: ${user.email} → ${tier}`);

        return NextResponse.json({
          success: true,
          message: `Partner tier upgraded to ${tier}`,
          partnerId: existingPartner.id,
          isUpgrade: true,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'You are already a partner',
        partnerId: existingPartner.id,
        isExisting: true,
      });
    }

    // 5. Generate unique referral code
    const referralCode = generateReferralCode(user.name || user.email || user.id);

    // 6. Create partner record
    const partner = await prisma.partner.create({
      data: {
        userId: user.id,
        tier: tier.toUpperCase(),
        referralCode,
        status: 'ACTIVE',
        commissionRate: getCommissionRate(tier),
      },
    });

    console.log(`✅ Partner created: ${user.email}`);
    console.log(`   Tier: ${tier}`);
    console.log(`   Referral code: ${referralCode}`);
    console.log(`   Commission: ${getCommissionRate(tier)}%`);

    return NextResponse.json({
      success: true,
      message: `Welcome to the ${tier} partner program!`,
      partnerId: partner.id,
      referralCode: partner.referralCode,
    });

  } catch (error) {
    console.error('Partner signup error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to join partner program',
      },
      { status: 500 }
    );
  }
}

// Helper: Get commission rate by tier
function getCommissionRate(tier: string): number {
  switch (tier) {
    case 'affiliate':
      return 20;
    case 'agency':
      return 30;
    case 'reseller':
      return 40;
    default:
      return 20;
  }
}

// Helper: Generate unique referral code
function generateReferralCode(name: string): string {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10);

  const randomSuffix = Math.random().toString(36).substring(2, 8);

  return `${cleanName}${randomSuffix}`.toUpperCase();
}
