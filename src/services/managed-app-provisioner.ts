/**
 * Managed App Provisioner - END-TO-END ORCHESTRATION
 *
 * File: src/services/managed-app-provisioner.ts
 *
 * Purpose:
 * - Orchestrate COMPLETE end-to-end app provisioning
 * - User says "Build me a CRM" → Working app at my-crm.autoforge.app
 * - NO configuration, NO API keys, NO deployment hassle
 *
 * What This Does:
 * 1. Generate code (existing generators)
 * 2. Transform code for managed mode (replace API keys with proxy)
 * 3. Provision database schema (multi-tenant)
 * 4. Create app credentials (API key, secret)
 * 5. Deploy to Vercel
 * 6. Configure subdomain
 * 7. Return live URL to user
 *
 * User Journey:
 * - User: "Build me a CRM"
 * - AutoForge: [30 seconds later] "Your app is live at my-crm.autoforge.app" ✅
 */

import { prisma } from '@/lib/prisma';
import { provisionDatabaseForApp } from './database-provisioning';
import { deployToVercel } from './deployment-service';
import { transformAllFilesForManaged } from './managed-code-transformer';
import type { GeneratedFile } from './managed-code-transformer';
import crypto from 'crypto';

export interface ProvisionManagedAppOptions {
  userId: string;
  generationJobId: string;
  appName: string;
  subdomain: string;
  files: GeneratedFile[];
}

export interface ProvisionManagedAppResult {
  success: boolean;
  managedApp?: {
    id: string;
    name: string;
    subdomain: string;
    deploymentUrl: string;
    status: string;
  };
  error?: string;
  details?: {
    databaseProvisioned: boolean;
    codeTransformed: boolean;
    deployed: boolean;
  };
}

// ============================================================================
// Main Orchestration: Provision Managed App
// ============================================================================

export async function provisionManagedApp(
  options: ProvisionManagedAppOptions
): Promise<ProvisionManagedAppResult> {
  const { userId, generationJobId, appName, subdomain, files } = options;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 PROVISIONING MANAGED APP - END-TO-END`);
  console.log(`${'='.repeat(80)}`);
  console.log(`   User: ${userId}`);
  console.log(`   Job: ${generationJobId}`);
  console.log(`   App Name: ${appName}`);
  console.log(`   Subdomain: ${subdomain}.autoforge.app`);
  console.log(`   Files: ${files.length}`);
  console.log(`${'='.repeat(80)}\n`);

  const details = {
    databaseProvisioned: false,
    codeTransformed: false,
    deployed: false,
  };

  try {
    // STEP 1: Create ManagedApp record
    console.log(`📝 Step 1/6: Creating managed app record...`);

    const appId = generateAppId();
    const apiKey = generateSecureKey(32);
    const appSecret = generateSecureKey(48);

    const managedApp = await prisma.managedApp.create({
      data: {
        id: appId,
        userId,
        generationJobId,
        name: appName,
        subdomain,
        apiKey,
        appSecret,
        schemaName: '', // Will be set in step 2
        databaseConnectionString: '', // Will be set in step 2
        status: 'PROVISIONING',
      },
    });

    console.log(`   ✅ Managed app created: ${managedApp.id}`);

    // STEP 2: Provision database schema
    console.log(`\n📦 Step 2/6: Provisioning database schema...`);

    const dbResult = await provisionDatabaseForApp(appId, appName);

    if (!dbResult.success) {
      throw new Error(`Database provisioning failed: ${dbResult.error}`);
    }

    details.databaseProvisioned = true;

    // Update app with database info
    await prisma.managedApp.update({
      where: { id: appId },
      data: {
        schemaName: dbResult.schemaName!,
        databaseConnectionString: dbResult.connectionString!,
      },
    });

    console.log(`   ✅ Database provisioned: ${dbResult.schemaName}`);

    // STEP 3: Transform code for managed mode
    console.log(`\n🔄 Step 3/6: Transforming code for managed platform...`);

    const transformedFiles = transformAllFilesForManaged(
      files,
      appId,
      appSecret
    );

    details.codeTransformed = true;

    console.log(`   ✅ Code transformed (${transformedFiles.length} files)`);

    // STEP 4: Initialize plan limits if not exist
    console.log(`\n📊 Step 4/6: Checking plan limits...`);

    await ensurePlanLimitsExist();

    console.log(`   ✅ Plan limits configured`);

    // STEP 5: Deploy to Vercel
    console.log(`\n🚀 Step 5/6: Deploying to Vercel...`);

    const deploymentResult = await deployToVercel({
      appId,
      appName,
      subdomain,
      files: transformedFiles,
      databaseConnectionString: dbResult.connectionString!,
      apiKey,
      appSecret,
    });

    if (!deploymentResult.success) {
      throw new Error(`Deployment failed: ${deploymentResult.error}`);
    }

    details.deployed = true;

    // Update app with deployment info
    await prisma.managedApp.update({
      where: { id: appId },
      data: {
        vercelProjectId: deploymentResult.vercelProjectId,
        vercelDeploymentId: deploymentResult.vercelDeploymentId,
        deploymentUrl: deploymentResult.deploymentUrl,
        status: 'ACTIVE',
        publishedAt: new Date(),
      },
    });

    console.log(`   ✅ Deployed: ${deploymentResult.deploymentUrl}`);

    // STEP 6: Initialize usage tracking
    console.log(`\n📈 Step 6/6: Initializing usage tracking...`);

    const now = new Date();
    await prisma.monthlyUsage.upsert({
      where: {
        userId_month_year: {
          userId,
          month: now.getMonth(),
          year: now.getFullYear(),
        },
      },
      create: {
        userId,
        month: now.getMonth(),
        year: now.getFullYear(),
        totalAiOps: 0,
        totalTokens: 0,
        totalDbStorage: 0,
        totalBandwidth: 0,
        totalApps: 1,
        aiCost: 0,
        storageCost: 0,
        bandwidthCost: 0,
        totalCost: 0,
        overageCost: 0,
      },
      update: {
        totalApps: { increment: 1 },
      },
    });

    console.log(`   ✅ Usage tracking initialized`);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ PROVISIONING COMPLETE!`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   🎉 App is live at: ${deploymentResult.deploymentUrl}`);
    console.log(`   🔗 Subdomain: ${subdomain}.autoforge.app`);
    console.log(`   📦 Database: ${dbResult.schemaName}`);
    console.log(`   🆔 App ID: ${appId}`);
    console.log(`${'='.repeat(80)}\n`);

    return {
      success: true,
      managedApp: {
        id: managedApp.id,
        name: managedApp.name,
        subdomain: `${subdomain}.autoforge.app`,
        deploymentUrl: deploymentResult.deploymentUrl!,
        status: 'ACTIVE',
      },
      details,
    };
  } catch (error) {
    console.error(`\n❌ PROVISIONING FAILED:`, error);

    // Update app status to DELETED on failure
    try {
      const app = await prisma.managedApp.findFirst({
        where: { generationJobId },
      });

      if (app) {
        await prisma.managedApp.update({
          where: { id: app.id },
          data: { status: 'DELETED' },
        });
      }
    } catch (cleanupError) {
      console.error('Failed to update app status:', cleanupError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details,
    };
  }
}

// ============================================================================
// Generate Unique App ID
// ============================================================================

function generateAppId(): string {
  // Generate a shorter, URL-friendly ID
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(8).toString('hex');
  return `app_${timestamp}_${randomPart}`;
}

// ============================================================================
// Generate Secure Keys
// ============================================================================

function generateSecureKey(length: number): string {
  return crypto.randomBytes(length).toString('base64url');
}

// ============================================================================
// Ensure Plan Limits Exist
// ============================================================================

async function ensurePlanLimitsExist(): Promise<void> {
  // Create default plan limits if they don't exist

  // STARTER tier
  await prisma.planLimits.upsert({
    where: { plan: 'STARTER' },
    create: {
      plan: 'STARTER',
      maxApps: 3,
      maxAiOps: 5000,
      maxDbStorage: 100, // MB
      maxBandwidth: 10, // GB
      overageAiOps: 0.01, // $0.01 per 1000 extra ops
      overageStorage: 0.25, // $0.25 per GB extra
      overageBandwidth: 0.10, // $0.10 per GB extra
      customDomain: false,
      prioritySupport: false,
    },
    update: {},
  });

  // PRO tier
  await prisma.planLimits.upsert({
    where: { plan: 'PRO' },
    create: {
      plan: 'PRO',
      maxApps: 10,
      maxAiOps: 20000,
      maxDbStorage: 1000, // 1 GB
      maxBandwidth: 50, // GB
      overageAiOps: 0.008, // $0.008 per 1000 extra ops
      overageStorage: 0.20, // $0.20 per GB extra
      overageBandwidth: 0.08, // $0.08 per GB extra
      customDomain: true,
      prioritySupport: true,
    },
    update: {},
  });

  // ENTERPRISE tier
  await prisma.planLimits.upsert({
    where: { plan: 'ENTERPRISE' },
    create: {
      plan: 'ENTERPRISE',
      maxApps: 50,
      maxAiOps: 100000,
      maxDbStorage: 10000, // 10 GB
      maxBandwidth: 500, // GB
      overageAiOps: 0.005, // $0.005 per 1000 extra ops
      overageStorage: 0.15, // $0.15 per GB extra
      overageBandwidth: 0.05, // $0.05 per GB extra
      customDomain: true,
      prioritySupport: true,
    },
    update: {},
  });
}

// ============================================================================
// Get Managed App Details
// ============================================================================

export async function getManagedAppDetails(appId: string) {
  const app = await prisma.managedApp.findUnique({
    where: { id: appId },
    include: {
      user: {
        include: {
          subscription: true,
        },
      },
      usageRecords: {
        orderBy: { createdAt: 'desc' },
        take: 100,
      },
    },
  });

  if (!app) {
    return null;
  }

  // Get current month usage
  const now = new Date();
  const monthlyUsage = await prisma.monthlyUsage.findUnique({
    where: {
      userId_month_year: {
        userId: app.userId,
        month: now.getMonth(),
        year: now.getFullYear(),
      },
    },
  });

  // Get plan limits
  const planLimits = app.user.subscription
    ? await prisma.planLimits.findUnique({
        where: { plan: app.user.subscription.tier },
      })
    : null;

  return {
    app,
    usage: monthlyUsage,
    limits: planLimits,
  };
}

// ============================================================================
// List User's Managed Apps
// ============================================================================

export async function listUserManagedApps(userId: string) {
  const apps = await prisma.managedApp.findMany({
    where: {
      userId,
      status: { not: 'DELETED' },
    },
    orderBy: { createdAt: 'desc' },
  });

  return apps;
}

// ============================================================================
// Delete Managed App
// ============================================================================

export async function deleteManagedApp(appId: string) {
  const app = await prisma.managedApp.findUnique({
    where: { id: appId },
  });

  if (!app) {
    return { success: false, error: 'App not found' };
  }

  // Mark as deleted
  await prisma.managedApp.update({
    where: { id: appId },
    data: { status: 'DELETED' },
  });

  // Actual cleanup (database schema, deployment) can be done async
  // For now, just mark as deleted

  return { success: true };
}
