import { prisma } from '@/lib/prisma';
import { Module, ModuleCategory, Prisma } from '@prisma/client';

export interface ModuleSearchOptions {
  category?: ModuleCategory;
  query?: string;
  tags?: string[];
  limit?: number;
  minSuccessRate?: number;
  includeDeprecated?: boolean;
}

export interface ModuleWithDeps extends Module {
  dependencies: Array<{
    dependsOn: Module;
  }>;
}

export class ModuleStore {
  /**
   * Search for modules based on filters and semantic similarity
   */
  async search(options: ModuleSearchOptions): Promise<Module[]> {
    const {
      category,
      query,
      tags,
      limit = 10,
      minSuccessRate = 0.7
    } = options;

    const where: Prisma.ModuleWhereInput = {
      successRate: {
        gte: minSuccessRate
      }
    };

    if (category) {
      where.category = category;
    }

    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags
      };
    }

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ];
    }

    const modules = await prisma.module.findMany({
      where,
      orderBy: [
        { successRate: 'desc' },
        { usageCount: 'desc' }
      ],
      take: limit,
      include: {
        dependencies: {
          include: {
            dependsOn: true
          }
        }
      }
    });

    return modules;
  }

  /**
   * Get a single module by ID with all dependencies
   */
  async getById(id: string): Promise<ModuleWithDeps | null> {
    return await prisma.module.findUnique({
      where: { id },
      include: {
        dependencies: {
          include: {
            dependsOn: {
              include: {
                dependencies: {
                  include: {
                    dependsOn: true
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  /**
   * Get a module by name
   */
  async getByName(name: string): Promise<Module | null> {
    return await prisma.module.findUnique({
      where: { name }
    });
  }

  /**
   * Get modules with their full dependency tree resolved
   */
  async getWithDependencies(moduleIds: string[]): Promise<Module[]> {
    const visited = new Set<string>();
    const result: Module[] = [];

    const resolveModule = async (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const moduleRecord = await prisma.module.findUnique({
        where: { id },
        include: {
          dependencies: {
            include: {
              dependsOn: true
            }
          }
        }
      });

      if (!moduleRecord) return;

      // Recursively resolve dependencies first
      for (const dep of moduleRecord.dependencies) {
        await resolveModule(dep.dependsOn.id);
      }

      result.push(moduleRecord);
    };

    for (const id of moduleIds) {
      await resolveModule(id);
    }

    return result;
  }

  /**
   * Record module usage and update success metrics
   */
  async recordUsage(moduleId: string, success: boolean): Promise<void> {
    const moduleRecord = await prisma.module.findUnique({
      where: { id: moduleId }
    });

    if (!moduleRecord) return;

    const totalUses = moduleRecord.usageCount + 1;
    const successCount = moduleRecord.successRate * moduleRecord.usageCount + (success ? 1 : 0);
    const newSuccessRate = successCount / totalUses;

    await prisma.module.update({
      where: { id: moduleId },
      data: {
        usageCount: totalUses,
        successRate: newSuccessRate
      }
    });
  }

  /**
   * Create a new module
   */
  async create(data: {
    name: string;
    description: string;
    code: string;
    category: ModuleCategory;
    framework?: string;
    language?: string;
    tags?: string[];
    dependencies?: string[]; // Array of module IDs
  }): Promise<Module> {
    const createdModule = await prisma.module.create({
      data: {
        name: data.name,
        description: data.description,
        code: data.code,
        category: data.category,
        framework: data.framework || 'nextjs',
        language: data.language || 'typescript',
        tags: data.tags || [],
        dependencies: {
          create: (data.dependencies || []).map(depId => ({
            dependsOnId: depId
          }))
        }
      }
    });

    return createdModule;
  }

  /**
   * Update an existing module
   */
  async update(
    id: string,
    data: Partial<{
      code: string;
      description: string;
      tags: string[];
      testCoverage: number;
    }>
  ): Promise<Module> {
    return await prisma.module.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Get modules that need improvement (low success rate)
   */
  async getModulesNeedingImprovement(limit: number = 10): Promise<Module[]> {
    return await prisma.module.findMany({
      where: {
        successRate: {
          lt: 0.8
        },
        usageCount: {
          gte: 5 // Only consider modules that have been used at least 5 times
        }
      },
      orderBy: [
        { successRate: 'asc' },
        { usageCount: 'desc' }
      ],
      take: limit
    });
  }

  /**
   * Get statistics about the module library
   */
  async getStats(): Promise<{
    totalModules: number;
    byCategory: Record<ModuleCategory, number>;
    averageSuccessRate: number;
    totalUsage: number;
  }> {
    const [totalModules, modules] = await Promise.all([
      prisma.module.count(),
      prisma.module.findMany({
        select: {
          category: true,
          successRate: true,
          usageCount: true
        }
      })
    ]);

    const byCategory: Record<string, number> = {};
    let totalSuccessRate = 0;
    let totalUsage = 0;

    for (const mod of modules) {
      byCategory[mod.category] = (byCategory[mod.category] || 0) + 1;
      totalSuccessRate += mod.successRate;
      totalUsage += mod.usageCount;
    }

    return {
      totalModules,
      byCategory: byCategory as Record<ModuleCategory, number>,
      averageSuccessRate: totalModules > 0 ? totalSuccessRate / totalModules : 0,
      totalUsage
    };
  }

  /**
   * Find similar modules (simple implementation, can be enhanced with vector search)
   */
  async findSimilar(moduleId: string, limit: number = 5): Promise<Module[]> {
    const sourceModule = await prisma.module.findUnique({
      where: { id: moduleId }
    });

    if (!sourceModule) return [];

    return await prisma.module.findMany({
      where: {
        id: { not: moduleId },
        category: sourceModule.category,
        OR: [
          { tags: { hasSome: sourceModule.tags } },
          { name: { contains: sourceModule.name.split('-')[0], mode: 'insensitive' } }
        ]
      },
      orderBy: { successRate: 'desc' },
      take: limit
    });
  }
}

// Export singleton instance
export const moduleStore = new ModuleStore();