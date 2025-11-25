import { Anthropic } from '@anthropic-ai/sdk';
import { moduleStore } from '../modules/module-store';

export interface Blueprint {
  architecture: {
    frontend: string[];
    backend: string[];
    database: string[];
    infrastructure: string[];
  };
  modules: BlueprintModule[];
  timeline: {
    phase: string;
    duration: string;
    deliverables: string[];
  }[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  estimatedModules: number;
  estimatedTime: string;
  features: string[];
  techStack: {
    frontend: string;
    backend: string;
    database: string;
    authentication?: string;
    payments?: string;
    hosting: string;
  };
}

export interface BlueprintModule {
  name: string;
  category: string;
  purpose: string;
  dependencies: string[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

export class BlueprintGenerator {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key'
    });
  }

  /**
   * Generate a living blueprint from a prompt
   */
  async generate(prompt: string): Promise<Blueprint> {
    console.log('📝 Generating blueprint for:', prompt);

    // Get module library statistics
    const moduleStats = await moduleStore.getStats();

    const blueprintPrompt = `You are an expert software architect. Generate a comprehensive blueprint for the following application:

"${prompt}"

Available module library statistics:
- Total modules: ${moduleStats.totalModules}
- Categories: ${Object.entries(moduleStats.byCategory).map(([category, count]) => `${category} (${count})`).join(', ')}

CRITICAL REQUIREMENTS:
1. ALWAYS include a "main-page" module as the FIRST module
2. The "main-page" module MUST contain the complete, working application UI
3. The "main-page" module category MUST be "UI"
4. Additional supporting components are optional but should be separate modules

Generate a JSON blueprint with this exact structure:

{
  "architecture": {
    "frontend": ["Next.js 16 with App Router", "React 19", "TypeScript", "Tailwind CSS"],
    "backend": ["Next.js API Routes", "TypeScript"],
    "database": ["PostgreSQL", "Prisma Client"],
    "infrastructure": ["Vercel deployment", "Environment variables"]
  },
  "modules": [
    {
      "name": "main-page",
      "category": "UI",
      "purpose": "Complete working todo list application with add, delete, and complete functionality in app/page.tsx",
      "dependencies": [],
      "estimatedComplexity": "simple"
    },
    {
      "name": "todo-types",
      "category": "UTILITY",
      "purpose": "TypeScript interfaces for todo items",
      "dependencies": ["main-page"],
      "estimatedComplexity": "simple"
    }
  ],
  "timeline": [
    {
      "phase": "Core Features",
      "duration": "5 minutes",
      "deliverables": ["Main page with full functionality", "Type definitions"]
    },
    {
      "phase": "Polish",
      "duration": "5 minutes",
      "deliverables": ["Styling", "Responsive design"]
    }
  ],
  "estimatedComplexity": "simple",
  "estimatedModules": 5,
  "estimatedTime": "15 minutes",
  "features": ["Add todos", "Delete todos", "Mark complete", "Responsive design"],
  "techStack": {
    "frontend": "Next.js 16 with React 19",
    "backend": "Next.js API Routes with TypeScript",
    "database": "PostgreSQL with Prisma",
    "authentication": "None (only include if app needs user accounts)",
    "payments": "None (only include if app needs payments)",
    "hosting": "Vercel"
  }
}

Important guidelines:
1. FIRST module MUST be "main-page" with category "UI"
2. "main-page" purpose should describe the COMPLETE working application
3. Include 3-15 modules total depending on complexity
4. Use these categories: AUTH, PAYMENT, DATABASE, UI, API, WORKFLOW, AGENT, INFRASTRUCTURE, UTILITY
5. List dependencies between modules (use module names)
6. For simple apps (todo, calculator, counter): Keep to 3-8 modules
7. For moderate apps (blog, dashboard): 10-15 modules
8. For complex apps (SaaS, marketplace): 15-30 modules
9. Only include authentication if the app needs user accounts
10. Only include payments if the app needs to process money
11. Return ONLY valid JSON, no markdown, no explanations, no code blocks

Example for a calculator:
{
  "modules": [
    {
      "name": "main-page",
      "category": "UI",
      "purpose": "Complete calculator interface with all operations (add, subtract, multiply, divide) and display",
      "dependencies": [],
      "estimatedComplexity": "simple"
    },
    {
      "name": "calculator-logic",
      "category": "UTILITY",
      "purpose": "Mathematical operation functions",
      "dependencies": ["main-page"],
      "estimatedComplexity": "simple"
    }
  ]
}

Example for a blog:
{
  "modules": [
    {
      "name": "main-page",
      "category": "UI",
      "purpose": "Blog homepage with post list and featured articles",
      "dependencies": [],
      "estimatedComplexity": "moderate"
    },
    {
      "name": "post-detail-page",
      "category": "UI",
      "purpose": "Individual blog post page with comments",
      "dependencies": ["main-page"],
      "estimatedComplexity": "moderate"
    },
    {
      "name": "blog-api",
      "category": "API",
      "purpose": "REST API for blog posts CRUD operations",
      "dependencies": [],
      "estimatedComplexity": "moderate"
    }
  ]
}

Generate the blueprint now:`;

    let blueprintText: string;

    // ALWAYS use Claude for blueprint generation (fast and reliable)
    console.log('☁️  Using Claude for blueprint generation');
    
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 5000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: blueprintPrompt
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude');
    }

    blueprintText = content.text;

    // Clean up the response (remove markdown code blocks if present)
    blueprintText = blueprintText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Parse the blueprint
    let blueprint: Blueprint;
    try {
      blueprint = JSON.parse(blueprintText);
    } catch {
      console.error('Failed to parse blueprint JSON:', blueprintText);
      throw new Error('Invalid blueprint JSON generated');
    }

    // Validate blueprint structure
    this.validateBlueprint(blueprint);

    // Ensure main-page module exists
    this.ensureMainPageModule(blueprint);

    console.log('✅ Blueprint generated successfully');
    console.log(`📊 Estimated: ${blueprint.estimatedModules} modules in ${blueprint.estimatedTime}`);

    return blueprint;
  }

  /**
   * Ensure blueprint has a main-page module
   */
  private ensureMainPageModule(blueprint: Blueprint): void {
    const hasMainPage = blueprint.modules.some(m => 
      m.name.toLowerCase().includes('main-page') || 
      m.name.toLowerCase() === 'main-page'
    );

    if (!hasMainPage) {
      console.warn('⚠️  Blueprint missing main-page module, adding it...');
      
      // Insert main-page as first module
      blueprint.modules.unshift({
        name: 'main-page',
        category: 'UI',
        purpose: 'Main application page with core functionality',
        dependencies: [],
        estimatedComplexity: 'simple'
      });
      
      blueprint.estimatedModules = blueprint.modules.length;
    }
  }

  /**
   * Validate blueprint has all required fields
   */
  private validateBlueprint(blueprint: unknown): asserts blueprint is Blueprint {
    if (typeof blueprint !== 'object' || blueprint === null) {
      throw new Error('Blueprint must be an object');
    }

    const bp = blueprint as Record<string, unknown>;

    const required = [
      'architecture',
      'modules',
      'timeline',
      'estimatedComplexity',
      'estimatedModules',
      'estimatedTime',
      'features',
      'techStack'
    ];

    for (const field of required) {
      if (!bp[field]) {
        throw new Error(`Blueprint missing required field: ${field}`);
      }
    }

    if (!Array.isArray(bp.modules) || bp.modules.length === 0) {
      throw new Error('Blueprint must include at least one module');
    }

    // Validate each module
    for (const mod of bp.modules) {
      if (!mod.name || !mod.category || !mod.purpose) {
        throw new Error('Invalid module structure in blueprint');
      }
    }

    // Validate architecture sections
    const archSections = ['frontend', 'backend', 'database', 'infrastructure'];
    for (const section of archSections) {
      const architecture = bp.architecture as Record<string, unknown>;
      if (!Array.isArray(architecture[section])) {
        throw new Error(`Architecture.${section} must be an array`);
      }
    }

    // Validate tech stack (authentication is now optional)
    const requiredTechFields = ['frontend', 'backend', 'database', 'hosting'];
    for (const field of requiredTechFields) {
      const techStack = bp.techStack as Record<string, unknown>;
      if (!techStack[field]) {
        throw new Error(`Tech stack missing required field: ${field}`);
      }
    }
  }

  /**
   * Estimate module count from prompt (fallback method)
   */
  private estimateModuleCount(prompt: string): number {
    const keywords = {
      simple: ['todo', 'list', 'tracker', 'calculator', 'timer', 'counter'],
      moderate: ['blog', 'cms', 'dashboard', 'crm', 'shop'],
      complex: ['marketplace', 'platform', 'saas', 'social', 'workflow'],
      enterprise: ['enterprise', 'compliance', 'multi-tenant', 'federation']
    };

    const lowerPrompt = prompt.toLowerCase();

    if (keywords.enterprise.some(k => lowerPrompt.includes(k))) {
      return 40;
    }
    if (keywords.complex.some(k => lowerPrompt.includes(k))) {
      return 25;
    }
    if (keywords.moderate.some(k => lowerPrompt.includes(k))) {
      return 15;
    }
    return 8;
  }
}

// Export singleton instance
export const blueprintGenerator = new BlueprintGenerator();