/**
 * Validator Types
 *
 * File: src/lib/generation/validators/types.ts
 *
 * Common types for the validation system
 */

import { GeneratedFile } from '../bolt-generator';

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  type: string;
  message: string;
  file: string;
  line?: number;
  column?: number;
  code?: string;
  fixable: boolean;
  suggestion?: string;
}

export interface ValidationResult {
  success: boolean;
  issues: ValidationIssue[];
  fixedFiles?: GeneratedFile[];
  meta?: {
    validatorName: string;
    duration: number;
    filesChecked: number;
  };
}

export interface Validator {
  name: string;
  validate: (files: GeneratedFile[]) => Promise<ValidationResult>;
  autoFix?: (files: GeneratedFile[], issues: ValidationIssue[]) => Promise<GeneratedFile[]>;
}

export interface ValidatorOptions {
  skipAutoFix?: boolean;
  severity?: 'error' | 'warning' | 'info';
  timeout?: number;
}
