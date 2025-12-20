/**
 * Personal Tool → SaaS Upgrade API Route
 *
 * File: src/app/api/generate/upgrade/route.ts
 *
 * Transforms a personal tool into a full SaaS application with:
 * - Clerk authentication
 * - Supabase multi-tenant database
 * - Stripe subscriptions
 * - Landing page & pricing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { saasUpgradeGenerator } from '@/lib/generation/saas-upgrade-generator';

// ============================================================================
// POST: Upgrade a personal tool to SaaS
// ============================================================================

export async function POST(request: NextRequest) {
  let saasJobId: string | null = null;

  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
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
    const { personalJobId } = body;

    if (!personalJobId || typeof personalJobId !== 'string') {
      return NextResponse.json(
        { error: 'Valid personalJobId is required' },
        { status: 400 }
      );
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`💰 SAAS UPGRADE REQUESTED`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   User: ${user.email} (${user.id})`);
    console.log(`   Personal Job ID: ${personalJobId}`);

    // 4. Verify personal tool exists and user owns it
    const personalJob = await prisma.generationJob.findUnique({
      where: {
        id: personalJobId,
        userId: user.id,
      },
      include: {
        files: true,
      },
    });

    if (!personalJob) {
      return NextResponse.json(
        { error: 'Personal tool not found or you do not have access' },
        { status: 404 }
      );
    }

    if (personalJob.generationMode !== 'PERSONAL') {
      return NextResponse.json(
        { error: `This job is not a personal tool (mode: ${personalJob.generationMode})` },
        { status: 400 }
      );
    }

    if (personalJob.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Personal tool generation must be completed before upgrading' },
        { status: 400 }
      );
    }

    console.log(`   ✓ Personal tool verified`);
    console.log(`   ✓ Files: ${personalJob.files.length}`);
    console.log(`   ✓ Original prompt: "${personalJob.prompt.slice(0, 100)}..."`);

    // 5. Check if already upgraded
    const existingUpgrade = await prisma.generationJob.findFirst({
      where: {
        parentJobId: personalJobId,
        generationMode: 'SAAS_UPGRADE',
      },
    });

    if (existingUpgrade) {
      console.log(`   ⚠️  Already upgraded: ${existingUpgrade.id}`);
      return NextResponse.json({
        success: true,
        saasJobId: existingUpgrade.id,
        message: 'This personal tool has already been upgraded to SaaS',
        isExisting: true,
      });
    }

    // 6. Create SaaS upgrade job
    const saasJob = await prisma.generationJob.create({
      data: {
        userId: user.id,
        prompt: `Upgrade to SaaS: ${personalJob.prompt}`,
        status: 'RUNNING',
        generationMode: 'SAAS_UPGRADE',
        parentJobId: personalJobId,
        generationStartedAt: new Date(),
      },
    });

    saasJobId = saasJob.id;
    console.log(`   ✓ SaaS job created: ${saasJobId}`);
    console.log(`${'='.repeat(80)}\n`);

    // 7. Perform upgrade using SaaSUpgradeGenerator
    console.log(`🚀 Starting SaaS upgrade...`);

    const result = await saasUpgradeGenerator.upgradeTool(
      personalJobId,
      {
        onProgress: (message) => {
          console.log(`   📝 ${message}`);
        },
        onError: (error) => {
          console.error(`   ❌ ${error}`);
        },
      }
    );

    if (!result.success || !result.files || result.files.length === 0) {
      throw new Error(result.error || 'No files were generated during upgrade');
    }

    console.log(`\n✅ SaaS Upgrade Complete`);
    console.log(`   Files Generated: ${result.files.length}`);

    // 8. Save upgraded files to database
    for (const file of result.files) {
      await prisma.generatedFile.create({
        data: {
          generationJobId: saasJob.id,
          path: file.path,
          content: file.content,
          language: file.language || 'typescript',
          size: file.content.length,
        },
      });
    }

    // 9. Update job status
    await prisma.generationJob.update({
      where: { id: saasJob.id },
      data: {
        status: 'COMPLETED',
        generationCompletedAt: new Date(),
        filesJson: JSON.stringify(result.files),
        completedModules: result.files.length,
        totalModules: result.files.length,
      },
    });

    console.log(`\n${'='.repeat(80)}`);
    console.log(`💰 SAAS UPGRADE SUCCESS`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   Personal Job: ${personalJobId}`);
    console.log(`   SaaS Job: ${saasJobId}`);
    console.log(`   Files: ${result.files.length}`);
    console.log(`   Tokens Used: ${result.tokensUsed || 'N/A'}`);
    console.log(`${'='.repeat(80)}\n`);

    // 10. Return success
    return NextResponse.json({
      success: true,
      saasJobId: saasJob.id,
      personalJobId,
      fileCount: result.files.length,
      message: `Successfully upgraded personal tool to SaaS with ${result.files.length} files`,
      tokensUsed: result.tokensUsed,
    });

  } catch (error) {
    console.error('\n❌ SAAS UPGRADE ERROR:', error);

    if (saasJobId) {
      try {
        await prisma.generationJob.update({
          where: { id: saasJobId },
          data: {
            status: 'FAILED',
            errorLog: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (dbError) {
        console.error('Failed to update SaaS job status:', dbError);
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'SaaS upgrade failed',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
