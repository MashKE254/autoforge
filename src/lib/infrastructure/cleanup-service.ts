// src/lib/infrastructure/cleanup-service.ts

import { prisma } from '@/lib/prisma';
import { SupabaseProvisioner } from './providers/supabase';
import { ClerkProvisioner } from './providers/clerk';
import { VercelProvisioner } from './providers/vercel';

export class CleanupService {
  private supabase = new SupabaseProvisioner();
  private clerk = new ClerkProvisioner();
  private vercel = new VercelProvisioner();

  /**
   * Clean up expired free tier projects
   * Run this as a cron job daily
   */
  async cleanupExpiredProjects(): Promise<void> {
    const expiredProjects = await prisma.managedProject.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        status: {
          in: ['PREVIEW_READY', 'DEPLOYED'],
        },
      },
    });

    console.log(`Found ${expiredProjects.length} expired projects to clean up`);

    for (const project of expiredProjects) {
      try {
        // Delete Supabase project
        if (project.supabaseProjectId) {
          await this.supabase.deleteProject(project.supabaseProjectId);
        }

        // Delete Clerk instance
        if (project.clerkInstanceId) {
          await this.clerk.deleteInstance(project.clerkInstanceId);
        }

        // Delete Vercel project
        if (project.vercelProjectId) {
          await this.vercel.deleteProject(project.vercelProjectId);
        }

        // Mark as expired
        await prisma.managedProject.update({
          where: { id: project.id },
          data: { status: 'EXPIRED' },
        });

        console.log(`Cleaned up project ${project.id}`);
      } catch (error) {
        console.error(`Failed to cleanup project ${project.id}:`, error);
      }
    }
  }

  /**
   * Extend a project's expiration (for paid users)
   */
  async extendProject(managedProjectId: string, days: number): Promise<void> {
    await prisma.managedProject.update({
      where: { id: managedProjectId },
      data: {
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    });
  }

  /**
   * Remove expiration (for paid users with subscription)
   */
  async removeExpiration(managedProjectId: string): Promise<void> {
    await prisma.managedProject.update({
      where: { id: managedProjectId },
      data: {
        expiresAt: null,
      },
    });
  }
}

export const cleanupService = new CleanupService();