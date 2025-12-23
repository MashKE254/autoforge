/**
 * Managed Code Transformer - Transform generated code for managed platform
 *
 * File: src/services/managed-code-transformer.ts
 *
 * Purpose:
 * - Transform generated code to use AutoForge managed services
 * - Replace user API keys with managed platform credentials
 * - Inject AI proxy endpoints
 * - Configure database connections automatically
 *
 * Before (BYOK):
 * ```
 * // User must provide: ANTHROPIC_API_KEY
 * const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
 * ```
 *
 * After (Managed):
 * ```
 * // AutoForge provides: NEXT_PUBLIC_APP_ID, APP_SECRET
 * const response = await fetch(process.env.NEXT_PUBLIC_AI_PROXY_URL, {
 *   headers: {
 *     'X-App-ID': process.env.NEXT_PUBLIC_APP_ID,
 *     'Authorization': `Bearer ${process.env.APP_SECRET}`,
 *   }
 * })
 * ```
 */

export interface GeneratedFile {
  path: string;
  content: string;
  language?: string;
}

export interface ManagedTransformOptions {
  mode: 'byok' | 'managed'; // BYOK = Bring Your Own Keys, Managed = AutoForge hosts everything
  appId?: string;
}

// ============================================================================
// Transform Files for Managed Mode
// ============================================================================

export function transformFilesForManagedMode(
  files: GeneratedFile[],
  options: ManagedTransformOptions
): GeneratedFile[] {
  if (options.mode === 'byok') {
    // No transformation needed - user provides their own keys
    return files;
  }

  // Transform each file for managed mode
  return files.map(file => ({
    ...file,
    content: transformFileContent(file, options),
  }));
}

// ============================================================================
// Transform Individual File
// ============================================================================

function transformFileContent(
  file: GeneratedFile,
  options: ManagedTransformOptions
): string {
  let content = file.content;

  // 1. Transform Anthropic API calls
  content = transformAnthropicCalls(content);

  // 2. Transform environment variable examples
  content = transformEnvExamples(content);

  // 3. Transform database configuration
  content = transformDatabaseConfig(content);

  // 4. Add managed platform helpers if needed
  if (shouldAddManagedHelpers(file)) {
    content = addManagedPlatformHelpers(content);
  }

  return content;
}

// ============================================================================
// Transform Anthropic API Calls
// ============================================================================

function transformAnthropicCalls(content: string): string {
  // Pattern 1: Direct Anthropic client initialization
  // Before: const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  // After: Use our proxy helper

  content = content.replace(
    /const\s+(\w+)\s*=\s*new\s+Anthropic\s*\(\s*\{[\s\S]*?apiKey:\s*process\.env\.ANTHROPIC_API_KEY[\s\S]*?\}\s*\)/g,
    `// AutoForge Managed Platform - No API key needed!
// Uses AutoForge AI Proxy instead of direct Anthropic API
const $1 = createManagedAIClient()`
  );

  // Pattern 2: Anthropic messages.create calls
  // Replace with proxy calls
  content = content.replace(
    /await\s+(\w+)\.messages\.create\s*\(\s*\{/g,
    'await callManagedAI({'
  );

  return content;
}

// ============================================================================
// Transform .env.example
// ============================================================================

function transformEnvExamples(content: string): string {
  if (!content.includes('.env')) {
    return content;
  }

  // Remove lines requiring user API keys
  const linesToRemove = [
    'ANTHROPIC_API_KEY=',
    'OPENAI_API_KEY=',
    'CLERK_SECRET_KEY=',
    'CLERK_PUBLISHABLE_KEY=',
    'NEXT_PUBLIC_CLERK_',
  ];

  let transformed = content;

  for (const line of linesToRemove) {
    // Remove the line and any comments above it
    transformed = transformed.replace(
      new RegExp(`(#[^\\n]*\\n)?${line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*\\n`, 'g'),
      ''
    );
  }

  // Add managed platform variables
  const managedEnvVars = `
# =============================================================================
# AutoForge Managed Platform (Auto-configured)
# =============================================================================
# These are automatically set when you deploy - no configuration needed!

# Your app's unique ID (auto-injected)
# NEXT_PUBLIC_APP_ID=your-app-id

# Your app's secret key (auto-injected, encrypted)
# APP_SECRET=your-app-secret

# AutoForge AI Proxy endpoint (auto-injected)
# NEXT_PUBLIC_AI_PROXY_URL=https://autoforge.dev/api/proxy/ai

# Database connection (auto-injected, multi-tenant schema)
# DATABASE_URL=postgresql://...
`;

  // Add at the top of .env.example
  return managedEnvVars + '\n' + transformed;
}

// ============================================================================
// Transform Database Configuration
// ============================================================================

function transformDatabaseConfig(content: string): string {
  // Prisma schema files - already configured correctly
  // Just ensure they use DATABASE_URL which we inject

  if (content.includes('datasource db')) {
    // Ensure using DATABASE_URL
    content = content.replace(
      /url\s*=\s*["'].*?["']/,
      'url      = env("DATABASE_URL")'
    );

    // Add comment about managed platform
    if (!content.includes('AutoForge Managed Platform')) {
      content = content.replace(
        /datasource db \{/,
        `datasource db {
  // AutoForge Managed Platform: DATABASE_URL is auto-configured
  // Uses multi-tenant schema isolation for security`
      );
    }
  }

  return content;
}

// ============================================================================
// Check if File Needs Managed Helpers
// ============================================================================

function shouldAddManagedHelpers(file: GeneratedFile): boolean {
  // Add helpers to files that call AI APIs
  const needsHelpers =
    file.content.includes('Anthropic') ||
    file.content.includes('anthropic') ||
    file.content.includes('messages.create') ||
    file.content.includes('chat completion');

  return needsHelpers;
}

// ============================================================================
// Add Managed Platform Helper Functions
// ============================================================================

function addManagedPlatformHelpers(content: string): string {
  // Check if helpers already exist
  if (content.includes('createManagedAIClient') || content.includes('callManagedAI')) {
    return content;
  }

  const helpers = `
// =============================================================================
// AutoForge Managed Platform - AI Proxy Helpers
// =============================================================================
// These helpers allow your app to use AI without requiring API keys!
// All calls go through AutoForge's managed AI proxy.
// =============================================================================

/**
 * Create a managed AI client
 * No API key needed - uses AutoForge proxy!
 */
function createManagedAIClient() {
  return {
    messages: {
      create: async (params: any) => callManagedAI(params),
      stream: async (params: any) => callManagedAIStream(params),
    },
  };
}

/**
 * Call managed AI (non-streaming)
 */
async function callManagedAI(params: {
  model: string;
  max_tokens: number;
  messages: Array<{ role: string; content: string }>;
}) {
  const response = await fetch(process.env.NEXT_PUBLIC_AI_PROXY_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-ID': process.env.NEXT_PUBLIC_APP_ID!,
      'Authorization': \`Bearer \${process.env.APP_SECRET}\`,
    },
    body: JSON.stringify({
      ...params,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'AI request failed');
  }

  return response.json();
}

/**
 * Call managed AI (streaming)
 */
async function callManagedAIStream(params: {
  model: string;
  max_tokens: number;
  messages: Array<{ role: string; content: string }>;
}) {
  const response = await fetch(process.env.NEXT_PUBLIC_AI_PROXY_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-ID': process.env.NEXT_PUBLIC_APP_ID!,
      'Authorization': \`Bearer \${process.env.APP_SECRET}\`,
    },
    body: JSON.stringify({
      ...params,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'AI request failed');
  }

  // Return async iterator for streaming
  return {
    async *[Symbol.asyncIterator]() {
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              yield JSON.parse(data);
            } catch (e) {
              console.error('Failed to parse chunk:', data);
            }
          }
        }
      }
    },
  };
}

/**
 * Check current usage and limits
 */
async function checkManagedAIUsage() {
  const response = await fetch(process.env.NEXT_PUBLIC_AI_PROXY_URL!, {
    method: 'GET',
    headers: {
      'X-App-ID': process.env.NEXT_PUBLIC_APP_ID!,
      'Authorization': \`Bearer \${process.env.APP_SECRET}\`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to check usage');
  }

  return response.json();
}

// =============================================================================
// End of AutoForge Managed Platform Helpers
// =============================================================================
`;

  // Add helpers at the top of the file (after imports)
  const importEndIndex = findImportSectionEnd(content);
  return (
    content.slice(0, importEndIndex) +
    '\n' +
    helpers +
    '\n' +
    content.slice(importEndIndex)
  );
}

// ============================================================================
// Helper: Find End of Import Section
// ============================================================================

function findImportSectionEnd(content: string): number {
  const lines = content.split('\n');
  let lastImportIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (
      line.startsWith('import ') ||
      line.startsWith('export ') ||
      line.startsWith('//') ||
      line.startsWith('/*') ||
      line.startsWith('*') ||
      line === ''
    ) {
      lastImportIndex = i;
    } else if (line.startsWith('const ') || line.startsWith('function ') || line.startsWith('class ')) {
      break;
    }
  }

  // Convert line index to character index
  let charIndex = 0;
  for (let i = 0; i <= lastImportIndex; i++) {
    charIndex += lines[i].length + 1; // +1 for newline
  }

  return charIndex;
}

// ============================================================================
// Generate .env Template for Managed Apps
// ============================================================================

export function generateManagedEnvTemplate(appId: string, appSecret: string): string {
  return `# =============================================================================
# AutoForge Managed Platform - Auto-configured Environment
# =============================================================================
# These variables are automatically injected by AutoForge when you deploy.
# You don't need to set them manually!
#
# For local development, copy these values from your AutoForge dashboard.
# =============================================================================

# Your app's unique identifier
NEXT_PUBLIC_APP_ID=${appId}

# Your app's secret key (keep this secure!)
APP_SECRET=${appSecret}

# AutoForge AI Proxy endpoint
NEXT_PUBLIC_AI_PROXY_URL=https://autoforge.dev/api/proxy/ai

# Database connection (multi-tenant schema)
# This is automatically set to your isolated database schema
DATABASE_URL=postgresql://...

# =============================================================================
# Optional: Custom Configuration
# =============================================================================
# Add any custom environment variables your app needs below
# =============================================================================
`;
}

// ============================================================================
// Update README for Managed Apps
// ============================================================================

export function updateReadmeForManagedMode(content: string): string {
  // Find installation section
  const installSectionRegex = /##\s*Installation.*?(?=##|$)/s;

  const managedInstallSection = `## Installation

### 🎉 Managed by AutoForge

This app is hosted on AutoForge's managed platform - no configuration needed!

**For AutoForge deployment** (recommended):
1. Click "Publish" in the AutoForge dashboard
2. Your app will be automatically deployed to \`your-app.autoforge.app\`
3. All infrastructure (database, AI, authentication) is managed for you!

**For local development**:
1. Clone this repository
2. Copy environment variables from AutoForge dashboard to \`.env.local\`
3. Run \`npm install\`
4. Run \`npm run dev\`

### 🔑 No API Keys Required!

Unlike traditional apps, you don't need to:
- ❌ Sign up for Anthropic API
- ❌ Configure database providers
- ❌ Set up authentication services
- ❌ Manage infrastructure

AutoForge handles all of this for you! 🚀

`;

  if (installSectionRegex.test(content)) {
    return content.replace(installSectionRegex, managedInstallSection);
  }

  // Add section if doesn't exist
  return managedInstallSection + '\n\n' + content;
}

// ============================================================================
// Transform All Files for Managed Mode
// ============================================================================

export function transformAllFilesForManaged(
  files: GeneratedFile[],
  appId: string,
  appSecret: string
): GeneratedFile[] {
  const transformed = transformFilesForManagedMode(files, {
    mode: 'managed',
    appId,
  });

  // Update specific files
  return transformed.map(file => {
    // Update .env.example
    if (file.path === '.env.example' || file.path === '.env.local.example') {
      return {
        ...file,
        content: generateManagedEnvTemplate(appId, appSecret),
      };
    }

    // Update README
    if (file.path === 'README.md') {
      return {
        ...file,
        content: updateReadmeForManagedMode(file.content),
      };
    }

    return file;
  });
}
