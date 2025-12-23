-- CreateEnum: ManagedAppStatus
CREATE TYPE "ManagedAppStatus" AS ENUM ('PROVISIONING', 'ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum: AppUsageEvent
CREATE TYPE "AppUsageEvent" AS ENUM ('AI_CHAT_COMPLETION', 'AI_STREAMING', 'DATABASE_QUERY', 'DATABASE_WRITE', 'BANDWIDTH_OUT', 'FILE_UPLOAD');

-- CreateTable: ManagedApp
CREATE TABLE "ManagedApp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "generationJobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "customDomain" TEXT,
    "apiKey" TEXT NOT NULL,
    "appSecret" TEXT NOT NULL,
    "schemaName" TEXT NOT NULL,
    "databaseConnectionString" TEXT NOT NULL,
    "vercelProjectId" TEXT,
    "vercelDeploymentId" TEXT,
    "deploymentUrl" TEXT,
    "status" "ManagedAppStatus" NOT NULL DEFAULT 'PROVISIONING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "ManagedApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AppUsageRecord
CREATE TABLE "AppUsageRecord" (
    "id" TEXT NOT NULL,
    "managedAppId" TEXT NOT NULL,
    "eventType" "AppUsageEvent" NOT NULL,
    "aiOps" INTEGER NOT NULL DEFAULT 0,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "dbQueries" INTEGER NOT NULL DEFAULT 0,
    "dbStorage" INTEGER NOT NULL DEFAULT 0,
    "bandwidthBytes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppUsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MonthlyUsage
CREATE TABLE "MonthlyUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalAiOps" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "totalDbStorage" INTEGER NOT NULL DEFAULT 0,
    "totalBandwidth" INTEGER NOT NULL DEFAULT 0,
    "totalApps" INTEGER NOT NULL DEFAULT 0,
    "aiCost" INTEGER NOT NULL DEFAULT 0,
    "storageCost" INTEGER NOT NULL DEFAULT 0,
    "bandwidthCost" INTEGER NOT NULL DEFAULT 0,
    "totalCost" INTEGER NOT NULL DEFAULT 0,
    "overageCost" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PlanLimits
CREATE TABLE "PlanLimits" (
    "id" TEXT NOT NULL,
    "plan" "PlanTier" NOT NULL,
    "maxApps" INTEGER NOT NULL,
    "maxAiOps" INTEGER NOT NULL,
    "maxDbStorage" INTEGER NOT NULL,
    "maxBandwidth" INTEGER NOT NULL,
    "overageAiOps" DOUBLE PRECISION NOT NULL,
    "overageStorage" DOUBLE PRECISION NOT NULL,
    "overageBandwidth" DOUBLE PRECISION NOT NULL,
    "customDomain" BOOLEAN NOT NULL,
    "prioritySupport" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanLimits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique indexes
CREATE UNIQUE INDEX "ManagedApp_generationJobId_key" ON "ManagedApp"("generationJobId");
CREATE UNIQUE INDEX "ManagedApp_subdomain_key" ON "ManagedApp"("subdomain");
CREATE UNIQUE INDEX "ManagedApp_customDomain_key" ON "ManagedApp"("customDomain");
CREATE UNIQUE INDEX "ManagedApp_apiKey_key" ON "ManagedApp"("apiKey");
CREATE UNIQUE INDEX "ManagedApp_schemaName_key" ON "ManagedApp"("schemaName");

-- CreateIndex: Regular indexes
CREATE INDEX "ManagedApp_userId_idx" ON "ManagedApp"("userId");
CREATE INDEX "ManagedApp_subdomain_idx" ON "ManagedApp"("subdomain");
CREATE INDEX "ManagedApp_status_idx" ON "ManagedApp"("status");
CREATE INDEX "ManagedApp_apiKey_idx" ON "ManagedApp"("apiKey");

CREATE INDEX "AppUsageRecord_managedAppId_idx" ON "AppUsageRecord"("managedAppId");
CREATE INDEX "AppUsageRecord_eventType_idx" ON "AppUsageRecord"("eventType");
CREATE INDEX "AppUsageRecord_createdAt_idx" ON "AppUsageRecord"("createdAt");

CREATE UNIQUE INDEX "MonthlyUsage_userId_month_year_key" ON "MonthlyUsage"("userId", "month", "year");
CREATE INDEX "MonthlyUsage_userId_idx" ON "MonthlyUsage"("userId");
CREATE INDEX "MonthlyUsage_year_month_idx" ON "MonthlyUsage"("year", "month");

CREATE UNIQUE INDEX "PlanLimits_plan_key" ON "PlanLimits"("plan");

-- AddForeignKey
ALTER TABLE "ManagedApp" ADD CONSTRAINT "ManagedApp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManagedApp" ADD CONSTRAINT "ManagedApp_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppUsageRecord" ADD CONSTRAINT "AppUsageRecord_managedAppId_fkey" FOREIGN KEY ("managedAppId") REFERENCES "ManagedApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
