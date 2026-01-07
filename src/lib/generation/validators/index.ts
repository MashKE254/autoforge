/**
 * Validators Export
 *
 * File: src/lib/generation/validators/index.ts
 */

export * from './types';
export * from './validation-pipeline';
export * from './syntax-validator';
export * from './completeness-validator';
export * from './nextjs-validator';
export * from './dependency-validator';
export * from './import-validator';

// Re-export configured pipeline
import { validationPipeline } from './validation-pipeline';
import { syntaxValidator } from './syntax-validator';
import { completenessValidator } from './completeness-validator';
import { nextjsValidator } from './nextjs-validator';
import { dependencyValidator } from './dependency-validator';
import { importValidator } from './import-validator';

// Register all validators
// CRITICAL ORDER:
// 1. Syntax validator - catch syntax errors first
// 2. Completeness validator - ensure all imports have files (prevents placeholders!)
// 3. Next.js validator - check framework-specific rules
// 4. Dependency validator - check package.json
// 5. Import validator - check import paths
validationPipeline.register(syntaxValidator);
validationPipeline.register(completenessValidator);
validationPipeline.register(nextjsValidator);
validationPipeline.register(dependencyValidator);
validationPipeline.register(importValidator);

export { validationPipeline };
