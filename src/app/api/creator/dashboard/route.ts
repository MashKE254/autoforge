import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/creator/dashboard
 *
 * Unified API endpoint for the creator dashboard that aggregates:
 * - Overview metrics (total apps, revenue, customers)
 * - All creations (generated, managed, published)
 * - Recent activity
 * - Quick stats for dashboard cards
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get database user by email (same pattern as other APIs)
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

    // Fetch all data in parallel for better performance
    const [
      generationJobs,
      publishedApps,
      managedApps,
      managedProjects,
      recentTransactions,
      subscription,
    ] = await Promise.all([
      // All generation jobs
      prisma.generationJob.findMany({
        where: { userId },
        include: {
          files: {
            select: { id: true }
          },
          managedProject: {
            select: {
              id: true,
              status: true,
              vercelUrl: true,
            }
          },
          managedApp: {
            select: {
              id: true,
              status: true,
              deploymentUrl: true,
              subdomain: true,
            }
          },
          publishedApps: {
            select: {
              id: true,
              status: true,
              slug: true,
            }
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),

      // Published apps with analytics
      prisma.publishedApp.findMany({
        where: { userId },
        include: {
          generationJob: {
            select: {
              id: true,
              prompt: true,
              status: true,
            }
          },
          _count: {
            select: {
              customers: true,
              transactions: true,
            }
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Managed apps with usage stats
      prisma.managedApp.findMany({
        where: { userId },
        include: {
          generationJob: {
            select: {
              id: true,
              prompt: true,
              status: true,
            }
          },
          _count: {
            select: {
              usageRecords: true,
            }
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Managed projects (preview infrastructure)
      prisma.managedProject.findMany({
        where: { userId },
        include: {
          generationJob: {
            select: {
              id: true,
              prompt: true,
              status: true,
            }
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // Recent transactions for activity feed
      prisma.transaction.findMany({
        where: {
          publishedApp: {
            userId,
          }
        },
        include: {
          publishedApp: {
            select: {
              name: true,
              slug: true,
            }
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // User subscription info
      prisma.creatorSubscription.findUnique({
        where: { userId },
        select: {
          plan: true,
          status: true,
          currentPeriodEnd: true,
        }
      }),
    ]);

    // Calculate overview metrics
    const totalRevenue = publishedApps.reduce((sum, app) => sum + app.totalRevenue, 0);
    const totalCustomers = publishedApps.reduce((sum, app) => sum + app.totalCustomers, 0);
    const monthlyRecurring = publishedApps.reduce((sum, app) => sum + app.monthlyRecurring, 0);

    const publishedCount = publishedApps.filter(app => app.status === 'PUBLISHED').length;
    const draftCount = publishedApps.filter(app => app.status === 'DRAFT').length;

    const activeApps = managedApps.filter(app => app.status === 'ACTIVE').length;
    const totalApps = generationJobs.length;
    const completedApps = generationJobs.filter(job => job.status === 'COMPLETED').length;

    // Calculate recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRevenue = recentTransactions
      .filter(t => t.createdAt >= thirtyDaysAgo)
      .reduce((sum, t) => sum + t.netAmount, 0);

    const recentCustomers = publishedApps
      .filter(app => app.createdAt >= thirtyDaysAgo)
      .reduce((sum, app) => sum + app.totalCustomers, 0);

    // Format creations with all deployment info
    const creations = generationJobs.map(job => {
      const publishedApp = publishedApps.find(app => app.generationJobId === job.id);
      const managedApp = managedApps.find(app => app.generationJobId === job.id);
      const managedProject = managedProjects.find(proj => proj.generationJobId === job.id);

      // Determine primary deployment URL
      let deploymentUrl = null;
      let deploymentType = null;

      if (managedApp?.deploymentUrl) {
        deploymentUrl = managedApp.deploymentUrl;
        deploymentType = 'managed';
      } else if (managedProject?.vercelUrl) {
        deploymentUrl = managedProject.vercelUrl;
        deploymentType = 'preview';
      } else if (publishedApp?.deploymentUrl) {
        deploymentUrl = publishedApp.deploymentUrl;
        deploymentType = 'published';
      }

      // Determine overall status
      let overallStatus = job.status;
      if (job.status === 'COMPLETED') {
        if (publishedApp?.status === 'PUBLISHED') {
          overallStatus = 'PUBLISHED';
        } else if (managedApp?.status === 'ACTIVE') {
          overallStatus = 'LIVE';
        } else if (managedProject?.status === 'DEPLOYED') {
          overallStatus = 'PREVIEW';
        }
      }

      return {
        id: job.id,
        prompt: job.prompt,
        status: overallStatus,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        generationMode: job.generationMode,
        filesCount: job.files.length,

        // Deployment info
        deploymentUrl,
        deploymentType,

        // Published app info
        publishedApp: publishedApp ? {
          id: publishedApp.id,
          name: publishedApp.name,
          slug: publishedApp.slug,
          status: publishedApp.status,
          totalRevenue: publishedApp.totalRevenue,
          totalCustomers: publishedApp.totalCustomers,
          monthlyRecurring: publishedApp.monthlyRecurring,
          pricingModel: publishedApp.pricingModel,
        } : null,

        // Managed app info
        managedApp: managedApp ? {
          id: managedApp.id,
          name: managedApp.name,
          subdomain: managedApp.subdomain,
          status: managedApp.status,
          deploymentUrl: managedApp.deploymentUrl,
          marketplaceViews: managedApp.marketplaceViews,
          marketplaceInstalls: managedApp.marketplaceInstalls,
        } : null,

        // Managed project info (preview)
        managedProject: managedProject ? {
          id: managedProject.id,
          status: managedProject.status,
          vercelUrl: managedProject.vercelUrl,
        } : null,
      };
    });

    // Format recent activity
    const recentActivity = recentTransactions.map(txn => ({
      id: txn.id,
      type: 'transaction',
      description: `${txn.type} for ${txn.publishedApp.name}`,
      amount: txn.netAmount,
      createdAt: txn.createdAt,
      appName: txn.publishedApp.name,
      appSlug: txn.publishedApp.slug,
    }));

    // Get plan limits
    const planName = subscription?.plan || 'FREE';
    const planLimits = getPlanLimits(planName);

    // Response structure
    const dashboardData = {
      // Overview metrics
      overview: {
        totalRevenue,
        totalCustomers,
        monthlyRecurring,
        totalApps,
        completedApps,
        publishedCount,
        draftCount,
        activeApps,
        recentRevenue,
        recentCustomers,
      },

      // All creations with full deployment info
      creations,

      // Recent activity feed
      recentActivity,

      // Subscription info
      subscription: {
        plan: planName,
        status: subscription?.status || 'NONE',
        currentPeriodEnd: subscription?.currentPeriodEnd,
        limits: planLimits,
        usage: {
          publishedApps: publishedCount,
          maxPublishedApps: planLimits.maxPublishedApps,
        },
      },

      // Quick stats
      stats: {
        totalJobs: totalApps,
        completedJobs: completedApps,
        publishedApps: publishedCount,
        activeApps,
        totalRevenue,
        totalCustomers,
      },
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

// Helper function to get plan limits
function getPlanLimits(plan: string) {
  const limits: Record<string, any> = {
    FREE: {
      maxPublishedApps: 1,
      platformFeePercent: 10,
      features: ['Basic analytics', 'Community support'],
    },
    STARTER: {
      maxPublishedApps: 5,
      platformFeePercent: 8,
      features: ['Advanced analytics', 'Email support', 'Custom domains'],
    },
    PRO: {
      maxPublishedApps: 20,
      platformFeePercent: 6,
      features: ['Priority support', 'White-label options', 'Advanced integrations'],
    },
    BUSINESS: {
      maxPublishedApps: -1, // Unlimited
      platformFeePercent: 4,
      features: ['Dedicated support', 'Enterprise SLA', 'Custom contracts'],
    },
  };

  return limits[plan] || limits.FREE;
}
