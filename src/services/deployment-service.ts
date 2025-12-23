/**
 * Deployment Service - PHASE 3: MANAGED PLATFORM
 *
 * File: src/services/deployment-service.ts
 *
 * Purpose:
 * - Deploy apps to Vercel with one click
 * - Inject managed platform credentials automatically
 * - Configure subdomains (my-app.autoforge.app)
 * - No manual configuration needed!
 *
 * User Experience:
 * 1. User: "Build me a CRM"
 * 2. AutoForge generates code
 * 3. User clicks "Publish"
 * 4. This service:
 *    - Pushes code to GitHub
 *    - Creates Vercel project
 *    - Injects environment variables
 *    - Configures subdomain
 * 5. User gets: "Your app is live at my-crm.autoforge.app"
 */

import { prisma } from '@/lib/prisma';

export interface DeploymentResult {
  success: boolean;
  deploymentUrl?: string;
  vercelProjectId?: string;
  vercelDeploymentId?: string;
  subdomain?: string;
  error?: string;
}

export interface DeploymentConfig {
  appId: string;
  appName: string;
  subdomain: string;
  files: Array<{ path: string; content: string }>;
  databaseConnectionString: string;
  apiKey: string;
  appSecret: string;
}

// ============================================================================
// Deploy App to Vercel
// ============================================================================

export async function deployToVercel(
  config: DeploymentConfig
): Promise<DeploymentResult> {
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 DEPLOYING TO VERCEL`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   App: ${config.appName}`);
    console.log(`   Subdomain: ${config.subdomain}.autoforge.app`);

    // 1. Create GitHub repository
    const githubRepo = await createGitHubRepository(config);
    if (!githubRepo.success) {
      throw new Error(`GitHub creation failed: ${githubRepo.error}`);
    }
    console.log(`   ✅ GitHub repo created: ${githubRepo.repoUrl}`);

    // 2. Push code to GitHub
    const codePush = await pushCodeToGitHub(
      githubRepo.repoName!,
      config.files
    );
    if (!codePush.success) {
      throw new Error(`Code push failed: ${codePush.error}`);
    }
    console.log(`   ✅ Code pushed to GitHub`);

    // 3. Create Vercel project
    const vercelProject = await createVercelProject(
      config,
      githubRepo.repoName!
    );
    if (!vercelProject.success) {
      throw new Error(`Vercel project creation failed: ${vercelProject.error}`);
    }
    console.log(`   ✅ Vercel project created: ${vercelProject.projectId}`);

    // 4. Configure environment variables
    const envConfig = await configureEnvironmentVariables(
      vercelProject.projectId!,
      config
    );
    if (!envConfig.success) {
      throw new Error(`Environment config failed: ${envConfig.error}`);
    }
    console.log(`   ✅ Environment variables configured`);

    // 5. Trigger deployment
    const deployment = await triggerVercelDeployment(
      vercelProject.projectId!
    );
    if (!deployment.success) {
      throw new Error(`Deployment failed: ${deployment.error}`);
    }
    console.log(`   ✅ Deployment triggered: ${deployment.deploymentId}`);

    // 6. Configure custom domain (subdomain)
    const domainConfig = await configureSubdomain(
      vercelProject.projectId!,
      config.subdomain
    );
    if (!domainConfig.success) {
      console.warn(`   ⚠️  Subdomain config failed: ${domainConfig.error}`);
      // Don't fail deployment for domain issues
    } else {
      console.log(`   ✅ Subdomain configured: ${config.subdomain}.autoforge.app`);
    }

    // 7. Wait for deployment to be ready
    const deploymentUrl = await waitForDeployment(deployment.deploymentId!);
    console.log(`   ✅ Deployment ready: ${deploymentUrl}`);

    console.log(`${'='.repeat(80)}\n`);

    return {
      success: true,
      deploymentUrl,
      vercelProjectId: vercelProject.projectId,
      vercelDeploymentId: deployment.deploymentId,
      subdomain: `${config.subdomain}.autoforge.app`,
    };
  } catch (error) {
    console.error('❌ Deployment failed:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// GitHub Repository Creation
// ============================================================================

async function createGitHubRepository(config: DeploymentConfig): Promise<{
  success: boolean;
  repoName?: string;
  repoUrl?: string;
  error?: string;
}> {
  try {
    // Use GitHub API to create repository
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN not configured');
    }

    const repoName = `autoforge-${config.subdomain}`;

    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json',
      },
      body: JSON.stringify({
        name: repoName,
        description: `AutoForge managed app: ${config.appName}`,
        private: false, // Can make private if needed
        auto_init: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'GitHub API error');
    }

    const repo = await response.json();

    return {
      success: true,
      repoName: repo.name,
      repoUrl: repo.html_url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Push Code to GitHub
// ============================================================================

async function pushCodeToGitHub(
  repoName: string,
  files: Array<{ path: string; content: string }>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use GitHub API to create/update files
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_USERNAME = process.env.GITHUB_USERNAME;

    if (!GITHUB_TOKEN || !GITHUB_USERNAME) {
      throw new Error('GitHub credentials not configured');
    }

    // Create initial commit with all files
    // This uses GitHub's Contents API to create files
    for (const file of files) {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_USERNAME}/${repoName}/contents/${file.path}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github+json',
          },
          body: JSON.stringify({
            message: `Add ${file.path}`,
            content: Buffer.from(file.content).toString('base64'),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error(`Failed to push ${file.path}:`, error);
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Create Vercel Project
// ============================================================================

async function createVercelProject(
  config: DeploymentConfig,
  repoName: string
): Promise<{
  success: boolean;
  projectId?: string;
  error?: string;
}> {
  try {
    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

    if (!VERCEL_TOKEN) {
      throw new Error('VERCEL_TOKEN not configured');
    }

    const response = await fetch('https://api.vercel.com/v9/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: config.subdomain,
        framework: 'nextjs',
        gitRepository: {
          type: 'github',
          repo: `${process.env.GITHUB_USERNAME}/${repoName}`,
        },
        ...(VERCEL_TEAM_ID && { teamId: VERCEL_TEAM_ID }),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Vercel API error');
    }

    const project = await response.json();

    return {
      success: true,
      projectId: project.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Configure Environment Variables
// ============================================================================

async function configureEnvironmentVariables(
  projectId: string,
  config: DeploymentConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

    if (!VERCEL_TOKEN) {
      throw new Error('VERCEL_TOKEN not configured');
    }

    // Environment variables to inject into the app
    const envVars = [
      // Database
      {
        key: 'DATABASE_URL',
        value: config.databaseConnectionString,
        type: 'encrypted',
        target: ['production', 'preview', 'development'],
      },
      // Managed app credentials
      {
        key: 'NEXT_PUBLIC_APP_ID',
        value: config.appId,
        type: 'plain',
        target: ['production', 'preview', 'development'],
      },
      {
        key: 'APP_SECRET',
        value: config.appSecret,
        type: 'encrypted',
        target: ['production', 'preview', 'development'],
      },
      // AI Proxy endpoint
      {
        key: 'NEXT_PUBLIC_AI_PROXY_URL',
        value: process.env.NEXT_PUBLIC_APP_URL
          ? `${process.env.NEXT_PUBLIC_APP_URL}/api/proxy/ai`
          : 'https://autoforge.dev/api/proxy/ai',
        type: 'plain',
        target: ['production', 'preview', 'development'],
      },
    ];

    // Create environment variables
    for (const envVar of envVars) {
      const response = await fetch(
        `https://api.vercel.com/v10/projects/${projectId}/env?${VERCEL_TEAM_ID ? `teamId=${VERCEL_TEAM_ID}` : ''}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(envVar),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error(`Failed to set ${envVar.key}:`, error);
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Trigger Vercel Deployment
// ============================================================================

async function triggerVercelDeployment(
  projectId: string
): Promise<{
  success: boolean;
  deploymentId?: string;
  error?: string;
}> {
  try {
    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

    if (!VERCEL_TOKEN) {
      throw new Error('VERCEL_TOKEN not configured');
    }

    const response = await fetch(
      `https://api.vercel.com/v13/deployments?${VERCEL_TEAM_ID ? `teamId=${VERCEL_TEAM_ID}` : ''}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectId,
          project: projectId,
          target: 'production',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Deployment trigger failed');
    }

    const deployment = await response.json();

    return {
      success: true,
      deploymentId: deployment.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Configure Subdomain
// ============================================================================

async function configureSubdomain(
  projectId: string,
  subdomain: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

    if (!VERCEL_TOKEN) {
      throw new Error('VERCEL_TOKEN not configured');
    }

    // Add custom domain to project
    const domain = `${subdomain}.autoforge.app`;

    const response = await fetch(
      `https://api.vercel.com/v10/projects/${projectId}/domains?${VERCEL_TEAM_ID ? `teamId=${VERCEL_TEAM_ID}` : ''}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: domain,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Domain configuration failed');
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Wait for Deployment to Complete
// ============================================================================

async function waitForDeployment(
  deploymentId: string,
  maxWaitTime: number = 300000 // 5 minutes
): Promise<string> {
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN not configured');
  }

  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const response = await fetch(
      `https://api.vercel.com/v13/deployments/${deploymentId}?${VERCEL_TEAM_ID ? `teamId=${VERCEL_TEAM_ID}` : ''}`,
      {
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
        },
      }
    );

    if (response.ok) {
      const deployment = await response.json();

      if (deployment.readyState === 'READY') {
        return deployment.url;
      }

      if (deployment.readyState === 'ERROR') {
        throw new Error('Deployment failed');
      }
    }

    // Wait 5 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error('Deployment timeout');
}

// ============================================================================
// Delete Deployment (for cleanup)
// ============================================================================

export async function deleteDeployment(
  projectId: string,
  repoName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
    const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

    // Delete Vercel project
    if (VERCEL_TOKEN) {
      await fetch(
        `https://api.vercel.com/v9/projects/${projectId}?${VERCEL_TEAM_ID ? `teamId=${VERCEL_TEAM_ID}` : ''}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${VERCEL_TOKEN}`,
          },
        }
      );
    }

    // Delete GitHub repository
    if (GITHUB_TOKEN && GITHUB_USERNAME) {
      await fetch(
        `https://api.github.com/repos/${GITHUB_USERNAME}/${repoName}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github+json',
          },
        }
      );
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
