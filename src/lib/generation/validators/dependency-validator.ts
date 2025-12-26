/**
 * Dependency Validator
 *
 * File: src/lib/generation/validators/dependency-validator.ts
 *
 * Validates package dependencies:
 * - Missing imports in package.json
 * - Version conflicts
 * - Deprecated packages
 */

import { GeneratedFile } from '../bolt-generator';
import { Validator, ValidationResult, ValidationIssue } from './types';

export class DependencyValidator implements Validator {
  name = 'Dependencies';

  // Common package mappings (import → package name)
  private importToPackage: Record<string, string> = {
    'react': 'react',
    'react-dom': 'react-dom',
    'next': 'next',
    'lucide-react': 'lucide-react',
    '@radix-ui/react-dialog': '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu': '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-select': '@radix-ui/react-select',
    '@radix-ui/react-tabs': '@radix-ui/react-tabs',
    '@radix-ui/react-slot': '@radix-ui/react-slot',
    'class-variance-authority': 'class-variance-authority',
    'clsx': 'clsx',
    'tailwind-merge': 'tailwind-merge',
    'zod': 'zod',
    'react-hook-form': 'react-hook-form',
    '@hookform/resolvers': '@hookform/resolvers',
    'framer-motion': 'framer-motion',
    'recharts': 'recharts',
    'date-fns': 'date-fns',
    'axios': 'axios',
    'swr': 'swr',
    '@tanstack/react-query': '@tanstack/react-query',
  };

  async validate(files: GeneratedFile[]): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    // Find package.json
    const packageJsonFile = files.find(f => f.path === 'package.json');
    if (!packageJsonFile) {
      issues.push({
        severity: 'error',
        type: 'missing-package-json',
        message: 'No package.json found in generated files',
        file: 'package.json',
        fixable: false,
      });
      return { success: false, issues };
    }

    let packageJson: any;
    try {
      packageJson = JSON.parse(packageJsonFile.content);
    } catch (error) {
      issues.push({
        severity: 'error',
        type: 'invalid-package-json',
        message: 'Invalid package.json format',
        file: 'package.json',
        fixable: false,
      });
      return { success: false, issues };
    }

    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Extract all imports from TypeScript/JavaScript files
    const imports = new Set<string>();
    for (const file of files) {
      if (!file.path.match(/\.(tsx?|jsx?)$/)) continue;

      const importMatches = file.content.matchAll(/import\s+(?:.*?from\s+)?['"]([^'"]+)['"]/g);
      for (const match of importMatches) {
        const importPath = match[1];
        // Skip relative imports
        if (importPath.startsWith('.') || importPath.startsWith('/')) continue;
        // Extract package name (handle scoped packages)
        const packageName = importPath.startsWith('@')
          ? importPath.split('/').slice(0, 2).join('/')
          : importPath.split('/')[0];
        imports.add(packageName);
      }
    }

    // Check for missing dependencies
    for (const importName of imports) {
      const packageName = this.importToPackage[importName] || importName;

      if (!allDependencies[packageName]) {
        issues.push({
          severity: 'error',
          type: 'missing-dependency',
          message: `Package "${packageName}" is imported but not in package.json`,
          file: 'package.json',
          fixable: true,
          suggestion: `Add "${packageName}" to dependencies`,
        });
      }
    }

    // Check for deprecated packages
    const deprecatedPackages: Record<string, string> = {
      '@emotion/core': 'Use @emotion/react instead',
      '@emotion/styled': 'Use @emotion/react and @emotion/styled from @emotion/react',
      'enzyme': 'Use @testing-library/react instead',
      'moment': 'Use date-fns or dayjs instead (smaller bundle)',
    };

    for (const [pkg, suggestion] of Object.entries(deprecatedPackages)) {
      if (allDependencies[pkg]) {
        issues.push({
          severity: 'warning',
          type: 'deprecated-dependency',
          message: `Package "${pkg}" is deprecated. ${suggestion}`,
          file: 'package.json',
          fixable: false,
        });
      }
    }

    // Check for React version conflicts
    if (allDependencies['react']) {
      const reactVersion = allDependencies['react'];
      const reactDomVersion = allDependencies['react-dom'];

      if (reactDomVersion && reactVersion !== reactDomVersion) {
        issues.push({
          severity: 'error',
          type: 'version-mismatch',
          message: `React version mismatch: react@${reactVersion} vs react-dom@${reactDomVersion}`,
          file: 'package.json',
          fixable: true,
        });
      }
    }

    return {
      success: issues.filter(i => i.severity === 'error').length === 0,
      issues,
    };
  }

  async autoFix(files: GeneratedFile[], issues: ValidationIssue[]): Promise<GeneratedFile[]> {
    const fixedFiles = [...files];
    const packageJsonFile = fixedFiles.find(f => f.path === 'package.json');

    if (!packageJsonFile) return fixedFiles;

    let packageJson: any;
    try {
      packageJson = JSON.parse(packageJsonFile.content);
    } catch {
      return fixedFiles;
    }

    let modified = false;

    for (const issue of issues) {
      if (!issue.fixable || issue.type !== 'missing-dependency') continue;

      const match = issue.message.match(/Package "([^"]+)" is imported/);
      if (match) {
        const packageName = match[1];

        // Add to dependencies with latest version
        if (!packageJson.dependencies) {
          packageJson.dependencies = {};
        }

        // Use specific versions for common packages
        const commonVersions: Record<string, string> = {
          'lucide-react': '^0.263.1',
          'class-variance-authority': '^0.7.0',
          'clsx': '^2.0.0',
          'tailwind-merge': '^2.0.0',
          'zod': '^3.22.0',
          'react-hook-form': '^7.48.0',
          '@hookform/resolvers': '^3.3.0',
          'framer-motion': '^10.16.0',
          'recharts': '^2.10.0',
          'date-fns': '^2.30.0',
          'axios': '^1.6.0',
          'swr': '^2.2.0',
          '@tanstack/react-query': '^5.0.0',
        };

        packageJson.dependencies[packageName] = commonVersions[packageName] || 'latest';
        modified = true;
        console.log(`     ✅ Added ${packageName} to dependencies`);
      }
    }

    // Fix version mismatches
    for (const issue of issues) {
      if (issue.type === 'version-mismatch' && issue.fixable) {
        const reactVersion = packageJson.dependencies['react'];
        if (reactVersion) {
          packageJson.dependencies['react-dom'] = reactVersion;
          modified = true;
          console.log(`     ✅ Synced react-dom version to ${reactVersion}`);
        }
      }
    }

    if (modified) {
      const fileIndex = fixedFiles.findIndex(f => f.path === 'package.json');
      fixedFiles[fileIndex] = {
        ...packageJsonFile,
        content: JSON.stringify(packageJson, null, 2),
      };
    }

    return fixedFiles;
  }
}

export const dependencyValidator = new DependencyValidator();
