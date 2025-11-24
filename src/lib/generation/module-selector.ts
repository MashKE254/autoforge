import { Anthropic } from '@anthropic-ai/sdk';
import { moduleStore } from '../modules/module-store';
import { Blueprint } from './blueprint-generator';
import { GenerationTask } from './parallel-engine';

// Import the enum from the generated Prisma client
// Note: After running `npx prisma generate`, this enum will be available
type ModuleCategory = 
  | 'AUTH'
  | 'PAYMENT'
  | 'DATABASE'
  | 'UI'
  | 'API'
  | 'WORKFLOW'
  | 'AGENT'
  | 'INFRASTRUCTURE'
  | 'UTILITY'
  | 'TESTING';

export class ModuleSelector {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    });
  }

  /**
   * Convert blueprint modules to generation tasks
   */
  async selectModules(blueprint: Blueprint): Promise<GenerationTask[]> {
    console.log('🎯 Selecting modules for generation...');

    const tasks: GenerationTask[] = [];

    for (const blueprintModule of blueprint.modules) {
      // Search for existing modules
      const existingModules = await moduleStore.search({
        category: blueprintModule.category as ModuleCategory,
        query: blueprintModule.name,
        limit: 3,
        minSuccessRate: 0.8
      });

      if (existingModules.length > 0) {
        // Use best existing module
        const bestModule = existingModules[0];
        console.log(`♻️  Found existing module: ${bestModule.name} (success rate: ${(bestModule.successRate * 100).toFixed(1)}%)`);

        tasks.push({
          moduleId: bestModule.id,
          moduleName: blueprintModule.name,
          category: blueprintModule.category as ModuleCategory,
          description: blueprintModule.purpose,
          dependencies: blueprintModule.dependencies,
          estimatedComplexity: blueprintModule.estimatedComplexity
        });
      } else {
        // Need to generate new module
        console.log(`🔨 Will generate new module: ${blueprintModule.name}`);

        tasks.push({
          moduleName: blueprintModule.name,
          category: blueprintModule.category as ModuleCategory,
          description: blueprintModule.purpose,
          dependencies: blueprintModule.dependencies,
          estimatedComplexity: blueprintModule.estimatedComplexity
        });
      }
    }

    // Add infrastructure modules
    tasks.push(...this.addInfrastructureModules(blueprint));

    console.log(`📊 Module selection complete: ${tasks.filter(t => t.moduleId).length} existing, ${tasks.filter(t => !t.moduleId).length} new`);

    return tasks;
  }

  /**
   * Add standard infrastructure modules
   */
  private addInfrastructureModules(blueprint: Blueprint): GenerationTask[] {
    const infraModules: GenerationTask[] = [];

    // Always include these infrastructure modules
    const standardInfra = [
      {
        moduleName: 'env-config',
        category: 'INFRASTRUCTURE' as ModuleCategory,
        description: 'Environment variable configuration and validation',
        dependencies: [],
        estimatedComplexity: 'simple' as const
      },
      {
        moduleName: 'error-handler',
        category: 'INFRASTRUCTURE' as ModuleCategory,
        description: 'Global error handling middleware',
        dependencies: [],
        estimatedComplexity: 'simple' as const
      },
      {
        moduleName: 'logger',
        category: 'UTILITY' as ModuleCategory,
        description: 'Structured logging utility',
        dependencies: [],
        estimatedComplexity: 'simple' as const
      }
    ];

    infraModules.push(...standardInfra);

    // Add Docker if needed
    if (blueprint.architecture.infrastructure.some(item => 
      item.toLowerCase().includes('docker')
    )) {
      infraModules.push({
        moduleName: 'dockerfile',
        category: 'INFRASTRUCTURE' as ModuleCategory,
        description: 'Docker configuration for deployment',
        dependencies: [],
        estimatedComplexity: 'simple' as const
      });
    }

    // Add CI/CD if needed
    if (blueprint.architecture.infrastructure.some(item =>
      item.toLowerCase().includes('ci/cd') || item.toLowerCase().includes('github')
    )) {
      infraModules.push({
        moduleName: 'github-actions',
        category: 'INFRASTRUCTURE' as ModuleCategory,
        description: 'CI/CD pipeline configuration',
        dependencies: [],
        estimatedComplexity: 'simple' as const
      });
    }

    return infraModules;
  }

  /**
   * Resolve dependency order for modules
   */
  resolveDependencyOrder(tasks: GenerationTask[]): GenerationTask[] {
    const ordered: GenerationTask[] = [];
    const visited = new Set<string>();
    const taskMap = new Map(tasks.map(t => [t.moduleName, t]));

    const visit = (task: GenerationTask) => {
      if (visited.has(task.moduleName)) return;
      visited.add(task.moduleName);

      // Visit dependencies first
      for (const depName of task.dependencies) {
        const depTask = taskMap.get(depName);
        if (depTask) {
          visit(depTask);
        }
      }

      ordered.push(task);
    };

    for (const task of tasks) {
      visit(task);
    }

    return ordered;
  }
}

export const moduleSelector = new ModuleSelector();