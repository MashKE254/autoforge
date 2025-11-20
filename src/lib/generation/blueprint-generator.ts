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
    authentication?: string; // MADE OPTIONAL
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

Generate a JSON blueprint with this exact structure:

{
  "architecture": {
    "frontend": ["Next.js 16 with App Router", "React 19", "TypeScript", "Tailwind CSS", "Shadcn/ui components"],
    "backend": ["Next.js API Routes", "TypeScript"],
    "database": ["PostgreSQL", "Prisma Client"],
    "infrastructure": ["Vercel deployment", "Environment variables"]
  },
  "modules": [
    {
      "name": "counter-component",
      "category": "UI",
      "purpose": "Main counter UI with increment button",
      "dependencies": [],
      "estimatedComplexity": "simple"
    },
    {
      "name": "state-management",
      "category": "UTILITY",
      "purpose": "Handle counter state with React hooks",
      "dependencies": ["counter-component"],
      "estimatedComplexity": "simple"
    }
  ],
  "timeline": [
    {
      "phase": "Core Features",
      "duration": "5 minutes",
      "deliverables": ["Counter component", "State management"]
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
  "features": ["Counter display", "Increment button", "Responsive design"],
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
1. Include 5-30 modules depending on complexity
2. Use these categories: AUTH, PAYMENT, DATABASE, UI, API, WORKFLOW, AGENT, INFRASTRUCTURE, UTILITY
3. List dependencies between modules (use module names)
4. Be specific about what each module does
5. Estimate complexity realistically (simple/moderate/complex)
6. Include a realistic timeline with phases
7. List all key features the app will have
8. For simple apps (counter, calculator, todo): Keep modules minimal (5-10)
9. Only include authentication if the app needs user accounts
10. Only include payments if the app needs to process money
11. Return ONLY valid JSON, no markdown, no explanations, no code blocks

Generate the blueprint now:`;

    let blueprintText: string;

    // ALWAYS use Claude for blueprint generation (fast and reliable)
    // LocalAI is too slow for blueprint generation
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

    console.log('✅ Blueprint generated successfully');
    console.log(`📊 Estimated: ${blueprint.estimatedModules} modules in ${blueprint.estimatedTime}`);

    return blueprint;
  }

  /**
   * Validate blueprint has all required fields
   */
  private validateBlueprint(blueprint: unknown): asserts blueprint is Blueprint {
    // Type guard to check if blueprint is an object
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
    
    // Authentication and payments are optional - only needed for certain apps
    // Allow Claude to decide based on app requirements
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
    return 8; // Reduced from 10 for simple apps
  }
}

// Export singleton instance
export const blueprintGenerator = new BlueprintGenerator();