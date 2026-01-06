/**
 * Validators Export
 *
 * File: src/lib/generation/validators/index.ts
 */

export * from './types';
export * from './validation-pipeline';
export * from './syntax-validator';
export * from './nextjs-validator';
export * from './dependency-validator';
export * from './import-validator';

// Re-export configured pipeline
import { validationPipeline } from './validation-pipeline';
import { syntaxValidator } from './syntax-validator';
import { nextjsValidator } from './nextjs-validator';
import { dependencyValidator } from './dependency-validator';
import { importValidator } from './import-validator';

// Register all validators
// CRITICAL: Syntax validator MUST run FIRST to catch all syntax errors
// before other validators attempt to process the code
validationPipeline.register(syntaxValidator);
validationPipeline.register(nextjsValidator);
validationPipeline.register(dependencyValidator);
validationPipeline.register(importValidator);

export { validationPipeline };
