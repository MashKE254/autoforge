// src/lib/infrastructure/provisioning-service.ts

import { prisma } from '@/lib/prisma';
import { ManagedProject } from '@prisma/client';
import { SupabaseProvisioner } from './providers/supabase';
import { ClerkProvisioner } from './providers/clerk';
import { VercelProvisioner } from './providers/vercel';
import { StripeProvisioner } from './providers/stripe';
import { encrypt, decrypt } from '../encryption';

export interface ProvisioningResult {
  success: boolean;
  managedProjectId: string;
  previewUrl?: string;
  error?: string;
}

export interface ProvisioningCallbacks {
  onStepStart?: (step: string) => void;
  onStepComplete?: (step: string, duration: number) => void;
  onStepError?: (step: string, error: string) => void;
  onComplete?: (result: ProvisioningResult) => void;
}

export class ProvisioningService {
  private supabase: SupabaseProvisioner;
  private clerk: ClerkProvisioner;
  private vercel: VercelProvisioner;
  private stripe: StripeProvisioner;

  constructor() {
    this.supabase = new SupabaseProvisioner();
    this.clerk = new ClerkProvisioner();
    this.vercel = new VercelProvisioner();
    this.stripe = new StripeProvisioner();
  }

  /**
   * Provision complete infrastructure for a generated app
   */
  async provision(
    userId: string,
    generationJobId: string,
    callbacks?: ProvisioningCallbacks
  ): Promise<ProvisioningResult> {
    
    // Create managed project record
    const managedProject = await prisma.managedProject.create({
      data: {
        userId,
        generationJobId,
        status: 'PROVISIONING',
        provisioningStep: 'initializing',
        // Free tier: expire after 7 days
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    try {
      // Step 1: Provision Supabase Database
      await this.provisionStep(managedProject.id, 'database', callbacks, async () => {
        // Generate secure database password
        const dbPassword = SupabaseProvisioner.generatePassword();

        const dbResult = await this.supabase.createProject({
          name: `autoforge-${generationJobId.slice(0, 8)}`,
          organizationId: process.env.SUPABASE_ORG_ID!,
          region: 'us-east-1',
          dbPassword,
        });

        await prisma.managedProject.update({
          where: { id: managedProject.id },
          data: {
            supabaseProjectId: dbResult.projectId,
            supabaseUrl: dbResult.projectUrl,
            supabaseAnonKey: dbResult.anonKey,
            supabaseServiceKey: encrypt(dbResult.serviceRoleKey),
            status: 'DATABASE_READY',
          },
        });

        // Run migrations
        const job = await prisma.generationJob.findUnique({
          where: { id: generationJobId },
          include: { files: true },
        });

        const schemaFile = job?.files.find(f => f.path === 'prisma/schema.prisma');
        if (schemaFile) {
          await this.supabase.runMigrations(dbResult.projectId, schemaFile.content);
        }

        return dbResult;
      });

      // Step 2: Provision Clerk Auth
      await this.provisionStep(managedProject.id, 'auth', callbacks, async () => {
        const authResult = await this.clerk.createInstance({
          name: `autoforge-${generationJobId.slice(0, 8)}`,
        });

        await prisma.managedProject.update({
          where: { id: managedProject.id },
          data: {
            clerkInstanceId: authResult.instanceId,
            clerkPublishableKey: authResult.publishableKey,
            clerkSecretKey: encrypt(authResult.secretKey),
            status: 'AUTH_READY',
          },
        });

        return authResult;
      });

      // Step 3: Setup Stripe Test Mode
      await this.provisionStep(managedProject.id, 'payments', callbacks, async () => {
        // Use platform's test keys for preview
        // Each app gets isolated webhook endpoint
        const stripeResult = await this.stripe.createTestWebhook({
          managedProjectId: managedProject.id,
        });

        await prisma.managedProject.update({
          where: { id: managedProject.id },
          data: {
            stripeTestPublishable: process.env.STRIPE_TEST_PUBLISHABLE_KEY,
            stripeTestSecret: encrypt(process.env.STRIPE_TEST_SECRET_KEY!),
            stripeTestWebhookSecret: encrypt(stripeResult.webhookSecret),
          },
        });

        return stripeResult;
      });

      // Step 4: Deploy Preview to Vercel
      await this.provisionStep(managedProject.id, 'preview', callbacks, async () => {
        const project = await prisma.managedProject.findUnique({
          where: { id: managedProject.id },
        });

        const job = await prisma.generationJob.findUnique({
          where: { id: generationJobId },
          include: { files: true },
        });

        // Build environment variables
        const envVars = this.buildEnvVars(project!);

        // Deploy to Vercel
        const deployResult = await this.vercel.deploy({
          name: `preview-${generationJobId.slice(0, 8)}`,
          files: job!.files,
          envVars,
          isPreview: true,
        });

        await prisma.managedProject.update({
          where: { id: managedProject.id },
          data: {
            vercelProjectId: deployResult.projectId,
            vercelDeploymentId: deployResult.deploymentId,
            vercelUrl: deployResult.url,
            status: 'PREVIEW_READY',
            provisioningStep: 'complete',
          },
        });

        return deployResult;
      });

      // Success!
      const result = await prisma.managedProject.findUnique({
        where: { id: managedProject.id },
      });

      callbacks?.onComplete?.({
        success: true,
        managedProjectId: managedProject.id,
        previewUrl: result?.vercelUrl || undefined,
      });

      return {
        success: true,
        managedProjectId: managedProject.id,
        previewUrl: result?.vercelUrl || undefined,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await prisma.managedProject.update({
        where: { id: managedProject.id },
        data: {
          status: 'ERROR',
          errorMessage,
        },
      });

      callbacks?.onComplete?.({
        success: false,
        managedProjectId: managedProject.id,
        error: errorMessage,
      });

      return {
        success: false,
        managedProjectId: managedProject.id,
        error: errorMessage,
      };
    }
  }

  /**
   * Helper to run a provisioning step with logging
   */
  private async provisionStep<T>(
    managedProjectId: string,
    stepName: string,
    callbacks: ProvisioningCallbacks | undefined,
    action: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    callbacks?.onStepStart?.(stepName);
    
    await prisma.provisioningLog.create({
      data: {
        managedProjectId,
        step: stepName,
        status: 'started',
      },
    });

    await prisma.managedProject.update({
      where: { id: managedProjectId },
      data: { provisioningStep: stepName },
    });

    try {
      const result = await action();
      const duration = Date.now() - startTime;

      await prisma.provisioningLog.create({
        data: {
          managedProjectId,
          step: stepName,
          status: 'completed',
          duration,
        },
      });

      callbacks?.onStepComplete?.(stepName, duration);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await prisma.provisioningLog.create({
        data: {
          managedProjectId,
          step: stepName,
          status: 'failed',
          duration,
          errorMessage,
        },
      });

      callbacks?.onStepError?.(stepName, errorMessage);
      throw error;
    }
  }

  /**
   * Build environment variables for deployment
   */
  private buildEnvVars(project: ManagedProject): Record<string, string> {
    return {
      // Database
      DATABASE_URL: project.supabaseUrl 
        ? `${project.supabaseUrl}/postgres`
        : '',
      DIRECT_URL: project.supabaseUrl
        ? `${project.supabaseUrl}/postgres`
        : '',
      
      // Supabase client
      NEXT_PUBLIC_SUPABASE_URL: project.supabaseUrl || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: project.supabaseAnonKey || '',
      SUPABASE_SERVICE_ROLE_KEY: project.supabaseServiceKey 
        ? decrypt(project.supabaseServiceKey) 
        : '',
      
      // Clerk Auth
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: project.clerkPublishableKey || '',
      CLERK_SECRET_KEY: project.clerkSecretKey 
        ? decrypt(project.clerkSecretKey) 
        : '',
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
      NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: '/dashboard',
      NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: '/dashboard',
      
      // Stripe (Test Mode)
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: project.stripeTestPublishable || '',
      STRIPE_SECRET_KEY: project.stripeTestSecret 
        ? decrypt(project.stripeTestSecret) 
        : '',
      STRIPE_WEBHOOK_SECRET: project.stripeTestWebhookSecret 
        ? decrypt(project.stripeTestWebhookSecret) 
        : '',
      
      // App
      NEXT_PUBLIC_APP_URL: project.vercelUrl || 'http://localhost:3000',
    };
  }
}

export const provisioningService = new ProvisioningService();