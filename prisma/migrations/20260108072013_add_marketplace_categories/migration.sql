/*
  Warnings:

  - A unique constraint covering the columns `[stripeCustomerId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CREATOR', 'CUSTOMER', 'PARTNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'UNPAID', 'PAUSED');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('FREE', 'SUBSCRIPTION', 'ONE_TIME', 'FREEMIUM');

-- CreateEnum
CREATE TYPE "AppStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AppCustomerStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PartnerTier" AS ENUM ('AFFILIATE', 'AGENCY', 'RESELLER');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SUBSCRIPTION_PAYMENT', 'ONE_TIME_PAYMENT', 'REFUND', 'CHARGEBACK');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'PAID', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ManagedProjectStatus" AS ENUM ('PROVISIONING', 'DATABASE_READY', 'AUTH_READY', 'PAYMENTS_READY', 'PREVIEW_READY', 'DEPLOYED', 'UPGRADING', 'ERROR', 'EXPIRED', 'DELETED');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('PENDING', 'BUILDING', 'READY', 'ERROR', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GenerationMode" AS ENUM ('PREVIEW', 'PERSONAL', 'SINGLE_USER', 'SAAS', 'SAAS_UPGRADE');

-- CreateEnum
CREATE TYPE "CleanupType" AS ENUM ('SUPABASE_PROJECT', 'CLERK_INSTANCE', 'VERCEL_PROJECT', 'STRIPE_WEBHOOK', 'FULL_PROJECT');

-- CreateEnum
CREATE TYPE "CleanupStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UsageType" AS ENUM ('GENERATION', 'MANAGED_PROJECT', 'DEPLOYMENT', 'AI_TOKENS', 'BANDWIDTH');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('healthy', 'degraded', 'down');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('critical', 'warning', 'info');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('TECHNICAL', 'BILLING', 'FEATURE_REQUEST', 'BUG_REPORT', 'GENERAL', 'ACCOUNT');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobStatus" ADD VALUE 'BLUEPRINT_GENERATED';
ALTER TYPE "JobStatus" ADD VALUE 'BLUEPRINT_APPROVED';
ALTER TYPE "JobStatus" ADD VALUE 'COMPOSING';
ALTER TYPE "JobStatus" ADD VALUE 'TESTING';
ALTER TYPE "JobStatus" ADD VALUE 'DEPLOYING';
ALTER TYPE "JobStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "GenerationJob" ADD COLUMN     "blueprint" TEXT,
ADD COLUMN     "blueprintApprovedAt" TIMESTAMP(3),
ADD COLUMN     "blueprintGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "completedModules" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "enhancedPrompt" TEXT,
ADD COLUMN     "enhancementUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "errorLog" TEXT,
ADD COLUMN     "failedModules" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "filesJson" TEXT,
ADD COLUMN     "generationCompletedAt" TIMESTAMP(3),
ADD COLUMN     "generationMode" "GenerationMode" NOT NULL DEFAULT 'PERSONAL',
ADD COLUMN     "generationStartedAt" TIMESTAMP(3),
ADD COLUMN     "parentJobId" TEXT,
ADD COLUMN     "totalModules" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ManagedApp" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isPublicInMarketplace" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "marketplaceInstalls" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "marketplaceViews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'CREATOR',
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "CreatorSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "stripeCurrentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "plan" "PlanTier" NOT NULL DEFAULT 'STARTER',
    "trialEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeConnectedAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeAccountId" TEXT NOT NULL,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "accountType" TEXT NOT NULL DEFAULT 'express',
    "businessName" TEXT,
    "businessUrl" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'usd',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeConnectedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishedApp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "generationJobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "categoryId" TEXT,
    "tags" TEXT[],
    "customDomain" TEXT,
    "domainVerified" BOOLEAN NOT NULL DEFAULT false,
    "deploymentUrl" TEXT,
    "vercelProjectId" TEXT,
    "pricingModel" "PricingModel" NOT NULL DEFAULT 'SUBSCRIPTION',
    "monthlyPrice" INTEGER,
    "yearlyPrice" INTEGER,
    "oneTimePrice" INTEGER,
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "stripeProductId" TEXT,
    "stripePriceMonthly" TEXT,
    "stripePriceYearly" TEXT,
    "stripePriceOneTime" TEXT,
    "status" "AppStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "totalRevenue" INTEGER NOT NULL DEFAULT 0,
    "totalCustomers" INTEGER NOT NULL DEFAULT 0,
    "monthlyRecurring" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishedApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppCustomer" (
    "id" TEXT NOT NULL,
    "publishedAppId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "userId" TEXT,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "purchasedAt" TIMESTAMP(3),
    "hasAccess" BOOLEAN NOT NULL DEFAULT true,
    "accessExpiresAt" TIMESTAMP(3),
    "status" "AppCustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publishedAppId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "PartnerTier" NOT NULL,
    "status" "PartnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "referralCode" TEXT NOT NULL,
    "commissionRate" INTEGER NOT NULL,
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "referredEmail" TEXT NOT NULL,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "convertedAt" TIMESTAMP(3),
    "totalRevenue" INTEGER NOT NULL DEFAULT 0,
    "commissionEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "publishedAppId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "stripeInvoiceId" TEXT,
    "grossAmount" INTEGER NOT NULL,
    "stripeFee" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL,
    "netAmount" INTEGER NOT NULL,
    "platformFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "customerEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidOutAt" TIMESTAMP(3),
    "payoutId" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripePayoutId" TEXT,
    "stripeTransferId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arrivedAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "generationJobId" TEXT NOT NULL,
    "supabaseProjectId" TEXT,
    "supabaseUrl" TEXT,
    "supabaseAnonKey" TEXT,
    "supabaseServiceKey" TEXT,
    "supabaseDbPassword" TEXT,
    "clerkInstanceId" TEXT,
    "clerkPublishableKey" TEXT,
    "clerkSecretKey" TEXT,
    "vercelProjectId" TEXT,
    "vercelDeploymentId" TEXT,
    "vercelUrl" TEXT,
    "vercelTeamId" TEXT,
    "stripeTestPublishable" TEXT,
    "stripeTestSecret" TEXT,
    "stripeTestWebhookId" TEXT,
    "stripeTestWebhookSecret" TEXT,
    "stripeLivePublishable" TEXT,
    "stripeLiveSecret" TEXT,
    "stripeLiveWebhookId" TEXT,
    "stripeLiveWebhookSecret" TEXT,
    "environmentVariables" JSONB,
    "status" "ManagedProjectStatus" NOT NULL DEFAULT 'PROVISIONING',
    "provisioningStep" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "isPermanent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ManagedProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProvisioningLog" (
    "id" TEXT NOT NULL,
    "managedProjectId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ProvisioningLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedFile" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generationJobId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GeneratedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationTelemetry" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generationJobId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "errorMessage" TEXT,
    "stackTrace" TEXT,
    "metadata" JSONB,

    CONSTRAINT "GenerationTelemetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreviewSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "generationJobId" TEXT NOT NULL,
    "files" JSONB NOT NULL,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),

    CONSTRAINT "PreviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "generationJobId" TEXT NOT NULL,
    "vercelDeploymentId" TEXT,
    "vercelProjectId" TEXT,
    "deploymentUrl" TEXT,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "buildLogs" TEXT,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleanupTask" (
    "id" TEXT NOT NULL,
    "managedProjectId" TEXT NOT NULL,
    "cleanupType" "CleanupType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "CleanupStatus" NOT NULL DEFAULT 'PENDING',
    "executedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleanupTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usageType" "UsageType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "resourceId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "appCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthCheck" (
    "id" TEXT NOT NULL,
    "managedAppId" TEXT NOT NULL,
    "status" "HealthStatus" NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "statusCode" INTEGER,
    "error" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoringAlert" (
    "id" TEXT NOT NULL,
    "managedAppId" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "autoHealed" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "MonitoringAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "managedAppId" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "aiTriaged" BOOLEAN NOT NULL DEFAULT false,
    "aiSuggestion" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "assignedTo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationFailure" (
    "id" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "errorFile" TEXT,
    "errorLine" INTEGER,
    "errorCode" TEXT,
    "prompt" TEXT NOT NULL,
    "generator" TEXT NOT NULL,
    "filesGenerated" INTEGER NOT NULL DEFAULT 0,
    "recovered" BOOLEAN NOT NULL DEFAULT false,
    "fixApplied" TEXT,
    "attemptsCount" INTEGER NOT NULL DEFAULT 1,
    "userId" TEXT,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "GenerationFailure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FailurePattern" (
    "id" TEXT NOT NULL,
    "patternType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "errorType" TEXT NOT NULL,
    "keywords" TEXT[],
    "solution" TEXT NOT NULL,
    "preventionRule" TEXT,
    "addedToPrompt" BOOLEAN NOT NULL DEFAULT false,
    "promptVersion" TEXT,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FailurePattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scopes" TEXT[],
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "accountInfo" JSONB,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "responseTime" INTEGER,
    "errorMessage" TEXT,
    "isDemoMode" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "generationJobId" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "allowRemix" BOOLEAN NOT NULL DEFAULT true,
    "showCode" BOOLEAN NOT NULL DEFAULT false,
    "creatorId" TEXT NOT NULL,
    "creatorName" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "remixCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "title" TEXT,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareView" (
    "id" TEXT NOT NULL,
    "shareLinkId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "country" TEXT,
    "sessionId" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareRemix" (
    "id" TEXT NOT NULL,
    "originalShareId" TEXT NOT NULL,
    "newGenerationJobId" TEXT NOT NULL,
    "remixedByUserId" TEXT,
    "modifiedPrompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareRemix_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorSubscription_userId_key" ON "CreatorSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorSubscription_stripeSubscriptionId_key" ON "CreatorSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "CreatorSubscription_status_idx" ON "CreatorSubscription"("status");

-- CreateIndex
CREATE INDEX "CreatorSubscription_stripeSubscriptionId_idx" ON "CreatorSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeConnectedAccount_userId_key" ON "StripeConnectedAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeConnectedAccount_stripeAccountId_key" ON "StripeConnectedAccount"("stripeAccountId");

-- CreateIndex
CREATE INDEX "StripeConnectedAccount_stripeAccountId_idx" ON "StripeConnectedAccount"("stripeAccountId");

-- CreateIndex
CREATE INDEX "StripeConnectedAccount_onboardingComplete_idx" ON "StripeConnectedAccount"("onboardingComplete");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedApp_slug_key" ON "PublishedApp"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedApp_customDomain_key" ON "PublishedApp"("customDomain");

-- CreateIndex
CREATE INDEX "PublishedApp_userId_idx" ON "PublishedApp"("userId");

-- CreateIndex
CREATE INDEX "PublishedApp_slug_idx" ON "PublishedApp"("slug");

-- CreateIndex
CREATE INDEX "PublishedApp_status_idx" ON "PublishedApp"("status");

-- CreateIndex
CREATE INDEX "PublishedApp_customDomain_idx" ON "PublishedApp"("customDomain");

-- CreateIndex
CREATE INDEX "PublishedApp_categoryId_idx" ON "PublishedApp"("categoryId");

-- CreateIndex
CREATE INDEX "AppCustomer_publishedAppId_idx" ON "AppCustomer"("publishedAppId");

-- CreateIndex
CREATE INDEX "AppCustomer_stripeCustomerId_idx" ON "AppCustomer"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "AppCustomer_email_idx" ON "AppCustomer"("email");

-- CreateIndex
CREATE INDEX "AppCustomer_userId_idx" ON "AppCustomer"("userId");

-- CreateIndex
CREATE INDEX "AppCustomer_status_idx" ON "AppCustomer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AppCustomer_publishedAppId_email_key" ON "AppCustomer"("publishedAppId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "AppSubscription_stripeSubscriptionId_key" ON "AppSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "AppSubscription_userId_idx" ON "AppSubscription"("userId");

-- CreateIndex
CREATE INDEX "AppSubscription_publishedAppId_idx" ON "AppSubscription"("publishedAppId");

-- CreateIndex
CREATE INDEX "AppSubscription_status_idx" ON "AppSubscription"("status");

-- CreateIndex
CREATE INDEX "AppSubscription_stripeSubscriptionId_idx" ON "AppSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "AppSubscription_userId_publishedAppId_key" ON "AppSubscription"("userId", "publishedAppId");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLink_token_key" ON "MagicLink"("token");

-- CreateIndex
CREATE INDEX "MagicLink_token_idx" ON "MagicLink"("token");

-- CreateIndex
CREATE INDEX "MagicLink_userId_idx" ON "MagicLink"("userId");

-- CreateIndex
CREATE INDEX "MagicLink_expiresAt_idx" ON "MagicLink"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_userId_key" ON "Partner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_referralCode_key" ON "Partner"("referralCode");

-- CreateIndex
CREATE INDEX "Partner_referralCode_idx" ON "Partner"("referralCode");

-- CreateIndex
CREATE INDEX "Partner_tier_idx" ON "Partner"("tier");

-- CreateIndex
CREATE INDEX "Partner_status_idx" ON "Partner"("status");

-- CreateIndex
CREATE INDEX "Referral_partnerId_idx" ON "Referral"("partnerId");

-- CreateIndex
CREATE INDEX "Referral_referredUserId_idx" ON "Referral"("referredUserId");

-- CreateIndex
CREATE INDEX "Referral_converted_idx" ON "Referral"("converted");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_stripePaymentIntentId_key" ON "Transaction"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Transaction_publishedAppId_idx" ON "Transaction"("publishedAppId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_payoutId_idx" ON "Transaction"("payoutId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_stripePayoutId_key" ON "Payout"("stripePayoutId");

-- CreateIndex
CREATE INDEX "Payout_userId_idx" ON "Payout"("userId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "Payout_createdAt_idx" ON "Payout"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedProject_generationJobId_key" ON "ManagedProject"("generationJobId");

-- CreateIndex
CREATE INDEX "ManagedProject_userId_idx" ON "ManagedProject"("userId");

-- CreateIndex
CREATE INDEX "ManagedProject_status_idx" ON "ManagedProject"("status");

-- CreateIndex
CREATE INDEX "ManagedProject_expiresAt_idx" ON "ManagedProject"("expiresAt");

-- CreateIndex
CREATE INDEX "ManagedProject_vercelUrl_idx" ON "ManagedProject"("vercelUrl");

-- CreateIndex
CREATE INDEX "ProvisioningLog_managedProjectId_idx" ON "ProvisioningLog"("managedProjectId");

-- CreateIndex
CREATE INDEX "ProvisioningLog_step_idx" ON "ProvisioningLog"("step");

-- CreateIndex
CREATE INDEX "ProvisioningLog_status_idx" ON "ProvisioningLog"("status");

-- CreateIndex
CREATE INDEX "ProvisioningLog_startedAt_idx" ON "ProvisioningLog"("startedAt");

-- CreateIndex
CREATE INDEX "GeneratedFile_generationJobId_idx" ON "GeneratedFile"("generationJobId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedFile_generationJobId_path_key" ON "GeneratedFile"("generationJobId", "path");

-- CreateIndex
CREATE INDEX "GenerationTelemetry_generationJobId_idx" ON "GenerationTelemetry"("generationJobId");

-- CreateIndex
CREATE INDEX "GenerationTelemetry_eventType_idx" ON "GenerationTelemetry"("eventType");

-- CreateIndex
CREATE INDEX "GenerationTelemetry_createdAt_idx" ON "GenerationTelemetry"("createdAt");

-- CreateIndex
CREATE INDEX "PreviewSession_generationJobId_idx" ON "PreviewSession"("generationJobId");

-- CreateIndex
CREATE INDEX "PreviewSession_expiresAt_idx" ON "PreviewSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Deployment_vercelDeploymentId_key" ON "Deployment"("vercelDeploymentId");

-- CreateIndex
CREATE INDEX "Deployment_generationJobId_idx" ON "Deployment"("generationJobId");

-- CreateIndex
CREATE INDEX "Deployment_status_idx" ON "Deployment"("status");

-- CreateIndex
CREATE INDEX "Deployment_createdAt_idx" ON "Deployment"("createdAt");

-- CreateIndex
CREATE INDEX "CleanupTask_scheduledFor_idx" ON "CleanupTask"("scheduledFor");

-- CreateIndex
CREATE INDEX "CleanupTask_status_idx" ON "CleanupTask"("status");

-- CreateIndex
CREATE INDEX "CleanupTask_managedProjectId_idx" ON "CleanupTask"("managedProjectId");

-- CreateIndex
CREATE INDEX "UsageRecord_userId_idx" ON "UsageRecord"("userId");

-- CreateIndex
CREATE INDEX "UsageRecord_usageType_idx" ON "UsageRecord"("usageType");

-- CreateIndex
CREATE INDEX "UsageRecord_periodStart_periodEnd_idx" ON "UsageRecord"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "UsageRecord_createdAt_idx" ON "UsageRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppCategory_name_key" ON "AppCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AppCategory_slug_key" ON "AppCategory"("slug");

-- CreateIndex
CREATE INDEX "AppCategory_slug_idx" ON "AppCategory"("slug");

-- CreateIndex
CREATE INDEX "AppCategory_isActive_idx" ON "AppCategory"("isActive");

-- CreateIndex
CREATE INDEX "AppCategory_isFeatured_idx" ON "AppCategory"("isFeatured");

-- CreateIndex
CREATE INDEX "AppCategory_sortOrder_idx" ON "AppCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "HealthCheck_managedAppId_idx" ON "HealthCheck"("managedAppId");

-- CreateIndex
CREATE INDEX "HealthCheck_timestamp_idx" ON "HealthCheck"("timestamp");

-- CreateIndex
CREATE INDEX "HealthCheck_status_idx" ON "HealthCheck"("status");

-- CreateIndex
CREATE INDEX "MonitoringAlert_managedAppId_idx" ON "MonitoringAlert"("managedAppId");

-- CreateIndex
CREATE INDEX "MonitoringAlert_severity_idx" ON "MonitoringAlert"("severity");

-- CreateIndex
CREATE INDEX "MonitoringAlert_notifiedAt_idx" ON "MonitoringAlert"("notifiedAt");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_priority_idx" ON "SupportTicket"("priority");

-- CreateIndex
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");

-- CreateIndex
CREATE INDEX "TicketMessage_createdAt_idx" ON "TicketMessage"("createdAt");

-- CreateIndex
CREATE INDEX "GenerationFailure_errorType_idx" ON "GenerationFailure"("errorType");

-- CreateIndex
CREATE INDEX "GenerationFailure_generator_idx" ON "GenerationFailure"("generator");

-- CreateIndex
CREATE INDEX "GenerationFailure_recovered_idx" ON "GenerationFailure"("recovered");

-- CreateIndex
CREATE INDEX "GenerationFailure_createdAt_idx" ON "GenerationFailure"("createdAt");

-- CreateIndex
CREATE INDEX "FailurePattern_errorType_idx" ON "FailurePattern"("errorType");

-- CreateIndex
CREATE INDEX "FailurePattern_frequency_idx" ON "FailurePattern"("frequency");

-- CreateIndex
CREATE INDEX "FailurePattern_addedToPrompt_idx" ON "FailurePattern"("addedToPrompt");

-- CreateIndex
CREATE INDEX "IntegrationCredential_userId_idx" ON "IntegrationCredential"("userId");

-- CreateIndex
CREATE INDEX "IntegrationCredential_integrationId_idx" ON "IntegrationCredential"("integrationId");

-- CreateIndex
CREATE INDEX "IntegrationCredential_isActive_idx" ON "IntegrationCredential"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationCredential_userId_integrationId_key" ON "IntegrationCredential"("userId", "integrationId");

-- CreateIndex
CREATE INDEX "IntegrationUsage_userId_idx" ON "IntegrationUsage"("userId");

-- CreateIndex
CREATE INDEX "IntegrationUsage_integrationId_idx" ON "IntegrationUsage"("integrationId");

-- CreateIndex
CREATE INDEX "IntegrationUsage_createdAt_idx" ON "IntegrationUsage"("createdAt");

-- CreateIndex
CREATE INDEX "IntegrationUsage_isDemoMode_idx" ON "IntegrationUsage"("isDemoMode");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_generationJobId_key" ON "ShareLink"("generationJobId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_shareId_key" ON "ShareLink"("shareId");

-- CreateIndex
CREATE INDEX "ShareLink_shareId_idx" ON "ShareLink"("shareId");

-- CreateIndex
CREATE INDEX "ShareLink_creatorId_idx" ON "ShareLink"("creatorId");

-- CreateIndex
CREATE INDEX "ShareLink_viewCount_idx" ON "ShareLink"("viewCount");

-- CreateIndex
CREATE INDEX "ShareLink_createdAt_idx" ON "ShareLink"("createdAt");

-- CreateIndex
CREATE INDEX "ShareLink_isPublic_idx" ON "ShareLink"("isPublic");

-- CreateIndex
CREATE INDEX "ShareView_shareLinkId_idx" ON "ShareView"("shareLinkId");

-- CreateIndex
CREATE INDEX "ShareView_viewedAt_idx" ON "ShareView"("viewedAt");

-- CreateIndex
CREATE INDEX "ShareView_sessionId_idx" ON "ShareView"("sessionId");

-- CreateIndex
CREATE INDEX "ShareView_referrer_idx" ON "ShareView"("referrer");

-- CreateIndex
CREATE UNIQUE INDEX "ShareRemix_newGenerationJobId_key" ON "ShareRemix"("newGenerationJobId");

-- CreateIndex
CREATE INDEX "ShareRemix_originalShareId_idx" ON "ShareRemix"("originalShareId");

-- CreateIndex
CREATE INDEX "ShareRemix_remixedByUserId_idx" ON "ShareRemix"("remixedByUserId");

-- CreateIndex
CREATE INDEX "ShareRemix_createdAt_idx" ON "ShareRemix"("createdAt");

-- CreateIndex
CREATE INDEX "GenerationJob_userId_idx" ON "GenerationJob"("userId");

-- CreateIndex
CREATE INDEX "GenerationJob_status_idx" ON "GenerationJob"("status");

-- CreateIndex
CREATE INDEX "GenerationJob_createdAt_idx" ON "GenerationJob"("createdAt");

-- CreateIndex
CREATE INDEX "GenerationJob_generationMode_idx" ON "GenerationJob"("generationMode");

-- CreateIndex
CREATE INDEX "GenerationJob_parentJobId_idx" ON "GenerationJob"("parentJobId");

-- CreateIndex
CREATE INDEX "ManagedApp_categoryId_idx" ON "ManagedApp"("categoryId");

-- CreateIndex
CREATE INDEX "ManagedApp_isPublicInMarketplace_idx" ON "ManagedApp"("isPublicInMarketplace");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_stripeCustomerId_idx" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "CreatorSubscription" ADD CONSTRAINT "CreatorSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripeConnectedAccount" ADD CONSTRAINT "StripeConnectedAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedApp" ADD CONSTRAINT "PublishedApp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedApp" ADD CONSTRAINT "PublishedApp_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedApp" ADD CONSTRAINT "PublishedApp_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AppCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppCustomer" ADD CONSTRAINT "AppCustomer_publishedAppId_fkey" FOREIGN KEY ("publishedAppId") REFERENCES "PublishedApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSubscription" ADD CONSTRAINT "AppSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSubscription" ADD CONSTRAINT "AppSubscription_publishedAppId_fkey" FOREIGN KEY ("publishedAppId") REFERENCES "PublishedApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicLink" ADD CONSTRAINT "MagicLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_publishedAppId_fkey" FOREIGN KEY ("publishedAppId") REFERENCES "PublishedApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedProject" ADD CONSTRAINT "ManagedProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedProject" ADD CONSTRAINT "ManagedProject_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProvisioningLog" ADD CONSTRAINT "ProvisioningLog_managedProjectId_fkey" FOREIGN KEY ("managedProjectId") REFERENCES "ManagedProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_parentJobId_fkey" FOREIGN KEY ("parentJobId") REFERENCES "GenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedFile" ADD CONSTRAINT "GeneratedFile_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationTelemetry" ADD CONSTRAINT "GenerationTelemetry_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreviewSession" ADD CONSTRAINT "PreviewSession_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedApp" ADD CONSTRAINT "ManagedApp_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AppCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthCheck" ADD CONSTRAINT "HealthCheck_managedAppId_fkey" FOREIGN KEY ("managedAppId") REFERENCES "ManagedApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringAlert" ADD CONSTRAINT "MonitoringAlert_managedAppId_fkey" FOREIGN KEY ("managedAppId") REFERENCES "ManagedApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_managedAppId_fkey" FOREIGN KEY ("managedAppId") REFERENCES "ManagedApp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationCredential" ADD CONSTRAINT "IntegrationCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareView" ADD CONSTRAINT "ShareView_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "ShareLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareRemix" ADD CONSTRAINT "ShareRemix_originalShareId_fkey" FOREIGN KEY ("originalShareId") REFERENCES "ShareLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareRemix" ADD CONSTRAINT "ShareRemix_newGenerationJobId_fkey" FOREIGN KEY ("newGenerationJobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
