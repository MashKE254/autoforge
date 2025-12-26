/**
 * Import Validator
 *
 * File: src/lib/generation/validators/import-validator.ts
 *
 * Validates imports:
 * - Missing files (broken imports)
 * - Circular dependencies (basic detection)
 */

import { GeneratedFile } from '../bolt-generator';
import { Validator, ValidationResult, ValidationIssue } from './types';

export class ImportValidator implements Validator {
  name = 'Imports';

  async validate(files: GeneratedFile[]): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    // Build a map of all file paths for quick lookup
    const filePaths = new Set(files.map(f => this.normalizePath(f.path)));

    for (const file of files) {
      if (!file.path.match(/\.(tsx?|jsx?)$/)) continue;

      const lines = file.content.split('\n');
      const importMatches = file.content.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g);

      for (const match of importMatches) {
        const importPath = match[1];

        // Skip external packages (non-relative imports)
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) continue;

        // Resolve the import path relative to the current file
        const resolvedPath = this.resolveImport(file.path, importPath);

        // Check if the file exists
        if (!this.fileExists(resolvedPath, filePaths)) {
          const lineNumber = lines.findIndex(line => line.includes(match[0])) + 1;

          issues.push({
            severity: 'error',
            type: 'missing-import-file',
            message: `Import "${importPath}" points to non-existent file: ${resolvedPath}`,
            file: file.path,
            line: lineNumber,
            fixable: false,
            suggestion: 'Ensure the imported file is generated or fix the import path',
          });
        }
      }
    }

    // Basic circular dependency detection
    const importGraph = this.buildImportGraph(files);
    const cycles = this.detectCycles(importGraph);

    for (const cycle of cycles) {
      issues.push({
        severity: 'warning',
        type: 'circular-dependency',
        message: `Circular dependency detected: ${cycle.join(' → ')}`,
        file: cycle[0],
        fixable: false,
        suggestion: 'Consider restructuring to remove circular dependencies',
      });
    }

    return {
      success: issues.filter(i => i.severity === 'error').length === 0,
      issues,
    };
  }

  /**
   * Normalize file path for comparison
   */
  private normalizePath(path: string): string {
    // Remove leading ./ or /
    let normalized = path.replace(/^\.?\/?/, '');

    // Add common extensions if missing
    if (!normalized.match(/\.(tsx?|jsx?)$/)) {
      const extensions = ['.tsx', '.ts', '.jsx', '.js'];
      for (const ext of extensions) {
        return normalized + ext;
      }
    }

    return normalized;
  }

  /**
   * Resolve import path relative to current file
   */
  private resolveImport(currentFile: string, importPath: string): string {
    const currentDir = currentFile.split('/').slice(0, -1).join('/');

    // Handle relative imports
    if (importPath.startsWith('./')) {
      return this.normalizePath(`${currentDir}/${importPath.slice(2)}`);
    }

    if (importPath.startsWith('../')) {
      const parts = currentDir.split('/');
      const upLevels = importPath.match(/\.\.\//g)?.length || 0;
      const basePath = parts.slice(0, -upLevels).join('/');
      const relativePath = importPath.replace(/\.\.\//g, '');
      return this.normalizePath(`${basePath}/${relativePath}`);
    }

    // Absolute imports (from root)
    if (importPath.startsWith('/')) {
      return this.normalizePath(importPath.slice(1));
    }

    // Alias imports (@/)
    if (importPath.startsWith('@/')) {
      return this.normalizePath(importPath.slice(2));
    }

    return this.normalizePath(importPath);
  }

  /**
   * Check if a file exists (with common extension variations)
   */
  private fileExists(path: string, filePaths: Set<string>): boolean {
    // Try exact match first
    if (filePaths.has(path)) return true;

    // Try with common extensions
    const extensions = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];

    for (const ext of extensions) {
      if (filePaths.has(path + ext)) return true;
    }

    return false;
  }

  /**
   * Build import graph for circular dependency detection
   */
  private buildImportGraph(files: GeneratedFile[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const file of files) {
      if (!file.path.match(/\.(tsx?|jsx?)$/)) continue;

      const imports = new Set<string>();
      const importMatches = file.content.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g);

      for (const match of importMatches) {
        const importPath = match[1];
        if (importPath.startsWith('.') || importPath.startsWith('/') || importPath.startsWith('@/')) {
          const resolved = this.resolveImport(file.path, importPath);
          imports.add(resolved);
        }
      }

      graph.set(this.normalizePath(file.path), imports);
    }

    return graph;
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCycles(graph: Map<string, Set<string>>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || new Set();

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          // Cycle detected
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            cycles.push([...path.slice(cycleStart), neighbor]);
          }
        }
      }

      recursionStack.delete(node);
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }
}

export const importValidator = new ImportValidator();
