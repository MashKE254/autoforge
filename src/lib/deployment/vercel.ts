// Vercel Deployment Service
// Handles deploying generated apps to Vercel's infrastructure

import { prisma } from '../prisma';

interface DeploymentConfig {
  jobId: string;
  projectName: string;
  files: Array<{ path: string; content: string }>;
  envVars?: Record<string, string>;
}

interface VercelDeploymentResponse {
  id: string;
  url: string;
  inspectorUrl: string;
  readyState: 'QUEUED' | 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';
}

interface VercelDeploymentEvent {
  text?: string;
  payload?: {
    text?: string;
  };
}

export class VercelDeployment {
  private apiUrl = 'https://api.vercel.com';
  private token: string;

  constructor() {
    this.token = process.env.VERCEL_TOKEN || '';
    
    if (!this.token) {
      console.warn('⚠️ VERCEL_TOKEN not set. Deployment will fail.');
    }
  }

  /**
   * Deploy application to Vercel
   */
  async deploy(config: DeploymentConfig): Promise<{
    deploymentId: string;
    url: string;
    inspectorUrl: string;
  }> {
    const { jobId, projectName, files, envVars } = config;

    console.log(`🚀 Deploying ${projectName} to Vercel...`);
    console.log(`📦 Total files: ${files.length}`);

    try {
      // 1. Create deployment
      console.log('📤 Uploading to Vercel...');
      const deployment = await this.createDeployment(projectName, files, envVars);

      // 2. Save to database
      await prisma.deployment.create({
        data: {
          generationJobId: jobId,
          vercelDeploymentId: deployment.id,
          deploymentUrl: `https://${deployment.url}`,
          status: 'BUILDING',
        },
      });

      console.log(`✅ Deployment created: ${deployment.url}`);
      console.log(`🔍 Inspector: ${deployment.inspectorUrl}`);

      return {
        deploymentId: deployment.id,
        url: `https://${deployment.url}`,
        inspectorUrl: deployment.inspectorUrl,
      };
    } catch (error) {
      console.error('❌ Deployment failed:', error);

      // Save error to database
      await prisma.deployment.create({
        data: {
          generationJobId: jobId,
          vercelDeploymentId: 'failed',
          deploymentUrl: '',
          status: 'ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Create deployment via Vercel API
   */
  private async createDeployment(
    projectName: string,
    files: Array<{ path: string; content: string }>,
    envVars?: Record<string, string>
  ): Promise<VercelDeploymentResponse> {
    // Sanitize project name (Vercel requirements)
    const sanitizedName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);

    console.log(`📝 Project name: ${sanitizedName}`);

    // Convert files to Vercel format (base64)
    console.log('🔄 Encoding files...');
    const vercelFiles = files.map(file => {
      const base64Content = Buffer.from(file.content).toString('base64');
      return {
        file: file.path,
        data: base64Content,
        encoding: 'base64',
      };
    });

    console.log(`✅ Encoded ${vercelFiles.length} files`);

    // Build environment variables
    const env = envVars
      ? Object.entries(envVars).map(([key, value]) => ({
          key,
          value,
          type: 'encrypted' as const,
          target: ['production' as const],
        }))
      : [];

    const payload = {
      name: sanitizedName,
      files: vercelFiles,
      projectSettings: {
        framework: 'nextjs',
        buildCommand: 'npm run build',
        outputDirectory: '.next',
        installCommand: 'npm install',
        nodeVersion: '18.x',
      },
      env: env.length > 0 ? env : undefined,
      target: 'production',
    };

    console.log('📡 Sending to Vercel API...');

    const response = await fetch(`${this.apiUrl}/v13/deployments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Vercel API error:', error);
      throw new Error(
        `Vercel API error: ${error.error?.message || JSON.stringify(error)}`
      );
    }

    const deployment = await response.json();
    console.log('✅ Vercel accepted deployment');

    return {
      id: deployment.id,
      url: deployment.url,
      inspectorUrl: deployment.inspectorUrl || `https://vercel.com/dashboard/deployments/${deployment.id}`,
      readyState: deployment.readyState || 'BUILDING',
    };
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(deploymentId: string): Promise<{
    readyState: string;
    url?: string;
    error?: { message: string };
  }> {
    const response = await fetch(
      `${this.apiUrl}/v13/deployments/${deploymentId}`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch deployment status');
    }

    const data = await response.json();
    return {
      readyState: data.readyState,
      url: data.url,
      error: data.error,
    };
  }

  /**
   * Wait for deployment to complete (with polling)
   */
  async waitForDeployment(
    deploymentId: string,
    onProgress?: (attempt: number, maxAttempts: number) => void
  ): Promise<void> {
    const maxAttempts = 60; // 5 minutes (5s intervals)
    
    for (let i = 0; i < maxAttempts; i++) {
      if (onProgress) {
        onProgress(i + 1, maxAttempts);
      }

      const status = await this.getDeploymentStatus(deploymentId);

      if (status.readyState === 'READY') {
        console.log('✅ Deployment ready!');
        return;
      }

      if (status.readyState === 'ERROR') {
        throw new Error(
          `Deployment failed: ${status.error?.message || 'Unknown error'}`
        );
      }

      if (status.readyState === 'CANCELED') {
        throw new Error('Deployment was canceled');
      }

      // Wait 5 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log(
        `⏳ Building... (${i + 1}/${maxAttempts}) - State: ${status.readyState}`
      );
    }

    throw new Error('Deployment timeout - took longer than 5 minutes');
  }

  /**
   * Cancel a deployment
   */
  async cancelDeployment(deploymentId: string): Promise<void> {
    const response = await fetch(
      `${this.apiUrl}/v13/deployments/${deploymentId}/cancel`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to cancel deployment');
    }

    console.log('🛑 Deployment canceled');
  }

  /**
   * Get deployment logs
   */
  async getDeploymentLogs(deploymentId: string): Promise<string[]> {
    const response = await fetch(
      `${this.apiUrl}/v2/deployments/${deploymentId}/events`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch deployment logs');
    }

    const events = await response.json();
    return events.map((event: VercelDeploymentEvent) => event.text || event.payload?.text || '').filter(Boolean);
  }
}