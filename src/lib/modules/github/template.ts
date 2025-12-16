/**
 * GitHub Module Templates
 *
 * Code templates for GitHub integration that will be generated into applications
 */

export const githubTemplate = {
  // GitHub client setup with Octokit
  client: `import { Octokit } from '@octokit/rest';

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function getRepository(owner: string, repo: string) {
  try {
    const { data } = await octokit.repos.get({ owner, repo });
    return data;
  } catch (error) {
    console.error('Error fetching repository:', error);
    throw error;
  }
}

export async function listRepositories(username: string) {
  try {
    const { data } = await octokit.repos.listForUser({
      username,
      sort: 'updated',
      per_page: 100,
    });
    return data;
  } catch (error) {
    console.error('Error listing repositories:', error);
    throw error;
  }
}

export async function getCommits(owner: string, repo: string, per_page = 10) {
  try {
    const { data } = await octokit.repos.listCommits({
      owner,
      repo,
      per_page,
    });
    return data;
  } catch (error) {
    console.error('Error fetching commits:', error);
    throw error;
  }
}

export async function getPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') {
  try {
    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state,
      per_page: 100,
    });
    return data;
  } catch (error) {
    console.error('Error fetching pull requests:', error);
    throw error;
  }
}

export async function getWorkflowRuns(owner: string, repo: string) {
  try {
    const { data } = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 20,
    });
    return data.workflow_runs;
  } catch (error) {
    console.error('Error fetching workflow runs:', error);
    throw error;
  }
}
`,

  // Webhook handler
  webhook: `import { Webhooks, createNodeMiddleware } from '@octokit/webhooks';
import { NextRequest, NextResponse } from 'next/server';

const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET!,
});

// Handle push events
webhooks.on('push', async ({ payload }) => {
  console.log('Push event received:', {
    repo: payload.repository.full_name,
    ref: payload.ref,
    commits: payload.commits.length,
  });

  // Add your custom logic here
  // Example: trigger deployment, run tests, etc.
});

// Handle pull request events
webhooks.on('pull_request', async ({ payload }) => {
  console.log('Pull request event received:', {
    action: payload.action,
    pr: payload.pull_request.number,
    title: payload.pull_request.title,
  });

  // Add your custom logic here
  // Example: run code review, add labels, etc.
});

// Handle workflow run completion
webhooks.on('workflow_run', async ({ payload }) => {
  if (payload.action === 'completed') {
    console.log('Workflow run completed:', {
      workflow: payload.workflow_run.name,
      conclusion: payload.workflow_run.conclusion,
      status: payload.workflow_run.status,
    });

    // Add your custom logic here
    // Example: send notifications, update status, etc.
  }
});

// API route handler
export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    await webhooks.verifyAndReceive({
      id: req.headers.get('x-github-delivery')!,
      name: req.headers.get('x-github-event') as any,
      signature,
      payload,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
`,

  // PR automation helpers
  prAutomation: `import { octokit } from './client';

export async function createPullRequest(
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string = 'main'
) {
  try {
    const { data } = await octokit.pulls.create({
      owner,
      repo,
      title,
      body,
      head,
      base,
    });

    console.log('Pull request created:', data.html_url);
    return data;
  } catch (error) {
    console.error('Error creating pull request:', error);
    throw error;
  }
}

export async function createBranch(
  owner: string,
  repo: string,
  branchName: string,
  fromBranch: string = 'main'
) {
  try {
    // Get the SHA of the base branch
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: \`heads/\${fromBranch}\`,
    });

    const sha = refData.object.sha;

    // Create new branch
    const { data } = await octokit.git.createRef({
      owner,
      repo,
      ref: \`refs/heads/\${branchName}\`,
      sha,
    });

    console.log('Branch created:', branchName);
    return data;
  } catch (error) {
    console.error('Error creating branch:', error);
    throw error;
  }
}

export async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string
) {
  try {
    // Check if file exists
    let sha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });
      if ('sha' in data) {
        sha = data.sha;
      }
    } catch (error) {
      // File doesn't exist, that's fine
    }

    // Create or update file
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
      ...(sha && { sha }),
    });

    console.log('File updated:', path);
    return data;
  } catch (error) {
    console.error('Error updating file:', error);
    throw error;
  }
}

export async function addPRComment(
  owner: string,
  repo: string,
  pull_number: number,
  body: string
) {
  try {
    const { data } = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pull_number,
      body,
    });

    console.log('Comment added to PR #' + pull_number);
    return data;
  } catch (error) {
    console.error('Error adding PR comment:', error);
    throw error;
  }
}

export async function addPRReview(
  owner: string,
  repo: string,
  pull_number: number,
  body: string,
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' = 'COMMENT',
  comments: Array<{
    path: string;
    position: number;
    body: string;
  }> = []
) {
  try {
    const { data } = await octokit.pulls.createReview({
      owner,
      repo,
      pull_number,
      body,
      event,
      comments: comments.length > 0 ? comments : undefined,
    });

    console.log('Review added to PR #' + pull_number);
    return data;
  } catch (error) {
    console.error('Error adding PR review:', error);
    throw error;
  }
}

export async function mergePullRequest(
  owner: string,
  repo: string,
  pull_number: number,
  merge_method: 'merge' | 'squash' | 'rebase' = 'squash'
) {
  try {
    const { data } = await octokit.pulls.merge({
      owner,
      repo,
      pull_number,
      merge_method,
    });

    console.log('Pull request merged:', pull_number);
    return data;
  } catch (error) {
    console.error('Error merging pull request:', error);
    throw error;
  }
}
`,

  // API route for GitHub operations
  apiRoute: `import { NextRequest, NextResponse } from 'next/server';
import { getRepository, listRepositories, getCommits, getPullRequests } from '@/lib/github/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (!action) {
      return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 });
    }

    switch (action) {
      case 'list-repos':
        if (!owner) {
          return NextResponse.json({ error: 'Missing owner parameter' }, { status: 400 });
        }
        const repos = await listRepositories(owner);
        return NextResponse.json({ repos });

      case 'get-repo':
        if (!owner || !repo) {
          return NextResponse.json({ error: 'Missing owner or repo parameter' }, { status: 400 });
        }
        const repoData = await getRepository(owner, repo);
        return NextResponse.json({ repo: repoData });

      case 'get-commits':
        if (!owner || !repo) {
          return NextResponse.json({ error: 'Missing owner or repo parameter' }, { status: 400 });
        }
        const commits = await getCommits(owner, repo);
        return NextResponse.json({ commits });

      case 'get-prs':
        if (!owner || !repo) {
          return NextResponse.json({ error: 'Missing owner or repo parameter' }, { status: 400 });
        }
        const state = (searchParams.get('state') as 'open' | 'closed' | 'all') || 'open';
        const prs = await getPullRequests(owner, repo, state);
        return NextResponse.json({ prs });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
`,

  // GitHub OAuth provider configuration
  authConfig: `import GithubProvider from 'next-auth/providers/github';

export const githubAuthProvider = GithubProvider({
  clientId: process.env.GITHUB_ID!,
  clientSecret: process.env.GITHUB_SECRET!,
  authorization: {
    params: {
      scope: 'read:user user:email repo workflow',
    },
  },
});
`,

  // Environment variables template
  envTemplate: `# GitHub Configuration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# GitHub OAuth (for NextAuth)
GITHUB_ID=your_github_oauth_app_id
GITHUB_SECRET=your_github_oauth_app_secret
`,

  // TypeScript types
  types: `export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  updated_at: string;
  pushed_at: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  html_url: string;
  author: {
    login: string;
    avatar_url: string;
  } | null;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  head_branch: string;
  head_sha: string;
}
`,
};
