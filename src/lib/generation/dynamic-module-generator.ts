/**
 * DYNAMIC MODULE GENERATOR
 *
 * File: src/lib/generation/dynamic-module-generator.ts
 *
 * Uses Claude API to dynamically generate integration modules on-demand.
 * NO hardcoded templates - generates ANY integration (LinkedIn, Twitter, Stripe, etc.)
 *
 * Replaces the old hardcoded module system with AI-powered generation.
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// TYPES
// ============================================================================

export interface DynamicModule {
  name: string;
  description: string;
  category: string;
  files: Array<{ path: string; content: string }>;
  dependencies: string[];
  envVars: string[];
  instructions: string[];
}

export interface ModuleGenerationResult {
  modules: DynamicModule[];
  summary: string;
}

// ============================================================================
// SYSTEM PROMPT FOR MODULE DETECTION & GENERATION
// ============================================================================

const MODULE_ANALYSIS_PROMPT = `You are an expert software architect analyzing application requirements.

Your task is to identify what external integrations, services, and modules are needed based on the user's prompt.

OUTPUT FORMAT (JSON):
{
  "modules": [
    {
      "name": "LinkedIn API Integration",
      "category": "social_media",
      "description": "Post content to LinkedIn with OAuth authentication",
      "apis": ["LinkedIn API v2"],
      "features": ["OAuth 2.0", "Post creation", "Media upload", "Analytics"]
    },
    {
      "name": "Image Processing",
      "category": "media",
      "description": "Resize and optimize images for different platforms",
      "apis": ["sharp"],
      "features": ["Resize", "Format conversion", "Optimization"]
    }
  ]
}

IMPORTANT RULES:
1. Only identify modules that are EXPLICITLY needed by the prompt
2. Don't add generic modules - be specific to what the user asked for
3. Each module should be a distinct integration or service
4. Focus on external APIs, third-party services, and complex functionality
5. Don't include basic Next.js features (routing, pages, etc.) - only integrations

EXAMPLES:

User: "Build a social media scheduler for LinkedIn and Twitter"
→ Modules: LinkedIn API, Twitter API, Cron Scheduling, Image Processing

User: "Create a Stripe payment flow with webhooks"
→ Modules: Stripe Payments, Stripe Webhooks

User: "Build a simple todo app"
→ Modules: [] (no external integrations needed)`;

const MODULE_GENERATION_PROMPT = `You are an expert full-stack engineer who generates production-ready integration code.

Given a module specification, you will generate:
1. TypeScript integration files
2. API route handlers
3. Type definitions
4. Usage examples

TECH STACK:
- Next.js 14+ (App Router)
- TypeScript
- Server Actions for mutations
- API Routes for webhooks

OUTPUT FORMAT:
Return a JSON object with this structure:

{
  "files": [
    {
      "path": "lib/integrations/linkedin/client.ts",
      "content": "// Full TypeScript code here..."
    },
    {
      "path": "app/api/linkedin/post/route.ts",
      "content": "// Full API route code here..."
    }
  ],
  "dependencies": ["axios", "@types/node"],
  "envVars": ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
  "instructions": [
    "1. Set up LinkedIn App at https://www.linkedin.com/developers/apps",
    "2. Add environment variables to .env.local",
    "3. Configure OAuth redirect URL"
  ]
}

IMPORTANT RULES:
1. Generate COMPLETE, production-ready code (not placeholders)
2. Include proper error handling
3. Use modern TypeScript patterns
4. Add helpful comments
5. Include type safety
6. Use async/await (not callbacks)
7. Generate realistic, working code that follows best practices

AUTHENTICATION PATTERNS:

For OAuth services (LinkedIn, Twitter, Google, etc.):
- Use next-auth or custom OAuth flow
- Store tokens securely in database
- Implement token refresh logic

For API Key services (SendGrid, Twilio, etc.):
- Store keys in environment variables
- Use server-side only (never expose to client)
- Add proper error handling for failed requests

For Webhooks:
- Create API route: app/api/webhooks/[service]/route.ts
- Verify webhook signatures
- Process events asynchronously
- Return 200 OK quickly

CODE QUALITY:
- No TODO comments
- No placeholder functions
- No "implement this later" sections
- Real implementations only`;

// ============================================================================
// DYNAMIC MODULE GENERATOR CLASS
// ============================================================================

export class DynamicModuleGenerator {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }

  /**
   * Analyze prompt and generate all required modules dynamically
   */
  async generateModules(userPrompt: string): Promise<ModuleGenerationResult> {
    console.log('\n🔍 Dynamic Module Analysis starting...');

    try {
      // Step 1: Analyze what modules are needed
      const analysis = await this.analyzeRequiredModules(userPrompt);

      if (analysis.modules.length === 0) {
        console.log('   No external integrations detected');
        return {
          modules: [],
          summary: 'No external integrations needed - basic Next.js app'
        };
      }

      console.log(`   Detected ${analysis.modules.length} integrations needed:`);
      analysis.modules.forEach(m => console.log(`     - ${m.name}`));

      // Step 2: Generate code for each module in parallel
      console.log('\n⚙️  Generating integration code...');

      const modulePromises = analysis.modules.map(spec =>
        this.generateModuleCode(spec, userPrompt)
      );

      const modules = await Promise.all(modulePromises);

      console.log(`   Generated ${modules.length} modules successfully`);

      return {
        modules,
        summary: `Generated ${modules.length} integrations: ${modules.map(m => m.name).join(', ')}`
      };

    } catch (error) {
      console.error('Dynamic module generation failed:', error);
      throw error;
    }
  }

  /**
   * Step 1: Analyze what modules are needed
   */
  private async analyzeRequiredModules(userPrompt: string): Promise<{
    modules: Array<{
      name: string;
      category: string;
      description: string;
      apis: string[];
      features: string[];
    }>;
  }> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.3,
      system: MODULE_ANALYSIS_PROMPT,
      messages: [{
        role: 'user',
        content: `Analyze this application request and identify what integrations/modules are needed:\n\n${userPrompt}`
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('   No modules detected from analysis');
      return { modules: [] };
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return analysis;
  }

  /**
   * Step 2: Generate code for a specific module
   */
  private async generateModuleCode(
    spec: {
      name: string;
      category: string;
      description: string;
      apis: string[];
      features: string[];
    },
    originalPrompt: string
  ): Promise<DynamicModule> {
    console.log(`   Generating ${spec.name}...`);

    const prompt = `Generate a complete integration module for:

MODULE: ${spec.name}
CATEGORY: ${spec.category}
DESCRIPTION: ${spec.description}
APIS/LIBRARIES: ${spec.apis.join(', ')}
REQUIRED FEATURES: ${spec.features.join(', ')}

ORIGINAL USER REQUEST:
${originalPrompt}

Generate production-ready TypeScript code for this integration. Include all necessary files, types, and handlers.`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.5,
      system: MODULE_GENERATION_PROMPT,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Failed to parse module generation response for ${spec.name}`);
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      name: spec.name,
      description: spec.description,
      category: spec.category,
      files: result.files || [],
      dependencies: result.dependencies || [],
      envVars: result.envVars || [],
      instructions: result.instructions || [],
    };
  }

  /**
   * Get module prompt summary for inclusion in main generation
   */
  static getModulesPrompt(modules: DynamicModule[]): string {
    if (modules.length === 0) return '';

    const moduleList = modules.map(m => `- ${m.name}: ${m.description}`).join('\n');

    return `
## REQUIRED INTEGRATIONS

The following integrations have been detected and generated:

${moduleList}

IMPORTANT:
- Integration files will be automatically included
- Use the provided integration modules in your app
- Environment variables are documented in each module
- Follow the setup instructions for each integration
`;
  }

  /**
   * Get all files from generated modules
   */
  static getModuleFiles(modules: DynamicModule[]): Array<{ path: string; content: string }> {
    const allFiles: Array<{ path: string; content: string }> = [];

    for (const module of modules) {
      allFiles.push(...module.files);
    }

    return allFiles;
  }

  /**
   * Get all dependencies from modules
   */
  static getAllDependencies(modules: DynamicModule[]): string[] {
    const deps = new Set<string>();

    for (const module of modules) {
      module.dependencies.forEach(dep => deps.add(dep));
    }

    return Array.from(deps);
  }

  /**
   * Get setup instructions for all modules
   */
  static getSetupInstructions(modules: DynamicModule[]): string {
    if (modules.length === 0) return '';

    let instructions = '\n## INTEGRATION SETUP INSTRUCTIONS\n\n';

    modules.forEach((module, index) => {
      instructions += `### ${index + 1}. ${module.name}\n`;
      instructions += `${module.description}\n\n`;

      if (module.envVars.length > 0) {
        instructions += '**Environment Variables:**\n';
        module.envVars.forEach(env => {
          instructions += `- ${env}\n`;
        });
        instructions += '\n';
      }

      if (module.instructions.length > 0) {
        instructions += '**Setup Steps:**\n';
        module.instructions.forEach(step => {
          instructions += `${step}\n`;
        });
        instructions += '\n';
      }
    });

    return instructions;
  }
}

// Export singleton instance
export const dynamicModuleGenerator = new DynamicModuleGenerator();
