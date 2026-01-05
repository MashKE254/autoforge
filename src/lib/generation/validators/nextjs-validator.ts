/**
 * Next.js Architecture Validator
 *
 * File: src/lib/generation/validators/nextjs-validator.ts
 *
 * Validates Next.js-specific architectural rules:
 * - Server/Client component boundaries
 * - Metadata exports
 * - Route conflicts
 * - Import restrictions
 */

import { GeneratedFile } from '../bolt-generator';
import { Validator, ValidationResult, ValidationIssue } from './types';

export class NextjsValidator implements Validator {
  name = 'Next.js Architecture';

  async validate(files: GeneratedFile[]): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    console.log(`\n   🔍 Next.js Validator checking ${files.length} files...`);
    const layoutFiles = files.filter(f => f.path.includes('layout.tsx'));
    console.log(`   📋 Layout files found: ${layoutFiles.map(f => f.path).join(', ') || 'NONE'}`);

    for (const file of files) {
      // Only validate TypeScript/JavaScript files
      if (!file.path.match(/\.(tsx?|jsx?)$/)) continue;

      const content = file.content;
      const lines = content.split('\n');

      // Extra logging for layout files
      if (file.path.includes('layout.tsx')) {
        console.log(`\n   🔎 Examining ${file.path}:`);
        console.log(`      First 500 chars: ${content.substring(0, 500).replace(/\n/g, '\\n')}`);
      }

      // Rule 1: Check for 'use client' + metadata conflicts
      // Check for "use client" in ANY format (with/without quotes mixing, with/without semicolon, with trailing spaces, comments, etc.)
      const hasUseClient =
        /['"]use client['"];?\s*$/m.test(content) ||  // Standard format on its own line
        /^['"]use client['"];?\s*$/m.test(content) ||  // At start of line
        /['"]use client['"]/.test(content);            // Anywhere in content (catch-all)
      const hasMetadata = /export\s+(const\s+metadata|async\s+function\s+generateMetadata)/.test(content);

      if (file.path.includes('layout.tsx')) {
        console.log(`      hasUseClient: ${hasUseClient}, hasMetadata: ${hasMetadata}`);
      }

      if (hasUseClient && hasMetadata) {
        const metadataLine = lines.findIndex(line => /export\s+(const\s+metadata|async\s+function\s+generateMetadata)/.test(line));

        issues.push({
          severity: 'error',
          type: 'nextjs-metadata-client-conflict',
          message: `Cannot export metadata from a client component. Remove "use client" or move metadata to a Server Component.`,
          file: file.path,
          line: metadataLine + 1,
          fixable: true,
          suggestion: 'Remove "use client" directive (layouts should be Server Components)',
        });
      }

      // Rule 2: Check for layout.tsx with 'use client'
      if (file.path.includes('layout.tsx') && hasUseClient) {
        const useClientLine = lines.findIndex(line => /['"]use client['"];?/.test(line));

        issues.push({
          severity: 'error',
          type: 'nextjs-layout-client-component',
          message: `Layout files should be Server Components. Remove "use client" from layout.tsx.`,
          file: file.path,
          line: useClientLine + 1,
          fixable: true,
          suggestion: 'Extract interactive logic to separate client components',
        });
      }

      // Rule 3: Check for server-only imports in client components
      if (hasUseClient) {
        const serverOnlyImports = [
          'next/headers',
          'next/cookies',
          'server-only',
          'fs',
          'path',
          'crypto',
        ];

        for (const serverImport of serverOnlyImports) {
          if (content.includes(`from '${serverImport}'`) || content.includes(`from "${serverImport}"`)) {
            const importLine = lines.findIndex(line => line.includes(serverImport));

            issues.push({
              severity: 'error',
              type: 'nextjs-server-import-in-client',
              message: `Cannot import "${serverImport}" in a client component.`,
              file: file.path,
              line: importLine + 1,
              fixable: false,
              suggestion: 'Move this logic to a Server Component or use a different approach',
            });
          }
        }
      }

      // Rule 4: Check for client-only hooks in server components
      if (!hasUseClient && !file.path.includes('.client.')) {
        const clientHooks = ['useState', 'useEffect', 'useLayoutEffect', 'useReducer', 'useContext'];

        for (const hook of clientHooks) {
          const hookPattern = new RegExp(`\\b${hook}\\s*\\(`);
          if (hookPattern.test(content)) {
            const hookLine = lines.findIndex(line => hookPattern.test(line));

            issues.push({
              severity: 'error',
              type: 'nextjs-client-hook-in-server',
              message: `Cannot use ${hook} in a Server Component. Add "use client" directive or extract to a client component.`,
              file: file.path,
              line: hookLine + 1,
              fixable: true,
              suggestion: 'Add "use client" directive at the top of the file',
            });
          }
        }
      }

      // Rule 5: Check for async components without Promise return type
      const asyncComponentMatch = content.match(/export\s+(default\s+)?async\s+function\s+(\w+)/);
      if (asyncComponentMatch && !hasUseClient) {
        const hasPromiseReturn = new RegExp(`function\\s+${asyncComponentMatch[2]}[^{]*:\\s*Promise`).test(content);

        if (!hasPromiseReturn && !content.includes('): Promise<')) {
          issues.push({
            severity: 'warning',
            type: 'nextjs-async-component-type',
            message: `Async Server Components should have explicit Promise return type`,
            file: file.path,
            fixable: false,
            suggestion: `Add return type: Promise<JSX.Element>`,
          });
        }
      }

      // Rule 6: Check for route conflicts (duplicate page.tsx in same folder)
      const pageFiles = files.filter(f => f.path.endsWith('page.tsx'));
      const routePaths = pageFiles.map(f => f.path.replace(/\/page\.tsx$/, ''));
      const duplicates = routePaths.filter((path, index) => routePaths.indexOf(path) !== index);

      if (duplicates.length > 0 && file.path.endsWith('page.tsx')) {
        const route = file.path.replace(/\/page\.tsx$/, '');
        if (duplicates.includes(route)) {
          issues.push({
            severity: 'error',
            type: 'nextjs-route-conflict',
            message: `Duplicate route detected: ${route}`,
            file: file.path,
            fixable: false,
          });
        }
      }
    }

    console.log(`\n   📋 Next.js Validator Summary:`);
    console.log(`      Total issues: ${issues.length}`);
    console.log(`      Fixable: ${issues.filter(i => i.fixable).length}`);
    console.log(`      Non-fixable: ${issues.filter(i => !i.fixable).length}`);

    if (issues.length > 0) {
      console.log(`\n   📝 Issue breakdown:`);
      const issuesByType = issues.reduce((acc, issue) => {
        acc[issue.type] = (acc[issue.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(issuesByType).forEach(([type, count]) => {
        const fixable = issues.filter(i => i.type === type && i.fixable).length;
        console.log(`      ${type}: ${count} (${fixable} fixable)`);
      });
    }

    return {
      success: issues.filter(i => i.severity === 'error').length === 0,
      issues,
    };
  }

  async autoFix(files: GeneratedFile[], issues: ValidationIssue[]): Promise<GeneratedFile[]> {
    console.log(`     🔧 NextJS autoFix called with ${issues.length} issues`);
    const fixedFiles = [...files];

    for (const issue of issues) {
      console.log(`     🔧 Processing issue: ${issue.type} in ${issue.file}`);

      if (!issue.fixable) {
        console.log(`     ⏭️  Skipping non-fixable issue: ${issue.type}`);
        continue;
      }

      const fileIndex = fixedFiles.findIndex(f => f.path === issue.file);
      if (fileIndex === -1) {
        console.log(`     ⚠️  File not found: ${issue.file}`);
        continue;
      }

      const file = fixedFiles[fileIndex];
      let content = file.content;
      const originalContent = content;

      switch (issue.type) {
        case 'nextjs-metadata-client-conflict':
        case 'nextjs-layout-client-component':
          console.log(`     🔍 Checking for "use client" in ${file.path}...`);
          console.log(`     📄 File has ${content.split('\n').length} lines`);
          console.log(`     📝 First 300 chars BEFORE fix: ${content.substring(0, 300)}`);

          // Remove 'use client' directive with COMPREHENSIVE matching
          // Match ANY line that contains "use client" (quotes can be mixed, with/without semicolon, with/without trailing content)
          content = content.replace(/^(\s*)['"]use client['"];?(\s*\/\/.*)?$/gm, ''); // With optional comment
          content = content.replace(/^(\s*)['"]use client['"];?\s*$/gm, '');         // Without comment (redundant but safe)
          // Remove any multiple consecutive blank lines left behind
          content = content.replace(/\n\n\n+/g, '\n\n');
          // Trim any leading whitespace
          content = content.trim();

          console.log(`     📝 First 300 chars AFTER fix: ${content.substring(0, 300)}`);

          if (content !== originalContent) {
            console.log(`     ✅ Removed "use client" from ${file.path}`);
          } else {
            console.log(`     ⚠️  No changes made to ${file.path} - regex didn't match`);
            console.log(`     📝 First 200 chars: ${content.substring(0, 200)}`);
          }
          break;

        case 'nextjs-client-hook-in-server':
          // Add 'use client' directive at the top
          if (!content.startsWith("'use client'") && !content.startsWith('"use client"')) {
            content = `'use client';\n\n${content}`;
            console.log(`     ✅ Added "use client" to ${file.path}`);
          }
          break;
      }

      fixedFiles[fileIndex] = {
        ...file,
        content,
      };
    }

    console.log(`     ✅ NextJS autoFix completed`);
    return fixedFiles;
  }
}

export const nextjsValidator = new NextjsValidator();
