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
import { getAnthropicClient, isSimulationMode } from '../mock-anthropic';

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
  costEstimate?: {
    inputTokens: number;
    outputTokens: number;
    estimatedCostUSD: number;
  };
}

// ============================================================================
// SYSTEM PROMPT FOR MODULE DETECTION & GENERATION
// ============================================================================

const MODULE_ANALYSIS_PROMPT = `You are an expert software architect analyzing application requirements.

Your task is to identify what EXTERNAL integrations and third-party services are needed.

CRITICAL: Only detect REAL external APIs/services that require:
- API keys from external providers
- OAuth authentication with external services
- Third-party SDKs or libraries for specific services

DO NOT detect:
- Internal app features (expense tracking, reporting, etc.)
- Basic CRUD operations
- Charts/tables/dashboards
- File uploads to Supabase (already included)
- Authentication with Clerk (already included)
- Database operations (already included)

OUTPUT FORMAT (JSON):
{
  "modules": [
    {
      "name": "LinkedIn API Integration",
      "category": "social_media",
      "description": "Post content to LinkedIn with OAuth authentication",
      "apis": ["LinkedIn API v2", "@types/linkedin"],
      "features": ["OAuth 2.0", "Post creation", "Media upload"]
    }
  ]
}

EXAMPLES:

User: "Build a social media scheduler for LinkedIn and Twitter"
→ Modules: [LinkedIn API, Twitter API]

User: "Create a Stripe payment flow with webhooks"
→ Modules: [Stripe Integration] (Stripe already included in base stack, skip)

User: "Build a financial dashboard with expense tracking"
→ Modules: [] (these are internal features, not external integrations)

User: "Build a simple todo app"
→ Modules: []

User: "Build an app that monitors LinkedIn for leads"
→ Modules: [LinkedIn API Integration]

BE CONSERVATIVE: When in doubt, return empty modules array. Most apps don't need external integrations.`;

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
Return a JSON object with this EXACT structure. CRITICAL: All code content must have quotes and backticks properly escaped.

{
  "files": [
    {
      "path": "lib/integrations/example.ts",
      "content": "export const example = { };"
    }
  ],
  "dependencies": ["valid-npm-package-name"],
  "envVars": ["ENV_VAR_NAME"],
  "instructions": ["Step 1", "Step 2"]
}

CRITICAL: Dependencies must be REAL, VALID npm packages that ACTUALLY EXIST on npm registry:
- ✅ VALID: "axios", "stripe", "@sendgrid/mail" (verified to exist on npm)
- ❌ INVALID: "mql4/mql5-bridge" (does not exist on npm)
- ❌ INVALID: "node-mt4" (does not exist on npm)
- ❌ INVALID: "metatrader-api" (does not exist on npm)
- ❌ INVALID: "linkedin-api-client" (does not exist on npm)
- ❌ INVALID: "API Bridge" (spaces not allowed)

**CRITICAL RULE:** If you are not 100% certain a package exists on npm, return EMPTY dependencies array []

**Known integrations WITHOUT npm packages:**
- MetaTrader (MT4/MT5): NO npm package exists - return []
- Most trading platforms: NO npm packages - return []
- Many specialized APIs: NO npm packages - return []

**What to do when no npm package exists:**
1. Return "dependencies": []
2. Generate the integration code from scratch using fetch/axios
3. Add clear comments explaining how to set up the API connection
4. Include the API endpoint URLs and authentication methods in comments

Only add dependencies if you've personally used them or are absolutely certain they exist

ESCAPING RULES FOR JSON:
- Replace all double quotes with escaped quotes
- Replace all backticks with escaped backticks
- Replace all backslashes with double backslashes
- Keep code simple and avoid complex template literals in JSON

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
  private totalInputTokens = 0;
  private totalOutputTokens = 0;

  constructor() {
    this.client = getAnthropicClient();
  }

  /**
   * Calculate cost based on token usage
   * Sonnet 4: $3/M input, $15/M output
   * Haiku 3.5: $0.25/M input, $1.25/M output
   */
  private calculateCost(inputTokens: number, outputTokens: number, model: 'sonnet' | 'haiku'): number {
    if (model === 'haiku') {
      return (inputTokens / 1_000_000 * 0.25) + (outputTokens / 1_000_000 * 1.25);
    }
    return (inputTokens / 1_000_000 * 3) + (outputTokens / 1_000_000 * 15);
  }

  /**
   * Analyze prompt and generate all required modules dynamically
   */
  async generateModules(userPrompt: string): Promise<ModuleGenerationResult> {
    console.log('\n🔍 Dynamic Module Analysis starting...');
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;

    try {
      // Step 1: Analyze what modules are needed (using Haiku for 5x cost savings)
      const analysisResult = await this.analyzeRequiredModules(userPrompt);

      if (analysisResult.modules.length === 0) {
        console.log('   No external integrations detected');
        const cost = this.calculateCost(this.totalInputTokens, this.totalOutputTokens, 'haiku');
        console.log(`   💰 Cost: $${cost.toFixed(4)} (${this.totalInputTokens} input, ${this.totalOutputTokens} output tokens)`);

        return {
          modules: [],
          summary: 'No external integrations needed - basic Next.js app',
          costEstimate: {
            inputTokens: this.totalInputTokens,
            outputTokens: this.totalOutputTokens,
            estimatedCostUSD: cost,
          },
        };
      }

      console.log(`   Detected ${analysisResult.modules.length} integrations needed:`);
      analysisResult.modules.forEach(m => console.log(`     - ${m.name}`));

      // Step 2: Generate code for each module in parallel
      console.log('\n⚙️  Generating integration code...');

      const modulePromises = analysisResult.modules.map(spec =>
        this.generateModuleCode(spec, userPrompt)
      );

      const modules = await Promise.all(modulePromises);

      console.log(`   Generated ${modules.length} modules successfully`);

      // Calculate total cost (analysis used Haiku, generation uses Sonnet)
      const analysisCost = this.calculateCost(analysisResult.tokensUsed.input, analysisResult.tokensUsed.output, 'haiku');
      const generationCost = this.calculateCost(
        this.totalInputTokens - analysisResult.tokensUsed.input,
        this.totalOutputTokens - analysisResult.tokensUsed.output,
        'sonnet'
      );
      const totalCost = analysisCost + generationCost;

      console.log(`\n   💰 Module Generation Cost:`);
      console.log(`      Analysis (Haiku): $${analysisCost.toFixed(4)}`);
      console.log(`      Code Gen (Sonnet): $${generationCost.toFixed(4)}`);
      console.log(`      Total: $${totalCost.toFixed(4)}`);
      console.log(`      Tokens: ${this.totalInputTokens} input, ${this.totalOutputTokens} output`);

      return {
        modules,
        summary: `Generated ${modules.length} integrations: ${modules.map(m => m.name).join(', ')}`,
        costEstimate: {
          inputTokens: this.totalInputTokens,
          outputTokens: this.totalOutputTokens,
          estimatedCostUSD: totalCost,
        },
      };

    } catch (error) {
      console.error('Dynamic module generation failed:', error);
      throw error;
    }
  }

  /**
   * Step 1: Analyze what modules are needed (using Haiku for 5x cost savings)
   */
  private async analyzeRequiredModules(userPrompt: string): Promise<{
    modules: Array<{
      name: string;
      category: string;
      description: string;
      apis: string[];
      features: string[];
    }>;
    tokensUsed: { input: number; output: number };
  }> {
    const response = await this.client.messages.create({
      model: 'claude-3-5-haiku-20241022', // Use Haiku 3.5 for analysis (5x cheaper than Sonnet)
      max_tokens: 2000, // Reduced from 4000 (analysis needs less)
      temperature: 0.3,
      system: [
        {
          type: 'text',
          text: MODULE_ANALYSIS_PROMPT,
          cache_control: { type: 'ephemeral' }, // Cache system prompt for 5min
        },
      ],
      messages: [{
        role: 'user',
        content: `Analyze this application request and identify what integrations/modules are needed:\n\n${userPrompt}`
      }]
    });

    // Track token usage
    this.totalInputTokens += response.usage.input_tokens;
    this.totalOutputTokens += response.usage.output_tokens;

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('   No modules detected from analysis');
      return {
        modules: [],
        tokensUsed: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
        },
      };
    }

    try {
      const analysis = JSON.parse(jsonMatch[0]);

      // Validate and normalize module specs
      const normalizedModules = (analysis.modules || []).map((mod: any) => ({
        name: mod.name || 'Unknown Module',
        category: mod.category || 'general',
        description: mod.description || '',
        apis: Array.isArray(mod.apis) ? mod.apis : [],
        features: Array.isArray(mod.features) ? mod.features : [],
      }));

      return {
        modules: normalizedModules,
        tokensUsed: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
        },
      };
    } catch (parseError) {
      console.error('   Failed to parse module analysis JSON:', parseError);
      console.log('   Response text:', content.text);
      return {
        modules: [],
        tokensUsed: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
        },
      };
    }
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
APIS/LIBRARIES: ${spec.apis?.join(', ') || 'N/A'}
REQUIRED FEATURES: ${spec.features?.join(', ') || 'N/A'}

ORIGINAL USER REQUEST:
${originalPrompt}

Generate production-ready TypeScript code for this integration. Include all necessary files, types, and handlers.`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000, // Reduced from 8000 (modules are focused, don't need huge outputs)
      temperature: 0.5,
      system: [
        {
          type: 'text',
          text: MODULE_GENERATION_PROMPT,
          cache_control: { type: 'ephemeral' }, // Cache system prompt for 5min
        },
      ],
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Track token usage
    this.totalInputTokens += response.usage.input_tokens;
    this.totalOutputTokens += response.usage.output_tokens;

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON response with error handling
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Failed to parse module generation response for ${spec.name}`);
    }

    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      // JSON parsing failed - likely due to unescaped quotes in code
      // Try to extract just the important parts
      console.warn(`   ⚠️  JSON parsing failed for ${spec.name}, using fallback extraction`);

      // Fallback: Create minimal module structure
      result = {
        files: [
          {
            path: `lib/integrations/${spec.category.toLowerCase()}/${spec.name.toLowerCase().replace(/\s+/g, '-')}.ts`,
            content: `// ${spec.name}\n// ${spec.description}\n\n// TODO: Implement ${spec.features.join(', ')}\n\nexport const ${spec.name.replace(/\s+/g, '')} = {\n  // Implementation\n};`
          }
        ],
        dependencies: spec.apis.map(api => api.toLowerCase().replace(/\s+/g, '-')),
        envVars: [],
        instructions: [
          `Implement ${spec.name} integration`,
          `Required features: ${spec.features.join(', ')}`,
          `APIs to integrate: ${spec.apis.join(', ')}`
        ]
      };
    }

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
