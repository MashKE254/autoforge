// src/lib/infrastructure/providers/vercel.ts

interface DeployResult {
  projectId: string;
  deploymentId: string;
  url: string;
}

interface DeployOptions {
  name: string;
  files: Array<{ path: string; content: string }>;
  envVars: Record<string, string>;
  isPreview?: boolean;
}

export class VercelProvisioner {
  private token: string | null;
  private teamId: string | null;
  private simulationMode: boolean;

  constructor() {
    this.simulationMode = process.env.SIMULATE_INFRASTRUCTURE === 'true';

    if (this.simulationMode) {
      console.log('🎭 [VERCEL] Running in simulation mode - no real Vercel calls');
      this.token = null;
      this.teamId = null;
      return;
    }

    const token = process.env.VERCEL_TOKEN;
    const teamId = process.env.VERCEL_TEAM_ID;

    if (!token || !teamId) {
      console.warn('⚠️ VERCEL_TOKEN or VERCEL_TEAM_ID not set - enabling simulation mode');
      this.simulationMode = true;
      this.token = null;
      this.teamId = null;
      return;
    }

    this.token = token;
    this.teamId = teamId;
  }

  async deploy(options: DeployOptions): Promise<DeployResult> {
    // 🎭 SIMULATION MODE
    if (this.simulationMode || !this.token) {
      console.log(`🎭 [VERCEL] Simulating deployment for: ${options.name}`);
      const timestamp = Date.now();
      const deploymentId = `dpl_sim_${timestamp}`;
      const projectId = `prj_sim_${timestamp}`;
      const simulatedUrl = `${options.name}-sim-${timestamp.toString(36)}.vercel.app`;

      // Simulate deployment delay (500ms-1.5s)
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

      return {
        projectId,
        deploymentId,
        url: `https://${simulatedUrl}`,
      };
    }

    // Step 1: Create or get project
    const project = await this.ensureProject(options.name);

    // Step 2: Set environment variables
    await this.setEnvVars(project.id, options.envVars);

    // Step 3: Create deployment
    const deployment = await this.createDeployment(project.id, options.files);

    // Step 4: Wait for deployment to be ready
    await this.waitForDeployment(deployment.id);

    return {
      projectId: project.id,
      deploymentId: deployment.id,
      url: `https://${deployment.url}`,
    };
  }

  private async ensureProject(name: string): Promise<{ id: string; name: string }> {
    // Try to create, will fail if exists
    const response = await fetch('https://api.vercel.com/v9/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        teamId: this.teamId,
        framework: 'nextjs',
      }),
    });

    if (response.ok) {
      return await response.json();
    }

    // Project might already exist, try to get it
    const getResponse = await fetch(
      `https://api.vercel.com/v9/projects/${name}?teamId=${this.teamId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      }
    );

    if (getResponse.ok) {
      return await getResponse.json();
    }

    throw new Error('Failed to create or get Vercel project');
  }

  private async setEnvVars(
    projectId: string, 
    envVars: Record<string, string>
  ): Promise<void> {
    // Delete existing env vars first
    const existingResponse = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/env?teamId=${this.teamId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      }
    );

    if (existingResponse.ok) {
      const existing = await existingResponse.json();
      for (const env of existing.envs || []) {
        await fetch(
          `https://api.vercel.com/v9/projects/${projectId}/env/${env.id}?teamId=${this.teamId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${this.token}`,
            },
          }
        );
      }
    }

    // Set new env vars
    for (const [key, value] of Object.entries(envVars)) {
      if (!value) continue;
      
      await fetch(
        `https://api.vercel.com/v9/projects/${projectId}/env?teamId=${this.teamId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key,
            value,
            type: key.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted',
            target: ['production', 'preview', 'development'],
          }),
        }
      );
    }
  }

  private async createDeployment(
    projectId: string,
    files: Array<{ path: string; content: string }>
  ): Promise<{ id: string; url: string }> {
    // Convert files to Vercel format
    const vercelFiles = files.map(f => ({
      file: f.path,
      data: Buffer.from(f.content).toString('base64'),
      encoding: 'base64',
    }));

    const response = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectId,
        project: projectId,
        teamId: this.teamId,
        files: vercelFiles,
        target: 'production',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Vercel deployment failed: ${JSON.stringify(error)}`);
    }

    return await response.json();
  }

  private async waitForDeployment(deploymentId: string, maxWaitMs = 300000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const response = await fetch(
        `https://api.vercel.com/v13/deployments/${deploymentId}?teamId=${this.teamId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
          },
        }
      );

      const deployment = await response.json();

      if (deployment.readyState === 'READY') {
        return;
      }

      if (deployment.readyState === 'ERROR') {
        throw new Error(`Deployment failed: ${deployment.errorMessage}`);
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    throw new Error('Deployment timed out');
  }

  async deleteProject(projectId: string): Promise<void> {
    await fetch(
      `https://api.vercel.com/v9/projects/${projectId}?teamId=${this.teamId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      }
    );
  }
}