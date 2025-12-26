/**
 * Validation Pipeline
 *
 * File: src/lib/generation/validators/validation-pipeline.ts
 *
 * Orchestrates multiple validators to ensure generated code quality
 */

import { GeneratedFile } from '../bolt-generator';
import { Validator, ValidationResult, ValidationIssue, ValidatorOptions } from './types';

export class ValidationPipeline {
  private validators: Validator[] = [];

  /**
   * Register a validator
   */
  register(validator: Validator): void {
    this.validators.push(validator);
  }

  /**
   * Run all validators with auto-fix
   */
  async validateAndFix(
    files: GeneratedFile[],
    options: ValidatorOptions = {}
  ): Promise<{
    success: boolean;
    files: GeneratedFile[];
    allIssues: ValidationIssue[];
    summary: {
      totalValidators: number;
      totalIssues: number;
      fixedIssues: number;
      remainingIssues: number;
    };
  }> {
    console.log(`🔍 Running ${this.validators.length} validators...`);

    let currentFiles = files;
    const allIssues: ValidationIssue[] = [];
    let totalFixed = 0;

    for (const validator of this.validators) {
      const startTime = Date.now();
      console.log(`   → ${validator.name}...`);

      try {
        // Run validation
        const result = await validator.validate(currentFiles);
        const duration = Date.now() - startTime;

        if (result.issues.length > 0) {
          console.log(`     Found ${result.issues.length} issues (${duration}ms)`);
          allIssues.push(...result.issues);

          // Auto-fix if possible and not disabled
          if (!options.skipAutoFix && validator.autoFix) {
            const fixableIssues = result.issues.filter(issue => issue.fixable);

            if (fixableIssues.length > 0) {
              console.log(`     Auto-fixing ${fixableIssues.length} issues...`);
              const fixedFiles = await validator.autoFix(currentFiles, fixableIssues);
              currentFiles = fixedFiles;
              totalFixed += fixableIssues.length;

              // Re-validate to confirm fixes
              const revalidation = await validator.validate(currentFiles);
              if (revalidation.issues.length < result.issues.length) {
                console.log(`     ✅ Fixed ${result.issues.length - revalidation.issues.length} issues`);
              }
            }
          }
        } else {
          console.log(`     ✅ No issues (${duration}ms)`);
        }
      } catch (error) {
        console.error(`     ❌ Validator failed:`, error);
        allIssues.push({
          severity: 'error',
          type: 'validator-error',
          message: `Validator ${validator.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          file: 'system',
          fixable: false,
        });
      }
    }

    const errors = allIssues.filter(i => i.severity === 'error');
    const success = errors.length === 0;

    console.log(`\n📊 Validation Summary:`);
    console.log(`   Total issues found: ${allIssues.length}`);
    console.log(`   Auto-fixed: ${totalFixed}`);
    console.log(`   Remaining: ${allIssues.length - totalFixed}`);
    console.log(`   Success: ${success ? '✅' : '❌'}`);

    return {
      success,
      files: currentFiles,
      allIssues,
      summary: {
        totalValidators: this.validators.length,
        totalIssues: allIssues.length,
        fixedIssues: totalFixed,
        remainingIssues: allIssues.length - totalFixed,
      },
    };
  }

  /**
   * Run validators without auto-fix (check only)
   */
  async validate(files: GeneratedFile[]): Promise<ValidationResult> {
    const result = await this.validateAndFix(files, { skipAutoFix: true });

    return {
      success: result.success,
      issues: result.allIssues,
    };
  }
}

// Singleton instance
export const validationPipeline = new ValidationPipeline();
