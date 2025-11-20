// jobs.ts - AutoForge V2 Job Definitions

import { logger, task } from "@trigger.dev/sdk/v3";
import { generateCompleteApp, GenerationResult } from "./autoforge-v2";

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  priority: "critical" | "high" | "medium" | "low";
  dependencies: string[];
  code?: string;
  error?: string;
}

export interface GenerateAppPayload {
  userPrompt: string;
  userId: string;
}

export interface GenerateAppResult {
  success: boolean;
  plan: PlanStep[];
  projectName: string;
  error?: string;
  metadata?: {
    totalFiles: number;
    generationTime: number;
    framework: string;
  };
}

/**
 * Convert AutoForge V2 generation result to plan format for UI
 */
function convertToPlanFormat(files: Array<{ path: string; content: string }>): PlanStep[] {
  const plan: PlanStep[] = [];
  
  console.log("=== CONVERTING TO PLAN FORMAT ===");
  console.log(`Total files to convert: ${files.length}`);
  
  // Log all files we're converting
  files.forEach((f, idx) => {
    console.log(`  ${idx + 1}. ${f.path} (${f.content.length} chars)`);
  });
  
  // Group files by category for better organization
  const configs = files.filter(f => 
    f.path.match(/\.(json|mjs|config\.ts|config\.mjs)$/) && 
    !f.path.includes('/app/') &&
    !f.path.includes('/components/') &&
    !f.path.includes('/lib/')
  );
  
  const styles = files.filter(f => 
    f.path.includes('.css') || 
    f.path.includes('globals.css') ||
    f.path === 'app/globals.css'
  );
  
  const pages = files.filter(f => 
    f.path.includes('/app/') && 
    (f.path.includes('page.tsx') || f.path.includes('layout.tsx'))
  );
  
  const components = files.filter(f => 
    f.path.includes('/components/') ||
    f.path.startsWith('components/')
  );
  
  const libs = files.filter(f => 
    f.path.includes('/lib/') ||
    f.path.startsWith('lib/')
  );
  
  const middleware = files.filter(f => 
    f.path === 'middleware.ts' || 
    f.path.includes('/middleware.ts')
  );
  
  const env = files.filter(f => 
    f.path.includes('.env')
  );
  
  // Collect all processed files
  const processedPaths = new Set<string>();
  
  // Add config files
  if (configs.length > 0) {
    console.log(`\n📦 Step 1: Config files (${configs.length})`);
    configs.forEach(f => {
      console.log(`   - ${f.path}`);
      processedPaths.add(f.path);
    });
    
    plan.push({
      id: "config",
      title: "Project Configuration",
      description: `Setup files: ${configs.map(f => f.path.split('/').pop()).join(', ')}`,
      status: "completed",
      priority: "critical",
      dependencies: [],
      code: configs.map(f => `<!-- file: ${f.path} -->\n${f.content}`).join('\n\n')
    });
  }
  
  // Add styles
  if (styles.length > 0) {
    console.log(`\n📦 Step 2: Styles (${styles.length})`);
    styles.forEach(f => {
      console.log(`   - ${f.path}`);
      processedPaths.add(f.path);
    });
    
    plan.push({
      id: "styles",
      title: "Styling System",
      description: `Tailwind CSS and global styles`,
      status: "completed",
      priority: "high",
      dependencies: ["config"],
      code: styles.map(f => `<!-- file: ${f.path} -->\n${f.content}`).join('\n\n')
    });
  }
  
  // Add middleware
  if (middleware.length > 0) {
    console.log(`\n📦 Step 3: Middleware (${middleware.length})`);
    middleware.forEach(f => {
      console.log(`   - ${f.path}`);
      processedPaths.add(f.path);
    });
    
    plan.push({
      id: "middleware",
      title: "Middleware Configuration",
      description: `Request/response middleware`,
      status: "completed",
      priority: "high",
      dependencies: ["config"],
      code: middleware.map(f => `<!-- file: ${f.path} -->\n${f.content}`).join('\n\n')
    });
  }
  
  // Add pages
  if (pages.length > 0) {
    console.log(`\n📦 Step 4: Pages & Layouts (${pages.length})`);
    pages.forEach(f => {
      console.log(`   - ${f.path}`);
      processedPaths.add(f.path);
    });
    
    plan.push({
      id: "pages",
      title: "Pages & Layouts",
      description: `App router pages and layouts`,
      status: "completed",
      priority: "critical",
      dependencies: ["config", "styles"],
      code: pages.map(f => `<!-- file: ${f.path} -->\n${f.content}`).join('\n\n')
    });
  }
  
  // Add components
  if (components.length > 0) {
    console.log(`\n📦 Step 5: UI Components (${components.length})`);
    components.forEach(f => {
      console.log(`   - ${f.path}`);
      processedPaths.add(f.path);
    });
    
    plan.push({
      id: "components",
      title: "UI Components",
      description: `React components: ${components.map(f => f.path.split('/').pop()).join(', ')}`,
      status: "completed",
      priority: "high",
      dependencies: ["styles"],
      code: components.map(f => `<!-- file: ${f.path} -->\n${f.content}`).join('\n\n')
    });
  }
  
  // Add lib files
  if (libs.length > 0) {
    console.log(`\n📦 Step 6: Utility Libraries (${libs.length})`);
    libs.forEach(f => {
      console.log(`   - ${f.path}`);
      processedPaths.add(f.path);
    });
    
    plan.push({
      id: "libs",
      title: "Utility Libraries",
      description: `Helper functions and utilities`,
      status: "completed",
      priority: "high",
      dependencies: [],
      code: libs.map(f => `<!-- file: ${f.path} -->\n${f.content}`).join('\n\n')
    });
  }
  
  // Add env files
  if (env.length > 0) {
    console.log(`\n📦 Step 7: Environment (${env.length})`);
    env.forEach(f => {
      console.log(`   - ${f.path}`);
      processedPaths.add(f.path);
    });
    
    plan.push({
      id: "env",
      title: "Environment Configuration",
      description: `Environment variables template`,
      status: "completed",
      priority: "low",
      dependencies: [],
      code: env.map(f => `<!-- file: ${f.path} -->\n${f.content}`).join('\n\n')
    });
  }
  
  // Catch any remaining files that weren't categorized
  const remaining = files.filter(f => !processedPaths.has(f.path));
  if (remaining.length > 0) {
    console.log(`\n⚠️ WARNING: ${remaining.length} files not categorized!`);
    remaining.forEach(f => {
      console.log(`   - ${f.path}`);
    });
    
    plan.push({
      id: "misc",
      title: "Additional Files",
      description: `Miscellaneous project files`,
      status: "completed",
      priority: "medium",
      dependencies: [],
      code: remaining.map(f => `<!-- file: ${f.path} -->\n${f.content}`).join('\n\n')
    });
  }
  
  console.log("\n=== PLAN CONVERSION COMPLETE ===");
  console.log(`Total steps: ${plan.length}`);
  console.log(`Total files processed: ${processedPaths.size}/${files.length}`);
  
  if (processedPaths.size !== files.length) {
    console.error(`❌ MISMATCH: Expected ${files.length} files, processed ${processedPaths.size}`);
  } else {
    console.log(`✅ All files accounted for!`);
  }
  
  return plan;
}

/**
 * Main AutoForge V2 Generation Task
 */
export const generateAppTask = task({
  id: "autoforge-generate-app-v2",
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },
  queue: {
    concurrencyLimit: 3,
  },
  run: async (payload: GenerateAppPayload): Promise<GenerateAppResult> => {
    const { userPrompt, userId } = payload;

    logger.info("🚀 AutoForge V2 Ultra: Starting generation", {
      prompt: userPrompt,
      userId,
    });

    try {
      // Generate complete application using V2 engine
      const result: GenerationResult = await generateCompleteApp(userPrompt, {
        onProgress: (status: string) => {
          logger.info(`📊 Progress: ${status}`);
        },
      });

      logger.info("✅ Generation complete!", {
        totalFiles: result.files.length,
        projectName: result.metadata.projectName,
        generationTime: `${(result.metadata.generationTime / 1000).toFixed(1)}s`,
      });

      // Convert to plan format for UI
      const plan = convertToPlanFormat(
        result.files.map((f: { path: string; content: string }) => ({ path: f.path, content: f.content }))
      );

      logger.info("📋 Plan created", {
        totalSteps: plan.length,
        filesDistributed: result.files.length,
      });

      // Verify critical files exist
      const criticalFiles = [
        "package.json",
        "app/layout.tsx",
        "app/page.tsx",
      ];
      
      const missingCritical = criticalFiles.filter(
        (file) => !result.files.some((f: { path: string; content: string }) => f.path === file)
      );

      if (missingCritical.length > 0) {
        logger.warn("⚠️ Missing critical files", {
          missing: missingCritical,
        });
      }

      return {
        success: true,
        plan,
        projectName: result.metadata.projectName,
        metadata: {
          totalFiles: result.files.length,
          generationTime: result.metadata.generationTime,
          framework: result.metadata.framework,
        },
      };
    } catch (error) {
      logger.error("❌ Generation failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Return error plan
      return {
        success: false,
        plan: [
          {
            id: "error",
            title: "Generation Failed",
            description:
              error instanceof Error ? error.message : "Unknown error occurred",
            status: "failed",
            priority: "critical",
            dependencies: [],
            error:
              error instanceof Error ? error.message : "Unknown error occurred",
          },
        ],
        projectName: "failed-generation",
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

/**
 * Status check task for long-running generations
 */
export const checkGenerationStatus = task({
  id: "autoforge-check-status",
  run: async (payload: { jobId: string }) => {
    logger.info("📊 Checking generation status", { jobId: payload.jobId });
    
    // This is a placeholder for status checking
    // In a real implementation, you'd query your database or cache
    return {
      jobId: payload.jobId,
      status: "completed",
      progress: 100,
    };
  },
});

/**
 * Cleanup task for expired generations
 */
export const cleanupExpiredGenerations = task({
  id: "autoforge-cleanup",
  run: async () => {
    logger.info("🧹 Starting cleanup of expired generations");
    
    // Placeholder for cleanup logic
    // In production, you'd:
    // 1. Query database for old generations
    // 2. Delete associated files
    // 3. Update database records
    
    logger.info("✅ Cleanup complete");
    
    return {
      cleaned: 0,
      timestamp: new Date().toISOString(),
    };
  },
});

/**
 * Health check task
 */
export const healthCheck = task({
  id: "autoforge-health-check",
  run: async () => {
    logger.info("💊 Running health check");
    
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        anthropic: process.env.ANTHROPIC_API_KEY ? "configured" : "missing",
        database: "connected", // Placeholder
      },
    };
    
    logger.info("✅ Health check complete", health);
    
    return health;
  },
});