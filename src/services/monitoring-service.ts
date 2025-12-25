/**
 * UPTIME MONITORING SERVICE
 *
 * File: src/services/monitoring-service.ts
 *
 * Purpose:
 * - Monitor all deployed apps for uptime
 * - Auto-heal when apps go down
 * - Alert users about issues
 * - Track performance metrics
 *
 * This runs as a cron job every minute to check all active apps.
 */

import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================================
// TYPES
// ============================================================================

export interface HealthCheckResult {
  url: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  statusCode?: number;
  error?: string;
  timestamp: Date;
}

export interface MonitoringAlert {
  appId: string;
  appName: string;
  userId: string;
  userEmail: string;
  issue: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: Date;
  autoHealed: boolean;
}

// ============================================================================
// MONITORING SERVICE CLASS
// ============================================================================

export class MonitoringService {
  /**
   * Check health of all active apps
   */
  async monitorAllApps(): Promise<void> {
    console.log('🔍 Starting uptime monitoring sweep...');

    // Get all active managed apps
    const apps = await prisma.managedApp.findMany({
      where: {
        status: 'ACTIVE',
        deploymentUrl: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    console.log(`   → Found ${apps.length} apps to monitor`);

    const results: HealthCheckResult[] = [];
    const alerts: MonitoringAlert[] = [];

    // Check each app
    for (const app of apps) {
      try {
        const result = await this.checkHealth(app.deploymentUrl!);
        results.push(result);

        // Create health record
        await prisma.healthCheck.create({
          data: {
            managedAppId: app.id,
            status: result.status,
            responseTime: result.responseTime,
            statusCode: result.statusCode,
            error: result.error,
            timestamp: result.timestamp,
          },
        });

        // Handle unhealthy apps
        if (result.status === 'down') {
          console.log(`   ⚠️  App ${app.name} is DOWN - attempting auto-heal...`);

          const healed = await this.attemptAutoHeal(app.id, app.deploymentUrl!);

          alerts.push({
            appId: app.id,
            appName: app.name,
            userId: app.user.id,
            userEmail: app.user.email!,
            issue: result.error || 'App is not responding',
            severity: 'critical',
            timestamp: new Date(),
            autoHealed: healed,
          });

          if (!healed) {
            // Send alert to user
            await this.sendAlert({
              appId: app.id,
              appName: app.name,
              userId: app.user.id,
              userEmail: app.user.email!,
              issue: result.error || 'App is not responding',
              severity: 'critical',
              timestamp: new Date(),
              autoHealed: false,
            });
          }
        } else if (result.status === 'degraded') {
          console.log(`   ⚠️  App ${app.name} is SLOW (${result.responseTime}ms)`);

          // Only alert if consistently slow (check last 3 health checks)
          const recentChecks = await prisma.healthCheck.findMany({
            where: { managedAppId: app.id },
            orderBy: { timestamp: 'desc' },
            take: 3,
          });

          const allSlow = recentChecks.every((check) => check.status === 'degraded');

          if (allSlow) {
            alerts.push({
              appId: app.id,
              appName: app.name,
              userId: app.user.id,
              userEmail: app.user.email!,
              issue: `App is responding slowly (${result.responseTime}ms avg)`,
              severity: 'warning',
              timestamp: new Date(),
              autoHealed: false,
            });
          }
        } else {
          console.log(`   ✅ App ${app.name} is HEALTHY (${result.responseTime}ms)`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to monitor ${app.name}:`, error);
      }
    }

    console.log(`✅ Monitoring complete: ${results.length} apps checked, ${alerts.length} alerts generated`);
  }

  /**
   * Check health of a single URL
   */
  private async checkHealth(url: string): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'AutoForge-Monitor/1.0',
        },
      });

      clearTimeout(timeout);

      const responseTime = Date.now() - startTime;

      // Determine status
      let status: 'healthy' | 'degraded' | 'down';
      if (response.ok) {
        status = responseTime < 3000 ? 'healthy' : 'degraded';
      } else {
        status = 'down';
      }

      return {
        url,
        status,
        responseTime,
        statusCode: response.status,
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        url,
        status: 'down',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Attempt to auto-heal a down app
   */
  private async attemptAutoHeal(appId: string, deploymentUrl: string): Promise<boolean> {
    try {
      console.log(`   🔧 Attempting auto-heal for app ${appId}...`);

      // Strategy 1: Restart the deployment (if Vercel)
      if (deploymentUrl.includes('.vercel.app')) {
        const app = await prisma.managedApp.findUnique({
          where: { id: appId },
        });

        if (app?.vercelProjectId) {
          // Trigger redeployment
          await this.triggerRedeployment(app.vercelProjectId);
          console.log(`   ✅ Triggered Vercel redeployment`);

          // Wait 30 seconds and check again
          await new Promise((resolve) => setTimeout(resolve, 30000));

          const healthCheck = await this.checkHealth(deploymentUrl);
          if (healthCheck.status !== 'down') {
            console.log(`   ✅ Auto-heal successful!`);
            return true;
          }
        }
      }

      // Strategy 2: Clear cache (if applicable)
      // TODO: Implement cache clearing

      // Strategy 3: Restart database connections
      // TODO: Implement DB connection reset

      console.log(`   ❌ Auto-heal failed`);
      return false;
    } catch (error) {
      console.error(`   ❌ Auto-heal error:`, error);
      return false;
    }
  }

  /**
   * Trigger Vercel redeployment
   */
  private async triggerRedeployment(vercelProjectId: string): Promise<void> {
    if (!process.env.VERCEL_API_TOKEN) {
      throw new Error('VERCEL_API_TOKEN not configured');
    }

    const response = await fetch(
      `https://api.vercel.com/v13/deployments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: vercelProjectId,
          project: vercelProjectId,
          target: 'production',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Vercel API error: ${response.statusText}`);
    }
  }

  /**
   * Send alert to user
   */
  private async sendAlert(alert: MonitoringAlert): Promise<void> {
    try {
      // Create alert record
      await prisma.monitoringAlert.create({
        data: {
          managedAppId: alert.appId,
          issue: alert.issue,
          severity: alert.severity,
          autoHealed: alert.autoHealed,
          notifiedAt: new Date(),
        },
      });

      // Send email
      await resend.emails.send({
        from: 'AutoForge Monitoring <alerts@autoforge.app>',
        to: alert.userEmail,
        subject: `🚨 Alert: ${alert.appName} is ${alert.severity === 'critical' ? 'DOWN' : 'experiencing issues'}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${alert.severity === 'critical' ? '#DC2626' : '#F59E0B'};">
              ${alert.severity === 'critical' ? '🚨' : '⚠️'} Your app needs attention
            </h2>

            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>App:</strong> ${alert.appName}</p>
              <p><strong>Issue:</strong> ${alert.issue}</p>
              <p><strong>Time:</strong> ${alert.timestamp.toLocaleString()}</p>
              <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
            </div>

            ${alert.autoHealed ? `
              <div style="background: #D1FAE5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #065F46; margin: 0;">
                  ✅ <strong>Good news!</strong> We automatically fixed the issue. Your app should be back online.
                </p>
              </div>
            ` : `
              <div style="background: #FEE2E2; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #991B1B; margin: 0;">
                  ⚠️ We attempted to auto-heal your app, but manual intervention may be required.
                </p>
              </div>

              <a href="https://autoforge.app/admin/apps/${alert.appId}"
                 style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px;">
                View App Dashboard
              </a>
            `}

            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;" />

            <p style="color: #6B7280; font-size: 14px;">
              You're receiving this because monitoring is enabled for your AutoForge apps.
              <a href="https://autoforge.app/settings/notifications" style="color: #3B82F6;">
                Manage notification settings
              </a>
            </p>
          </div>
        `,
      });

      console.log(`   📧 Alert email sent to ${alert.userEmail}`);
    } catch (error) {
      console.error(`   ❌ Failed to send alert:`, error);
    }
  }

  /**
   * Get uptime percentage for an app (last 30 days)
   */
  async getUptimePercentage(appId: string, days: number = 30): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const checks = await prisma.healthCheck.findMany({
      where: {
        managedAppId: appId,
        timestamp: { gte: since },
      },
    });

    if (checks.length === 0) return 100;

    const healthyChecks = checks.filter((c) => c.status === 'healthy').length;
    return (healthyChecks / checks.length) * 100;
  }

  /**
   * Get average response time for an app
   */
  async getAverageResponseTime(appId: string, hours: number = 24): Promise<number> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const checks = await prisma.healthCheck.findMany({
      where: {
        managedAppId: appId,
        timestamp: { gte: since },
        status: { not: 'down' },
      },
      select: {
        responseTime: true,
      },
    });

    if (checks.length === 0) return 0;

    const totalTime = checks.reduce((sum, c) => sum + c.responseTime, 0);
    return Math.round(totalTime / checks.length);
  }

  /**
   * Get downtime incidents for an app
   */
  async getDowntimeIncidents(appId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const incidents = await prisma.monitoringAlert.findMany({
      where: {
        managedAppId: appId,
        severity: 'critical',
        notifiedAt: { gte: since },
      },
      orderBy: {
        notifiedAt: 'desc',
      },
    });

    return incidents;
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();
