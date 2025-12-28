import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/creations/[id]
 *
 * Get detailed information about a specific creation including:
 * - Generation job details
 * - All files
 * - Published app info (if published)
 * - Managed app info (if hosted)
 * - Managed project info (if preview)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get database user by email
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const userId = dbUser.id;
    const creationId = params.id;

    // Fetch creation with all related data
    const creation = await prisma.generationJob.findFirst({
      where: {
        id: creationId,
        userId, // Verify ownership
      },
      include: {
        files: {
          select: {
            id: true,
            path: true,
            language: true,
            size: true,
          },
          orderBy: {
            path: 'asc',
          },
        },
        publishedApps: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            status: true,
            totalRevenue: true,
            totalCustomers: true,
            monthlyRecurring: true,
            pricingModel: true,
            monthlyPrice: true,
            yearlyPrice: true,
            oneTimePrice: true,
            deploymentUrl: true,
            publishedAt: true,
          },
        },
        managedApp: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            status: true,
            deploymentUrl: true,
            marketplaceViews: true,
            marketplaceInstalls: true,
            isPublicInMarketplace: true,
          },
        },
        managedProject: {
          select: {
            id: true,
            status: true,
            vercelUrl: true,
            supabaseUrl: true,
          },
        },
      },
    });

    if (!creation) {
      return NextResponse.json(
        { error: 'Creation not found' },
        { status: 404 }
      );
    }

    // Determine deployment URL (priority: managedApp > managedProject > publishedApp)
    let deploymentUrl = null;

    if (creation.managedApp?.deploymentUrl) {
      deploymentUrl = creation.managedApp.deploymentUrl;
    } else if (creation.managedProject?.vercelUrl) {
      deploymentUrl = creation.managedProject.vercelUrl;
    } else if (creation.publishedApps[0]?.deploymentUrl) {
      deploymentUrl = creation.publishedApps[0].deploymentUrl;
    }

    // Format response
    const response = {
      id: creation.id,
      prompt: creation.prompt,
      status: creation.status,
      createdAt: creation.createdAt,
      updatedAt: creation.updatedAt,
      generationMode: creation.generationMode,
      filesCount: creation.files.length,
      deploymentUrl,
      files: creation.files,
      publishedApp: creation.publishedApps[0] || null,
      managedApp: creation.managedApp || null,
      managedProject: creation.managedProject || null,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Creation detail API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creation details' },
      { status: 500 }
    );
  }
}
