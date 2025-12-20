/**
 * DOCUMENTATION AGENT
 *
 * Generates comprehensive documentation for the application:
 * - README.md with setup instructions
 * - API documentation
 * - Component documentation
 * - Architecture overview
 * - Deployment guide
 * - Contributing guidelines
 */

import Anthropic from '@anthropic-ai/sdk';
import { GeneratedFile } from '../bolt-generator';
import { ArchitectureDesign } from './architect-agent';

export interface DocumentationResult {
  files: GeneratedFile[];
  summary: string;
}

export class DocumentationAgent {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY required');
    this.anthropic = new Anthropic({ apiKey });
  }

  async generate(
    files: GeneratedFile[],
    architecture?: ArchitectureDesign
  ): Promise<DocumentationResult> {
    const docs: GeneratedFile[] = [];

    // Generate README
    const readme = await this.generateREADME(files, architecture);
    docs.push(readme);

    // Generate API docs
    const apiDocs = await this.generateAPIDocs(files);
    if (apiDocs) docs.push(apiDocs);

    // Generate architecture docs
    if (architecture) {
      docs.push(this.generateArchitectureDocs(architecture));
    }

    return {
      files: docs,
      summary: `Generated ${docs.length} documentation files`,
    };
  }

  private async generateREADME(files: GeneratedFile[], architecture?: ArchitectureDesign): Promise<GeneratedFile> {
    const packageJson = files.find(f => f.path === 'package.json');
    let projectName = 'My App';
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson.content);
        projectName = pkg.name || projectName;
      } catch {}
    }

    const hasAuth = files.some(f => f.content.includes('Clerk') || f.content.includes('NextAuth'));
    const hasDatabase = files.some(f => f.path.includes('prisma'));
    const hasStripe = files.some(f => f.content.includes('stripe'));

    return {
      path: 'README.md',
      language: 'markdown',
      content: `# ${projectName}

## Quick Start

\`\`\`bash
# Install dependencies
npm install

${hasDatabase ? `# Setup database
npx prisma generate
npx prisma migrate deploy
` : ''}
# Run development server
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
${hasAuth ? '- **Auth**: Clerk' : ''}
${hasDatabase ? '- **Database**: PostgreSQL + Prisma' : ''}
${hasStripe ? '- **Payments**: Stripe' : ''}

## Environment Variables

Copy \`.env.example\` to \`.env.local\`:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Required variables:
${hasAuth ? '- \`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY\`\n- \`CLERK_SECRET_KEY\`' : ''}
${hasDatabase ? '- \`DATABASE_URL\`' : ''}
${hasStripe ? '- \`STRIPE_SECRET_KEY\`\n- \`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY\`' : ''}

## Project Structure

\`\`\`
/app              # Next.js app directory
  /api            # API routes
  /(routes)       # Page routes
/components       # React components
  /ui             # UI components
/lib              # Utilities and helpers
${hasDatabase ? '/prisma          # Database schema' : ''}
/public           # Static assets
\`\`\`

## Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm start\` - Start production server
- \`npm run lint\` - Run ESLint
- \`npm test\` - Run tests

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import repository in Vercel
3. Add environment variables
4. Deploy

### Docker

\`\`\`bash
docker build -t ${projectName.toLowerCase().replace(/\s+/g, '-')} .
docker run -p 3000:3000 ${projectName.toLowerCase().replace(/\s+/g, '-')}
\`\`\`

## License

MIT
`,
    };
  }

  private async generateAPIDocs(files: GeneratedFile[]): Promise<GeneratedFile | null> {
    const apiRoutes = files.filter(f => f.path.includes('/api/') && f.path.endsWith('route.ts'));
    if (apiRoutes.length === 0) return null;

    const routes = apiRoutes.map(f => {
      const path = f.path.replace('/app/api/', '/api/').replace('/route.ts', '');
      return `- \`${path}\``;
    }).join('\n');

    return {
      path: 'docs/API.md',
      language: 'markdown',
      content: `# API Documentation

## Endpoints

${routes}

## Authentication

API routes require authentication using Clerk.

Include the session token in requests:

\`\`\`javascript
fetch('/api/endpoint', {
  headers: {
    Authorization: \`Bearer \${sessionToken}\`
  }
})
\`\`\`
`,
    };
  }

  private generateArchitectureDocs(architecture: ArchitectureDesign): GeneratedFile {
    return {
      path: 'docs/ARCHITECTURE.md',
      language: 'markdown',
      content: `# Architecture Overview

## Tech Stack

${Object.entries(architecture.techStack).map(([key, value]) =>
  `- **${key}**: ${value}`
).join('\n')}

## Database Schema

${architecture.databaseSchema.models.map(model =>
  `### ${model.name}\n\n${model.fields.map(f =>
    `- ${f.name}: ${f.type}${f.required ? ' (required)' : ''}`
  ).join('\n')}`
).join('\n\n')}

## API Architecture

Type: ${architecture.apiArchitecture.type}

Endpoints:
${architecture.apiArchitecture.endpoints.map(e =>
  `- ${e.method} ${e.path} - ${e.description}`
).join('\n')}

## Deployment

- **Platform**: ${architecture.deploymentPlan.platform}
- **CI/CD**: ${architecture.deploymentPlan.cicd ? 'Enabled' : 'Manual'}
`,
    };
  }
}

export const documentationAgent = new DocumentationAgent();
