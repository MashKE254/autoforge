/**
 * Completeness Validator
 *
 * File: src/lib/generation/validators/completeness-validator.ts
 *
 * Option D of the Masterclass Validation System
 *
 * Ensures ALL imported components have corresponding files in the generation.
 * This prevents placeholder/stub components from appearing in WebContainer previews.
 *
 * Why This Matters:
 * - AI sometimes references components it doesn't create
 * - This causes the stub system to create placeholders
 * - Users see "Component: X - This is a placeholder" instead of real components
 * - This validator FAILS generation if components are missing, forcing AI to regenerate
 */

import { GeneratedFile } from '../bolt-generator';
import { Validator, ValidationResult, ValidationIssue } from './types';

/**
 * Completeness Validator - Ensures all imports have corresponding files
 */
class CompletenessValidator implements Validator {
  name = 'Completeness Validator (Import Coverage)';

  async validate(files: GeneratedFile[]): Promise<ValidationResult> {
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];

    // Build a set of all file paths for quick lookup
    const filePathsSet = new Set<string>();
    files.forEach(file => {
      filePathsSet.add(file.path);
      // Also add variations (with/without extensions, with/without @/)
      filePathsSet.add(file.path.replace(/\.(tsx?|jsx?)$/, ''));
      filePathsSet.add(file.path.replace(/^@\//, ''));
    });

    // Scan all files for component imports
    for (const file of files) {
      if (!this.isCodeFile(file.path)) {
        continue;
      }

      const missingImports = this.findMissingImports(file, filePathsSet);

      for (const missing of missingImports) {
        issues.push({
          severity: 'error',
          type: 'missing-component',
          message: `Component "${missing.componentName}" is imported but file "${missing.expectedPath}" does not exist`,
          file: file.path,
          line: missing.line,
          fixable: false,
          suggestion: `Generate ${missing.expectedPath} with a complete implementation including demo data and full interactivity.`,
        });
      }
    }

    const duration = Date.now() - startTime;
    const success = issues.length === 0;

    return {
      success,
      issues,
      meta: {
        validatorName: this.name,
        duration,
        filesChecked: files.length,
      },
    };
  }

  /**
   * Check if file should be scanned for imports
   */
  private isCodeFile(path: string): boolean {
    return (
      path.endsWith('.ts') ||
      path.endsWith('.tsx') ||
      path.endsWith('.js') ||
      path.endsWith('.jsx')
    );
  }

  /**
   * Find all component imports that don't have corresponding files
   */
  private findMissingImports(
    file: GeneratedFile,
    filePathsSet: Set<string>
  ): Array<{ componentName: string; expectedPath: string; line: number }> {
    const missing: Array<{ componentName: string; expectedPath: string; line: number }> = [];
    const lines = file.content.split('\n');

    lines.forEach((line, index) => {
      // Match component imports: import { Component } from './path' or '@/path'
      const importMatches = line.matchAll(
        /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g
      );

      for (const match of importMatches) {
        const componentNames = match[1].split(',').map(c => c.trim());
        const importPath = match[2];

        // Skip node_modules imports
        if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
          continue;
        }

        // Skip non-component imports (utils, types, etc.)
        if (this.isUtilityImport(importPath)) {
          continue;
        }

        // Check if the imported file exists
        const possiblePaths = this.getPossiblePaths(importPath, file.path);
        const exists = possiblePaths.some(p =>
          filePathsSet.has(p) ||
          filePathsSet.has(p.replace(/^@\//, '')) ||
          filePathsSet.has(p.replace(/\.(tsx?|jsx?)$/, ''))
        );

        if (!exists) {
          // This is a missing component!
          missing.push({
            componentName: componentNames[0], // Use first component name
            expectedPath: possiblePaths[0], // Use most likely path
            line: index + 1,
          });
        }
      }

      // Also check default imports: import Component from './path'
      const defaultImportMatch = line.match(
        /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/
      );

      if (defaultImportMatch) {
        const componentName = defaultImportMatch[1];
        const importPath = defaultImportMatch[2];

        // Skip if it's a named import (already handled above)
        if (line.includes('{')) {
          return;
        }

        // Skip node_modules and utility imports
        if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
          return;
        }
        if (this.isUtilityImport(importPath)) {
          return;
        }

        const possiblePaths = this.getPossiblePaths(importPath, file.path);
        const exists = possiblePaths.some(p =>
          filePathsSet.has(p) ||
          filePathsSet.has(p.replace(/^@\//, '')) ||
          filePathsSet.has(p.replace(/\.(tsx?|jsx?)$/, ''))
        );

        if (!exists) {
          missing.push({
            componentName,
            expectedPath: possiblePaths[0],
            line: index + 1,
          });
        }
      }
    });

    return missing;
  }

  /**
   * Check if import is a utility (not a component)
   */
  private isUtilityImport(path: string): boolean {
    const utilityPatterns = [
      '/lib/',
      '/utils/',
      '/helpers/',
      '/hooks/',
      '/types/',
      '/constants/',
      '/config/',
      '/styles/',
      '.css',
      '.scss',
    ];

    return utilityPatterns.some(pattern => path.includes(pattern));
  }

  /**
   * Get possible file paths for an import
   */
  private getPossiblePaths(importPath: string, currentFilePath: string): string[] {
    const paths: string[] = [];

    // Normalize import path
    let normalizedPath = importPath;

    // Handle @/ alias
    if (normalizedPath.startsWith('@/')) {
      normalizedPath = normalizedPath.substring(2);
    }

    // Handle relative paths (./component or ../component)
    if (normalizedPath.startsWith('.')) {
      const currentDir = currentFilePath.split('/').slice(0, -1).join('/');

      // Resolve relative path
      const parts = normalizedPath.split('/');
      const dirParts = currentDir.split('/');

      for (const part of parts) {
        if (part === '..') {
          dirParts.pop();
        } else if (part !== '.') {
          dirParts.push(part);
        }
      }

      normalizedPath = dirParts.join('/');
    }

    // Add with different extensions
    paths.push(`${normalizedPath}.tsx`);
    paths.push(`${normalizedPath}.ts`);
    paths.push(`${normalizedPath}.jsx`);
    paths.push(`${normalizedPath}.js`);
    paths.push(`${normalizedPath}/index.tsx`);
    paths.push(`${normalizedPath}/index.ts`);

    return paths;
  }

  // No auto-fix for missing components - they require AI re-generation
  // autoFix is undefined, so the pipeline won't attempt to fix these
}

// Export singleton instance
export const completenessValidator = new CompletenessValidator();
