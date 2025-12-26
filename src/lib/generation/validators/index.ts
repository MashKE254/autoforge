/**
 * Validators Export
 *
 * File: src/lib/generation/validators/index.ts
 */

export * from './types';
export * from './validation-pipeline';
export * from './nextjs-validator';
export * from './dependency-validator';
export * from './import-validator';

// Re-export configured pipeline
import { validationPipeline } from './validation-pipeline';
import { nextjsValidator } from './nextjs-validator';
import { dependencyValidator } from './dependency-validator';
import { importValidator } from './import-validator';

// Register all validators
validationPipeline.register(nextjsValidator);
validationPipeline.register(dependencyValidator);
validationPipeline.register(importValidator);

export { validationPipeline };
