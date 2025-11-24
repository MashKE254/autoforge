import { Anthropic } from '@anthropic-ai/sdk';
import { moduleStore } from './module-store';

type ModuleCategory = 'AUTH' | 'PAYMENT' | 'DATABASE' | 'UI' | 'API' | 'WORKFLOW' | 'AGENT' | 'INFRASTRUCTURE' | 'UTILITY' | 'TESTING';

interface ModuleTemplate {
  name: string;
  description: string;
  category: ModuleCategory;
  tags: string[];
  dependencies?: string[];
}

export class ModuleSeeder {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    });
  }

  /**
   * Generate a single module using Claude
   */
  async generateModule(template: ModuleTemplate): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `Generate a production-ready TypeScript module for Build.now.

Module Name: ${template.name}
Category: ${template.category}
Description: ${template.description}
Tags: ${template.tags.join(', ')}

Requirements:
1. Full TypeScript with strict types
2. Comprehensive error handling
3. Input validation
4. JSDoc comments for all exports
5. Production-ready, secure code
6. Follow Next.js 16 best practices
7. Include proper imports

Return ONLY the TypeScript code, no markdown, no explanations.`
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude');
    }

    return content.text;
  }

  /**
   * Seed initial module library with essential modules
   */
  async seedEssentialModules(): Promise<void> {
    console.log('🌱 Seeding essential modules...');

    const essentialModules: ModuleTemplate[] = [
      // Authentication modules
      {
        name: 'nextauth-config',
        description: 'NextAuth configuration with multiple providers',
        category: 'AUTH',
        tags: ['authentication', 'nextauth', 'oauth']
      },
      {
        name: 'jwt-auth-middleware',
        description: 'JWT authentication middleware for API routes',
        category: 'AUTH',
        tags: ['jwt', 'middleware', 'api', 'authentication']
      },
      {
        name: 'session-management',
        description: 'User session management with Redis',
        category: 'AUTH',
        tags: ['session', 'redis', 'cache']
      },

      // Database modules
      {
        name: 'prisma-client-init',
        description: 'Prisma client initialization with connection pooling',
        category: 'DATABASE',
        tags: ['prisma', 'database', 'postgresql']
      },
      {
        name: 'database-migrations',
        description: 'Database migration utilities',
        category: 'DATABASE',
        tags: ['prisma', 'migrations', 'database']
      },

      // Payment modules
      {
        name: 'stripe-checkout',
        description: 'Stripe checkout session creation',
        category: 'PAYMENT',
        tags: ['stripe', 'payment', 'checkout']
      },
      {
        name: 'stripe-webhooks',
        description: 'Stripe webhook handling with signature verification',
        category: 'PAYMENT',
        tags: ['stripe', 'webhooks', 'payment']
      },
      {
        name: 'subscription-management',
        description: 'Subscription lifecycle management',
        category: 'PAYMENT',
        tags: ['stripe', 'subscription', 'billing']
      },

      // UI Components
      {
        name: 'button-component',
        description: 'Reusable button component with variants',
        category: 'UI',
        tags: ['react', 'component', 'ui', 'button']
      },
      {
        name: 'form-validation',
        description: 'Form validation with Zod',
        category: 'UI',
        tags: ['form', 'validation', 'zod', 'react']
      },
      {
        name: 'data-table',
        description: 'Advanced data table with sorting and pagination',
        category: 'UI',
        tags: ['table', 'data', 'pagination', 'sorting']
      },

      // API modules
      {
        name: 'api-error-handler',
        description: 'Centralized API error handling',
        category: 'API',
        tags: ['api', 'error', 'middleware']
      },
      {
        name: 'rate-limiter',
        description: 'Rate limiting middleware using Redis',
        category: 'API',
        tags: ['rate-limit', 'api', 'security', 'redis']
      },
      {
        name: 'cors-config',
        description: 'CORS configuration for API routes',
        category: 'API',
        tags: ['cors', 'api', 'security']
      },

      // Utility modules
      {
        name: 'email-sender',
        description: 'Email sending with templates using Nodemailer',
        category: 'UTILITY',
        tags: ['email', 'nodemailer', 'templates']
      },
      {
        name: 'file-upload',
        description: 'File upload handling with S3',
        category: 'UTILITY',
        tags: ['upload', 's3', 'file', 'storage']
      },
      {
        name: 'logger',
        description: 'Structured logging utility',
        category: 'UTILITY',
        tags: ['logging', 'monitoring', 'debug']
      }
    ];

    let created = 0;
    let skipped = 0;

    for (const template of essentialModules) {
      try {
        // Check if module already exists
        const existing = await moduleStore.getByName(template.name);
        if (existing) {
          console.log(`⏭️  Skipping ${template.name} (already exists)`);
          skipped++;
          continue;
        }

        console.log(`🔨 Generating ${template.name}...`);
        const code = await this.generateModule(template);

        await moduleStore.create({
          name: template.name,
          description: template.description,
          code,
          category: template.category,
          tags: template.tags
        });

        console.log(`✅ Created ${template.name}`);
        created++;

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Failed to generate ${template.name}:`, error);
      }
    }

    console.log(`\n✨ Seeding complete: ${created} created, ${skipped} skipped`);
  }

  /**
   * Generate a batch of modules based on category
   */
  async seedByCategory(category: ModuleCategory, count: number): Promise<void> {
    console.log(`🌱 Seeding ${count} ${category} modules...`);

    // This is a simplified version - you would expand this with more specific templates

    // Generate template ideas using Claude
    const ideasResponse = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Generate ${count} module ideas for category ${category} in a Next.js/TypeScript application.

Return a JSON array of objects with this structure:
[
  {
    "name": "kebab-case-name",
    "description": "Brief description",
    "tags": ["tag1", "tag2"]
  }
]

Make them production-ready, specific, and useful.`
      }]
    });

    const content = ideasResponse.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response');
    }

    const ideas = JSON.parse(content.text);

    for (const idea of ideas) {
      try {
        const existing = await moduleStore.getByName(idea.name);
        if (existing) continue;

        console.log(`🔨 Generating ${idea.name}...`);
        const code = await this.generateModule({
          name: idea.name,
          description: idea.description,
          category,
          tags: idea.tags
        });

        await moduleStore.create({
          name: idea.name,
          description: idea.description,
          code,
          category,
          tags: idea.tags
        });

        console.log(`✅ Created ${idea.name}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Failed to generate ${idea.name}:`, error);
      }
    }
  }
}

export const moduleSeeder = new ModuleSeeder();