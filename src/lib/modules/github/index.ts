/**
 * GitHub Integration Module
 *
 * Provides GitHub API access, webhook handling, and PR automation
 * for generated applications
 */

import { githubTemplate } from './template';

export interface GitHubModuleConfig {
  features: Array<'oauth' | 'webhooks' | 'pr-automation' | 'repo-access' | 'workflow-monitoring'>;
  scopes?: string[];
}

export interface GitHubModuleOutput {
  files: Array<{
    path: string;
    content: string;
  }>;
  envVars: string[];
  dependencies: string[];
  instructions: string[];
}

/**
 * Generate GitHub integration files for an application
 */
export function generateGitHubModule(config: GitHubModuleConfig): GitHubModuleOutput {
  const files: Array<{ path: string; content: string }> = [];
  const envVars: string[] = [];
  const dependencies = ['@octokit/rest', '@octokit/webhooks'];
  const instructions: string[] = [];

  // Always include base client
  files.push({
    path: 'lib/github/client.ts',
    content: githubTemplate.client,
  });

  files.push({
    path: 'lib/github/types.ts',
    content: githubTemplate.types,
  });

  // API route for GitHub operations
  files.push({
    path: 'app/api/github/route.ts',
    content: githubTemplate.apiRoute,
  });

  envVars.push('GITHUB_TOKEN');
  instructions.push('Create a GitHub Personal Access Token with repo and workflow scopes at https://github.com/settings/tokens');

  // OAuth authentication
  if (config.features.includes('oauth')) {
    files.push({
      path: 'lib/auth/github-provider.ts',
      content: githubTemplate.authConfig,
    });

    envVars.push('GITHUB_ID', 'GITHUB_SECRET');
    instructions.push('Create a GitHub OAuth App at https://github.com/settings/developers');
    instructions.push('Add the callback URL: http://localhost:3000/api/auth/callback/github');
  }

  // Webhook handling
  if (config.features.includes('webhooks')) {
    files.push({
      path: 'app/api/github/webhook/route.ts',
      content: githubTemplate.webhook,
    });

    envVars.push('GITHUB_WEBHOOK_SECRET');
    instructions.push('Generate a webhook secret: openssl rand -hex 32');
    instructions.push('Configure webhook URL in GitHub repository settings: https://your-domain.com/api/github/webhook');
    instructions.push('Select events: push, pull_request, workflow_run');
  }

  // PR automation
  if (config.features.includes('pr-automation')) {
    files.push({
      path: 'lib/github/pr-automation.ts',
      content: githubTemplate.prAutomation,
    });

    instructions.push('Ensure your GitHub token has write access to repositories for PR automation');
  }

  return {
    files,
    envVars,
    dependencies,
    instructions,
  };
}

/**
 * Get GitHub module prompt for AI generation
 */
export function getGitHubModulePrompt(config: GitHubModuleConfig): string {
  return `
## GitHub Integration Module

Include complete GitHub integration with the following features:
${config.features.map(f => `- ${f}`).join('\n')}

### Required Files:
1. lib/github/client.ts - Octokit client wrapper with helper functions
2. lib/github/types.ts - TypeScript types for GitHub API responses
3. app/api/github/route.ts - API route for GitHub operations

${config.features.includes('oauth') ? `4. lib/auth/github-provider.ts - NextAuth GitHub OAuth provider` : ''}
${config.features.includes('webhooks') ? `5. app/api/github/webhook/route.ts - Webhook receiver with signature verification` : ''}
${config.features.includes('pr-automation') ? `6. lib/github/pr-automation.ts - PR creation and automation helpers` : ''}

### GitHub Client Functions:
- getRepository(owner, repo) - Fetch repository details
- listRepositories(username) - List user repositories
- getCommits(owner, repo) - Get recent commits
- getPullRequests(owner, repo, state) - List pull requests
- getWorkflowRuns(owner, repo) - Get GitHub Actions workflow runs

${config.features.includes('pr-automation') ? `
### PR Automation Functions:
- createPullRequest(owner, repo, title, body, head, base) - Create new PR
- createBranch(owner, repo, branchName, fromBranch) - Create new branch
- createOrUpdateFile(owner, repo, path, content, message, branch) - Update file in repo
- addPRComment(owner, repo, pull_number, body) - Add comment to PR
- addPRReview(owner, repo, pull_number, body, event) - Add review to PR
- mergePullRequest(owner, repo, pull_number, merge_method) - Merge PR
` : ''}

${config.features.includes('webhooks') ? `
### Webhook Events:
- push - Handle push events
- pull_request - Handle PR opened/closed/updated
- workflow_run - Handle GitHub Actions completion
` : ''}

### Environment Variables:
${envVars.map(v => `- ${v}`).join('\n')}

### Setup Instructions:
${instructions.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}
`;
}

export { githubTemplate };
