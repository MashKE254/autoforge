import { Anthropic } from '@anthropic-ai/sdk';
import { prisma } from '../prisma';
import archiver from 'archiver';

export interface AssembledFile {
  path: string;
  content: string;
  type: 'code' | 'config' | 'doc';
}

interface Blueprint {
  techStack?: {
    frontend?: string;
    database?: string;
    authentication?: string;
  };
  features?: string[];
  architecture?: {
    infrastructure?: string[];
  };
}

interface GeneratedModule {
  module: {
    name: string;
    category: string;
    code: string;
  };
  generatedCode: string | null;
}

export class CodeAssembler {
  private client: Anthropic;
  private jobId: string;

  constructor(jobId: string) {
    this.jobId = jobId;
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    });
  }

  /**
   * Assemble all generated modules into a complete application
   */
  async assemble(): Promise<AssembledFile[]> {
    console.log(`🔨 Assembling application for job ${this.jobId}`);

    // Get job with all generated modules
    const job = await prisma.generationJob.findUnique({
      where: { id: this.jobId },
      include: {
        modules: {
          include: {
            module: true
          }
        }
      }
    });

    if (!job || !job.blueprint) {
      throw new Error('Job or blueprint not found');
    }

    const blueprint = JSON.parse(job.blueprint) as Blueprint;
    const files: AssembledFile[] = [];

    // 1. Create project structure
    console.log('📁 Creating project structure...');
    files.push(...this.createProjectStructure(blueprint));

    // 2. Organize module code into proper file paths
    console.log('📄 Organizing module code...');
    files.push(...await this.organizeModuleCode(job.modules));

    // 3. Generate configuration files
    console.log('⚙️  Generating configuration files...');
    files.push(...await this.generateConfigFiles(blueprint));

    // 4. Generate package.json
    console.log('📦 Generating package.json...');
    files.push(await this.generatePackageJson(blueprint));

    // 5. Generate README
    console.log('📝 Generating README...');
    files.push(await this.generateReadme(blueprint));

    // 6. Generate deployment files
    console.log('🚀 Generating deployment files...');
    files.push(...await this.generateDeploymentFiles(blueprint));

    console.log(`✅ Assembly complete: ${files.length} files created`);

    return files;
  }

  /**
   * Create basic project structure
   */
  private createProjectStructure(blueprint: Blueprint): AssembledFile[] {
    const files: AssembledFile[] = [];

    // .gitignore
    files.push({
      path: '.gitignore',
      content: `# Dependencies
node_modules
.pnp
.pnp.js

# Testing
coverage

# Next.js
.next
out
build
dist

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env
.env*.local

# Vercel
.vercel

# Typescript
*.tsbuildinfo
next-env.d.ts

# IDE
.vscode
.idea
`,
      type: 'config'
    });

    // .env.example
    files.push({
      path: '.env.example',
      content: this.generateEnvExample(blueprint),
      type: 'config'
    });

    // tsconfig.json
    files.push({
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'ES2017',
          lib: ['dom', 'dom.iterable', 'esnext'],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'bundler',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          incremental: true,
          plugins: [
            {
              name: 'next'
            }
          ],
          paths: {
            '@/*': ['./src/*']
          }
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules']
      }, null, 2),
      type: 'config'
    });

    // next.config.js
    files.push({
      path: 'next.config.js',
      content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
`,
      type: 'config'
    });

    // tailwind.config.js (if using Tailwind)
    if (blueprint.techStack?.frontend?.toLowerCase().includes('tailwind')) {
      files.push({
        path: 'tailwind.config.js',
        content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`,
        type: 'config'
      });

      // globals.css
      files.push({
        path: 'src/app/globals.css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;
`,
        type: 'code'
      });
    }

    return files;
  }

  /**
   * Organize module code into proper file paths
   */
  private async organizeModuleCode(modules: GeneratedModule[]): Promise<AssembledFile[]> {
    const files: AssembledFile[] = [];

    for (const genModule of modules) {
      const moduleData = genModule.module;
      const code = genModule.generatedCode || moduleData.code;

      // Determine file path based on module category and name
      const filePath = this.determineFilePath(moduleData.name, moduleData.category);

      files.push({
        path: filePath,
        content: code,
        type: 'code'
      });
    }

    return files;
  }

  /**
   * Determine appropriate file path for a module
   */
  private determineFilePath(moduleName: string, category: string): string {
    const cleanName = moduleName.toLowerCase().replace(/\s+/g, '-');

    switch (category) {
      case 'AUTH':
        return `src/lib/auth/${cleanName}.ts`;
      case 'PAYMENT':
        return `src/lib/payments/${cleanName}.ts`;
      case 'DATABASE':
        return `src/lib/database/${cleanName}.ts`;
      case 'API':
        return `src/app/api/${cleanName}/route.ts`;
      case 'UI':
        return `src/components/${cleanName}.tsx`;
      case 'WORKFLOW':
        return `src/lib/workflows/${cleanName}.ts`;
      case 'INFRASTRUCTURE':
        return `src/lib/config/${cleanName}.ts`;
      case 'UTILITY':
        return `src/lib/utils/${cleanName}.ts`;
      default:
        return `src/lib/${cleanName}.ts`;
    }
  }

  /**
   * Generate environment variable example
   */
  private generateEnvExample(blueprint: Blueprint): string {
    const envVars: string[] = [
      '# Database',
      'DATABASE_URL="your-database-url"',
      '',
      '# Next Auth',
      'NEXTAUTH_URL="http://localhost:3000"',
      'NEXTAUTH_SECRET="your-secret-key"',
      ''
    ];

    // Add based on features
    if (blueprint.features?.some((f: string) => f.toLowerCase().includes('auth'))) {
      envVars.push('# OAuth Providers');
      envVars.push('GITHUB_CLIENT_ID=""');
      envVars.push('GITHUB_CLIENT_SECRET=""');
      envVars.push('GOOGLE_CLIENT_ID=""');
      envVars.push('GOOGLE_CLIENT_SECRET=""');
      envVars.push('');
    }

    if (blueprint.features?.some((f: string) => f.toLowerCase().includes('payment'))) {
      envVars.push('# Stripe');
      envVars.push('STRIPE_SECRET_KEY=""');
      envVars.push('STRIPE_PUBLISHABLE_KEY=""');
      envVars.push('STRIPE_WEBHOOK_SECRET=""');
      envVars.push('');
    }

    return envVars.join('\n');
  }

  /**
   * Generate configuration files (Prisma, etc.)
   */
  private async generateConfigFiles(blueprint: Blueprint): Promise<AssembledFile[]> {
    const files: AssembledFile[] = [];

    // Generate Prisma schema if using database
    if (blueprint.techStack?.database?.toLowerCase().includes('prisma')) {
      const schema = await this.generatePrismaSchema(blueprint);
      files.push({
        path: 'prisma/schema.prisma',
        content: schema,
        type: 'config'
      });
    }

    return files;
  }

  /**
   * Generate Prisma schema
   * ALWAYS uses Claude for fast, reliable generation
   */
  private async generatePrismaSchema(blueprint: Blueprint): Promise<string> {
    const prompt = `Generate a complete Prisma schema for this application:

Blueprint: ${JSON.stringify(blueprint, null, 2)}

Requirements:
1. Use PostgreSQL as the provider
2. Include all necessary models based on the blueprint features
3. Add proper relations between models
4. Include createdAt and updatedAt timestamps where appropriate
5. Add appropriate indexes for performance
6. Use proper field types (String, Int, DateTime, Boolean, etc.)
7. Keep it simple and focused - only essential models

Return ONLY the Prisma schema code, no markdown, no explanations.`;

    // ALWAYS use Claude for config file generation (fast and reliable)
    console.log('☁️  Using Claude for Prisma schema generation');
    
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response');
    }

    return content.text.trim();
  }

  /**
   * Generate package.json
   */
  private async generatePackageJson(blueprint: Blueprint): Promise<AssembledFile> {
    const dependencies: Record<string, string> = {
      'next': '^14.0.0',
      'react': '^18.2.0',
      'react-dom': '^18.2.0'
    };

    const devDependencies: Record<string, string> = {
      '@types/node': '^20.0.0',
      '@types/react': '^18.2.0',
      '@types/react-dom': '^18.2.0',
      'typescript': '^5.0.0',
      'eslint': '^8.0.0',
      'eslint-config-next': '^14.0.0'
    };

    // Add dependencies based on tech stack
    if (blueprint.techStack?.frontend?.toLowerCase().includes('tailwind')) {
      dependencies['tailwindcss'] = '^3.3.0';
      dependencies['autoprefixer'] = '^10.4.0';
      dependencies['postcss'] = '^8.4.0';
    }

    if (blueprint.techStack?.database?.toLowerCase().includes('prisma')) {
      dependencies['@prisma/client'] = '^5.0.0';
      devDependencies['prisma'] = '^5.0.0';
    }

    if (blueprint.techStack?.authentication?.toLowerCase().includes('nextauth')) {
      dependencies['next-auth'] = '^4.24.0';
    }

    // Add common utilities
    dependencies['zod'] = '^3.22.0';
    dependencies['clsx'] = '^2.0.0';

    const packageJson = {
      name: blueprint.techStack?.frontend?.toLowerCase().replace(/\s+/g, '-') || 'my-app',
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint',
        'prisma:generate': 'prisma generate',
        'prisma:push': 'prisma db push',
        'prisma:studio': 'prisma studio'
      },
      dependencies,
      devDependencies
    };

    return {
      path: 'package.json',
      content: JSON.stringify(packageJson, null, 2),
      type: 'config'
    };
  }

  /**
   * Generate README
   * ALWAYS uses Claude for fast, quality documentation
   */
  private async generateReadme(blueprint: Blueprint): Promise<AssembledFile> {
    const prompt = `Generate a comprehensive README.md for this application:

Blueprint: ${JSON.stringify(blueprint, null, 2)}

Include:
1. Project title and description
2. Features list
3. Tech stack
4. Prerequisites
5. Installation steps
6. Environment variables setup
7. Running the application
8. Project structure overview
9. Deployment instructions

Use proper Markdown formatting. Be concise but comprehensive.`;

    // ALWAYS use Claude for documentation (fast and high quality)
    console.log('☁️  Using Claude for README generation');
    
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const claudeContent = response.content[0];
    if (claudeContent.type !== 'text') {
      throw new Error('Expected text response');
    }

    return {
      path: 'README.md',
      content: claudeContent.text.trim(),
      type: 'doc'
    };
  }

  /**
   * Generate deployment files
   */
  private async generateDeploymentFiles(blueprint: Blueprint): Promise<AssembledFile[]> {
    const files: AssembledFile[] = [];

    // Dockerfile
    if (blueprint.architecture?.infrastructure?.some((i: string) => 
      i.toLowerCase().includes('docker')
    )) {
      files.push({
        path: 'Dockerfile',
        content: `FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
`,
        type: 'config'
      });

      files.push({
        path: '.dockerignore',
        content: `node_modules
.next
.git
*.log
.env*.local
`,
        type: 'config'
      });
    }

    // Vercel config
    files.push({
      path: 'vercel.json',
      content: JSON.stringify({
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
        installCommand: 'npm install',
        framework: 'nextjs'
      }, null, 2),
      type: 'config'
    });

    return files;
  }

  /**
   * Create ZIP archive of all files
   */
  async createZipArchive(files: AssembledFile[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      // Add all files to archive
      for (const file of files) {
        archive.append(file.content, { name: file.path });
      }

      archive.finalize();
    });
  }
}