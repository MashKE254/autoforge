/**
 * WebContainer Utilities
 *
 * File: src/lib/webcontainer-utils.ts
 *
 * Utilities for making generated code compatible with WebContainer.
 * WebContainer has limitations - no native binaries, no file system access outside project, etc.
 */

// ============================================================================
// WEBCONTAINER-INCOMPATIBLE PACKAGES
// ============================================================================

/**
 * Packages that require native binaries or won't work in WebContainer
 */
const INCOMPATIBLE_PACKAGES = [
  'prisma',
  '@prisma/client',
  'sharp',
  'canvas',
  'bcrypt', // Use bcryptjs instead
  'node-gyp',
  'sqlite3',
  'better-sqlite3',
  'pg-native',
  'mysql',
  'mysql2',
  'oracledb',
  '@aws-sdk/client-s3', // Native crypto issues
  'chromadb', // Requires native dependencies
  'puppeteer', // Requires Chrome binary
  'playwright', // Requires browser binaries
  // Trading/specialized packages that don't exist on npm
  'metatrader-api',
  'mt4-api',
  'mt5-api',
  'forex-api',
  'trading-api',
  'metatrader',
  'mql4',
  'mql5',
  // Auth packages that need server infrastructure
  '@clerk/nextjs', // Requires server-side auth API
  '@supabase/ssr', // Requires real database
  '@supabase/supabase-js', // Requires real database
  'stripe', // Requires API keys
  // Non-existent @radix-ui packages (AI sometimes hallucinates these)
  '@radix-ui/react-calendar', // Does not exist - use react-day-picker instead
  '@radix-ui/react-datepicker', // Does not exist
  '@radix-ui/react-date-picker', // Does not exist
  '@radix-ui/react-form', // Does not exist
  // Non-existent @types packages (AI sometimes hallucinates these)
  '@types/jspdf', // Does not exist
  '@types/pdf-lib', // Does not exist
  '@types/pdfmake', // Does not exist
  '@types/recharts', // Does not exist - recharts has built-in types
  '@types/lucide-react', // Does not exist - lucide-react has built-in types
];

/**
 * Packages that should be replaced with alternatives
 */
const PACKAGE_REPLACEMENTS: Record<string, string> = {
  'bcrypt': 'bcryptjs',
};

// ============================================================================
// NPM PACKAGE VALIDATION
// ============================================================================

/**
 * Whitelist of known WebContainer-safe packages
 * These packages are pre-validated and guaranteed to work in WebContainer
 */
const WEBCONTAINER_SAFE_PACKAGES = new Set([
  // Core Next.js and React
  'next',
  'react',
  'react-dom',

  // TypeScript
  'typescript',
  '@types/node',
  '@types/react',
  '@types/react-dom',

  // Tailwind CSS
  'tailwindcss',
  'postcss',
  'autoprefixer',
  'tailwindcss-animate',
  '@tailwindcss/forms',
  '@tailwindcss/typography',
  '@tailwindcss/aspect-ratio',
  '@tailwindcss/line-clamp',

  // UI Libraries
  'lucide-react',
  'recharts',
  'date-fns',
  'clsx',
  'tailwind-merge',

  // Forms and Validation
  'react-hook-form',
  'zod',
  '@hookform/resolvers',

  // State Management
  'zustand',
  'jotai',
  'react-query',
  '@tanstack/react-query',

  // Utilities
  'class-variance-authority',
  'cmdk',
  'sonner',
  'react-hot-toast',
  'react-toastify',
  'react-use',
  'usehooks-ts',
  'immer',
  'react-error-boundary',

  // Icons
  '@radix-ui/react-icons',
  'react-icons',
  '@heroicons/react',

  // Next.js specific
  'next-themes',
  '@t3-oss/env-nextjs',

  // Carousels and UI components
  'embla-carousel-react',
  'embla-carousel-autoplay',
  'react-resizable-panels',
  'vaul',
  'react-textarea-autosize',
  'input-otp',

  // Form libraries
  'react-select',
  'react-phone-number-input',
  'libphonenumber-js',

  // Tables
  '@tanstack/react-table',

  // Radix UI (only packages that actually exist)
  '@radix-ui/react-accordion',
  '@radix-ui/react-alert-dialog',
  '@radix-ui/react-aspect-ratio',
  '@radix-ui/react-avatar',
  '@radix-ui/react-checkbox',
  '@radix-ui/react-collapsible',
  '@radix-ui/react-context-menu',
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-hover-card',
  '@radix-ui/react-label',
  '@radix-ui/react-menubar',
  '@radix-ui/react-navigation-menu',
  '@radix-ui/react-popover',
  '@radix-ui/react-progress',
  '@radix-ui/react-radio-group',
  '@radix-ui/react-scroll-area',
  '@radix-ui/react-select',
  '@radix-ui/react-separator',
  '@radix-ui/react-slider',
  '@radix-ui/react-slot',
  '@radix-ui/react-switch',
  '@radix-ui/react-tabs',
  '@radix-ui/react-toast',
  '@radix-ui/react-toggle',
  '@radix-ui/react-toggle-group',
  '@radix-ui/react-tooltip',

  // Date pickers (that actually exist)
  'react-day-picker',
  'react-datepicker',

  // Charts
  'recharts',
  'chart.js',
  'react-chartjs-2',

  // Markdown
  'react-markdown',
  'remark-gfm',

  // File handling (browser-compatible)
  'papaparse',
  'xlsx',

  // Animation
  'framer-motion',
  'gsap',
  'react-intersection-observer',

  // DnD
  '@dnd-kit/core',
  '@dnd-kit/sortable',
  '@dnd-kit/utilities',
  'react-beautiful-dnd',

  // Headless UI
  '@headlessui/react',

  // Crypto (browser-compatible)
  'bcryptjs',
  'crypto-js',

  // Other common packages
  'nanoid',
  'uuid',
  'lodash',
  'axios',
  'swr',

  // PDF libraries (browser-compatible)
  'jspdf',
  'pdf-lib',
  'pdfmake',
  'html2canvas',

  // QR Codes
  'qrcode.react',
  'qrcode',
  'react-qr-code',

  // Image handling
  'sharp-browser', // Browser-compatible sharp alternative

  // Data visualization
  'plotly.js',
  'd3',

  // Utilities
  'moment',
  'dayjs',
  'validator',
  'jsonwebtoken',
  'jwt-decode',

  // Storage
  'localforage',
  'idb',
  'idb-keyval',

  // Form libraries
  'formik',
  'yup',
  'final-form',

  // Testing (for completeness)
  'jest',
  '@testing-library/react',
  '@testing-library/jest-dom',
  'vitest',

  // ESLint/Prettier
  'eslint',
  'prettier',
  'eslint-config-next',
  'eslint-config-prettier',

  // Additional common packages (from bolt-generator)
  'source-map-js',
  '@clerk/nextjs',
  '@supabase/ssr',
  '@supabase/supabase-js',
  'stripe',

  // React ecosystem
  'react-is',
  'prop-types',
  'scheduler',

  // Build tools
  'esbuild',
  'vite',
  'webpack',

  // Other utilities
  'ms',
  'debug',
  'chalk',
]);

/**
 * Cache for npm package validation results
 * Format: { packageName: exists }
 */
const npmPackageCache = new Map<string, boolean>();

/**
 * Extract package name from an import statement
 * Examples:
 *   'react' -> 'react'
 *   'react-dom' -> 'react-dom'
 *   '@radix-ui/react-dialog' -> '@radix-ui/react-dialog'
 *   '@/lib/utils' -> null (local import)
 *   './components/Button' -> null (local import)
 */
function extractPackageNameFromImport(importPath: string): string | null {
  // Skip local imports (start with . or @/)
  if (importPath.startsWith('.') || importPath.startsWith('@/')) {
    return null;
  }

  // Scoped package: @scope/package or @scope/package/subpath
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return null;
  }

  // Regular package: package-name or package-name/subpath
  const firstPart = importPath.split('/')[0];
  return firstPart || null;
}

/**
 * Scan TypeScript/JavaScript file content for all imported packages
 */
function scanFileForImports(content: string): Set<string> {
  const packages = new Set<string>();

  // Match various import styles:
  // import foo from 'package'
  // import { foo } from 'package'
  // import * as foo from 'package'
  // const foo = require('package')
  // import('package')
  const importRegex = /(?:import\s+(?:{[^}]*}|[\w*,\s]+)\s+from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*\(\s*['"]([^'"]+)['"]\s*\))/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    // match[1] is for 'import ... from', match[2] for 'require', match[3] for 'import()'
    const importPath = match[1] || match[2] || match[3];
    if (importPath) {
      const packageName = extractPackageNameFromImport(importPath);
      if (packageName) {
        packages.add(packageName);
      }
    }
  }

  return packages;
}

/**
 * Scan all files and collect required npm packages
 */
function collectRequiredPackages(files: Array<{ path: string; content: string }>): Set<string> {
  const allPackages = new Set<string>();

  for (const file of files) {
    // Scan all JavaScript/TypeScript files including config files
    if (file.path.endsWith('.tsx') || file.path.endsWith('.ts') ||
        file.path.endsWith('.jsx') || file.path.endsWith('.js') ||
        file.path.endsWith('.mjs') || file.path.endsWith('.cjs') ||
        file.path.endsWith('.mts') || file.path.endsWith('.cts')) {
      const packages = scanFileForImports(file.content);
      packages.forEach(pkg => allPackages.add(pkg));
    }
  }

  return allPackages;
}

/**
 * Package version defaults for commonly imported packages
 */
const PACKAGE_VERSION_DEFAULTS: Record<string, string> = {
  // Tailwind plugins
  'tailwindcss-animate': '^1.0.7',
  '@tailwindcss/forms': '^0.5.7',
  '@tailwindcss/typography': '^0.5.10',
  '@tailwindcss/aspect-ratio': '^0.4.2',
  '@tailwindcss/line-clamp': '^0.4.4',
  // Utilities
  'class-variance-authority': '^0.7.0',
  'clsx': '^2.1.0',
  'tailwind-merge': '^2.2.0',
  'lucide-react': '^0.263.1',
  'recharts': '2.5.0', // Pinned version - 2.10.0 has WebContainer issues
  'date-fns': '^3.0.0',
  'react-hook-form': '^7.49.0',
  'zod': '^3.22.0',
  '@hookform/resolvers': '^3.3.0',
  'zustand': '^4.4.0',
  '@radix-ui/react-dialog': '^1.0.5',
  '@radix-ui/react-dropdown-menu': '^2.0.6',
  '@radix-ui/react-select': '^2.0.0',
  '@radix-ui/react-checkbox': '^1.0.4',
  '@radix-ui/react-label': '^2.0.2',
  '@radix-ui/react-slot': '^1.0.2',
  '@radix-ui/react-separator': '^1.0.3',
  '@radix-ui/react-avatar': '^1.0.4',
  '@radix-ui/react-toast': '^1.1.5',
  '@radix-ui/react-tooltip': '^1.0.7',
  '@radix-ui/react-popover': '^1.0.7',
  '@radix-ui/react-tabs': '^1.0.4',
  'sonner': '^1.3.0',
  'react-day-picker': '^8.10.0',
  'jspdf': '^2.5.1',
  'html2canvas': '^1.4.1',
  'nanoid': '^5.0.0',
  'uuid': '^9.0.0',
  // Next.js specific
  'next-themes': '^0.2.1',
  // Carousels and UI components
  'embla-carousel-react': '^8.0.0',
  'embla-carousel-autoplay': '^8.0.0',
  'react-resizable-panels': '^2.0.0',
  'vaul': '^0.9.0',
  'react-textarea-autosize': '^8.5.0',
  'input-otp': '^1.2.0',
  // Form libraries
  'react-select': '^5.8.0',
  'react-phone-number-input': '^3.3.0',
  'libphonenumber-js': '^1.10.0',
  // Tables
  '@tanstack/react-table': '^8.11.0',
  // Utilities
  'react-use': '^17.5.0',
  'usehooks-ts': '^2.15.0',
  'immer': '^10.0.0',
  'react-error-boundary': '^4.0.0',
  // Icons
  '@heroicons/react': '^2.1.0',
  // Animation
  'gsap': '^3.12.0',
  'react-intersection-observer': '^9.5.0',
  // Headless UI
  '@headlessui/react': '^1.7.0',
  // QR Codes
  'qrcode.react': '^3.1.0',
  'qrcode': '^1.5.0',
  'react-qr-code': '^2.0.0',
  // T3 Env
  '@t3-oss/env-nextjs': '^0.9.0',
};

/**
 * Validate if a package exists on npm registry
 * This prevents WebContainer from trying to install non-existent packages
 * NEVER throws errors - returns false on any failure
 */
async function validateNpmPackageExists(packageName: string): Promise<boolean> {
  try {
    // Check whitelist first (instant validation)
    if (WEBCONTAINER_SAFE_PACKAGES.has(packageName)) {
      return true;
    }

    // Check cache
    if (npmPackageCache.has(packageName)) {
      return npmPackageCache.get(packageName)!;
    }

    // Check npm registry
    const response = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(packageName)}`,
      {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      }
    );

    const exists = response.status === 200;
    npmPackageCache.set(packageName, exists);

    if (!exists) {
      console.warn(`⚠️ Package "${packageName}" does not exist on npm registry`);
    }

    return exists;
  } catch (error) {
    // On ANY error (network, timeout, invalid name, etc.), be conservative
    // Assume package doesn't exist to prevent npm install failures
    console.warn(`⚠️ Failed to validate package "${packageName}":`, error instanceof Error ? error.message : 'Unknown error');
    npmPackageCache.set(packageName, false);
    return false;
  }
}

/**
 * Validate all packages in dependencies object
 * Returns only the packages that exist on npm registry
 * NEVER throws errors - always returns a valid object
 */
async function validateAndFilterDependencies(
  dependencies: Record<string, string>
): Promise<Record<string, string>> {
  try {
    const validated: Record<string, string> = {};
    const packageNames = Object.keys(dependencies);

    if (packageNames.length === 0) {
      return validated;
    }

    // Validate all packages in parallel for speed
    const validationResults = await Promise.allSettled(
      packageNames.map(async (name) => ({
        name,
        exists: await validateNpmPackageExists(name),
        version: dependencies[name]
      }))
    );

    // Keep only packages that exist
    for (const result of validationResults) {
      if (result.status === 'fulfilled') {
        const { name, exists, version } = result.value;
        if (exists) {
          validated[name] = version;
        } else {
          console.warn(`⚠️ Removing non-existent package: ${name}@${version}`);
        }
      } else {
        console.warn(`⚠️ Package validation failed:`, result.reason);
      }
    }

    return validated;
  } catch (error) {
    // If validation completely fails, return original dependencies
    // Better to try installing them than to have empty dependencies
    console.error('⚠️ Critical error in package validation, using original dependencies:', error);
    return dependencies;
  }
}

// ============================================================================
// PACKAGE.JSON SANITIZATION
// ============================================================================

/**
 * Check if a package name is valid according to npm rules
 */
function isValidPackageName(name: string): boolean {
  // Scoped packages are allowed: @scope/package
  // Regular packages: package-name
  // Invalid: contains / without @, contains spaces, etc.

  if (name.startsWith('@')) {
    // Scoped package - must be @scope/name format
    return /^@[a-z0-9-~][a-z0-9-._~]*\/[a-z0-9-~][a-z0-9-._~]*$/.test(name);
  }

  // Regular package - no slashes allowed
  if (name.includes('/')) {
    return false;
  }

  // Must be URL-friendly characters only
  return /^[a-z0-9-~][a-z0-9-._~]*$/.test(name);
}

/**
 * Sanitize package.json for WebContainer compatibility
 *
 * Strategy:
 * - Remove packages requiring native binaries
 * - Replace problematic packages with alternatives
 * - Remove invalid package names (like "mql4/mql5-bridge")
 * - Validate packages exist on npm registry (prevents install failures)
 * - Keep the structure lightweight
 * - Ensure Next.js, React, and Tailwind work properly
 */
export async function sanitizePackageJsonForWebContainer(
  packageJsonContent: string,
  requiredPackages?: Set<string>
): Promise<string> {
  try {
    const pkg = JSON.parse(packageJsonContent);

    // Ensure dependencies object exists
    pkg.dependencies = pkg.dependencies || {};
    pkg.devDependencies = pkg.devDependencies || {};

    // Remove incompatible packages from dependencies
    for (const incompatiblePkg of INCOMPATIBLE_PACKAGES) {
      delete pkg.dependencies[incompatiblePkg];
      delete pkg.devDependencies[incompatiblePkg];
    }

    // Remove invalid package names
    const invalidDeps: string[] = [];
    for (const depName of Object.keys(pkg.dependencies)) {
      if (!isValidPackageName(depName)) {
        console.warn(`⚠️ Removing invalid package name from dependencies: ${depName}`);
        invalidDeps.push(depName);
        delete pkg.dependencies[depName];
      }
    }

    const invalidDevDeps: string[] = [];
    for (const depName of Object.keys(pkg.devDependencies)) {
      if (!isValidPackageName(depName)) {
        console.warn(`⚠️ Removing invalid package name from devDependencies: ${depName}`);
        invalidDevDeps.push(depName);
        delete pkg.devDependencies[depName];
      }
    }

    // Apply package replacements
    for (const [oldPkg, newPkg] of Object.entries(PACKAGE_REPLACEMENTS)) {
      if (pkg.dependencies[oldPkg]) {
        pkg.dependencies[newPkg] = pkg.dependencies[oldPkg];
        delete pkg.dependencies[oldPkg];
      }
      if (pkg.devDependencies[oldPkg]) {
        pkg.devDependencies[newPkg] = pkg.devDependencies[oldPkg];
        delete pkg.devDependencies[oldPkg];
      }
    }

    // CRITICAL: Auto-add missing packages detected from code imports
    // This ensures all imported packages are installed, preventing build errors
    if (requiredPackages && requiredPackages.size > 0) {
      console.log(`📦 Scanning ${requiredPackages.size} imported packages...`);

      for (const packageName of requiredPackages) {
        // Skip packages already in dependencies or devDependencies
        if (pkg.dependencies[packageName] || pkg.devDependencies[packageName]) {
          continue;
        }

        // Skip core packages (handled separately below)
        if (['next', 'react', 'react-dom', 'typescript', '@types/node', '@types/react', '@types/react-dom',
             'tailwindcss', 'postcss', 'autoprefixer'].includes(packageName)) {
          continue;
        }

        // Skip incompatible packages
        if (INCOMPATIBLE_PACKAGES.includes(packageName)) {
          console.warn(`⚠️ Skipping incompatible package from imports: ${packageName}`);
          continue;
        }

        // CRITICAL: Only add packages we KNOW exist (in whitelist or have default version)
        // Don't add unknown packages with 'latest' - they might not exist!
        if (WEBCONTAINER_SAFE_PACKAGES.has(packageName)) {
          // Package is in whitelist - safe to add with default version
          const version = PACKAGE_VERSION_DEFAULTS[packageName] || 'latest';
          pkg.dependencies[packageName] = version;
          console.log(`   ✅ Added whitelisted: ${packageName}@${version}`);
        } else if (PACKAGE_VERSION_DEFAULTS[packageName]) {
          // Package has a default version - safe to add
          const version = PACKAGE_VERSION_DEFAULTS[packageName];
          pkg.dependencies[packageName] = version;
          console.log(`   ✅ Added with default: ${packageName}@${version}`);
        } else {
          // Unknown package - skip it to prevent npm install failures
          console.warn(`   ⚠️ Skipping unknown package: ${packageName} (not in whitelist)`);
        }
      }
    }

    // CRITICAL: Validate all packages exist on npm registry
    // This prevents WebContainer npm install from failing on non-existent packages
    console.log('🔍 Validating packages against npm registry...');
    pkg.dependencies = await validateAndFilterDependencies(pkg.dependencies);
    pkg.devDependencies = await validateAndFilterDependencies(pkg.devDependencies);

    // Ensure core Next.js dependencies are present with compatible versions
    const CORE_DEPS = {
      'next': '14.2.5',
      'react': '18.3.1',
      'react-dom': '18.3.1',
    };

    for (const [dep, version] of Object.entries(CORE_DEPS)) {
      if (!pkg.dependencies[dep]) {
        pkg.dependencies[dep] = version;
      }
    }

    // Ensure TypeScript and Tailwind in devDependencies
    const CORE_DEV_DEPS = {
      'typescript': '^5.5.0',
      '@types/node': '^20.14.0',
      '@types/react': '^18.3.0',
      '@types/react-dom': '^18.3.0',
      'tailwindcss': '^3.4.0',
      'postcss': '^8.4.0',
      'autoprefixer': '^10.4.0',
    };

    for (const [dep, version] of Object.entries(CORE_DEV_DEPS)) {
      if (!pkg.devDependencies[dep]) {
        pkg.devDependencies[dep] = version;
      }
    }

    // Ensure scripts exist
    pkg.scripts = pkg.scripts || {};
    if (!pkg.scripts.dev) {
      pkg.scripts.dev = 'next dev';
    }
    if (!pkg.scripts.build) {
      pkg.scripts.build = 'next build';
    }
    if (!pkg.scripts.start) {
      pkg.scripts.start = 'next start';
    }

    // Remove engines constraint that might cause issues
    delete pkg.engines;

    console.log('✅ Package validation complete');
    return JSON.stringify(pkg, null, 2);
  } catch (error) {
    console.error('❌ Failed to sanitize package.json:', error instanceof Error ? error.message : 'Unknown error');
    console.error('   Returning original package.json to prevent complete failure');
    // If JSON parsing or sanitization fails, return original
    // This is safer than crashing the entire preview
    return packageJsonContent;
  }
}

/**
 * Detect if this is a personal tool (localStorage-based, no auth/DB)
 */
function isPersonalTool(files: Array<{ path: string; content: string }>): boolean {
  // Check for indicators of personal tool:
  // 1. Has lib/storage.ts (localStorage helper)
  // 2. No Clerk imports
  // 3. No Supabase imports
  // 4. No middleware.ts with auth

  const hasStorageHelper = files.some(f => f.path === 'lib/storage.ts');
  const hasClerk = files.some(f => f.content.includes('@clerk/nextjs'));
  const hasSupabase = files.some(f => f.content.includes('@supabase/'));

  return hasStorageHelper && !hasClerk && !hasSupabase;
}

/**
 * Sanitize TypeScript/JavaScript file to remove auth-related code for WebContainer
 */
function sanitizeCodeFile(content: string, filePath: string, isPersonal: boolean = false): string {
  let sanitized = content;

  // Debug: Log Supabase files specifically
  if (filePath.includes('supabase')) {
    console.log(`   📝 Sanitizing Supabase file: "${filePath}"`);
  }

  // OPTION 3: Early return for layout files to prevent 'use client' injection
  // Layout files are Server Components and must NOT have 'use client' directive
  // even if they import components that use client-only libraries
  // Use regex to match ANY layout.tsx file regardless of directory depth
  // (?:^|[/\\]) matches either start of string OR a path separator
  if (/(?:^|[/\\])layout\.tsx$/i.test(filePath)) {
    // Only strip ClerkProvider wrapper, don't add 'use client'
    sanitized = sanitized.replace(/import\s+.*from\s+['"]@clerk\/nextjs\/server['"];?\s*/g, '');
    sanitized = sanitized.replace(/import\s+.*from\s+['"]@clerk\/nextjs['"];?\s*/g, '');
    sanitized = sanitized.replace(/import\s+\{[^}]*\}\s+from\s+['"]@clerk\/nextjs\/server['"];?\s*/g, '');
    sanitized = sanitized.replace(/import\s+\{[^}]*\}\s+from\s+['"]@clerk\/nextjs['"];?\s*/g, '');
    sanitized = sanitized.replace(/<ClerkProvider[^>]*>/g, '<>');
    sanitized = sanitized.replace(/<\/ClerkProvider>/g, '</>');

    console.log(`   🛡️  Protected ${filePath} from 'use client' injection (layout files must be Server Components)`);
    return sanitized;
  }

  // CRITICAL: Add 'use client' directive for components that import client-only libraries
  // This prevents "Super expression must either be null or a function" errors
  const clientOnlyLibraries = [
    'recharts',
    'framer-motion',
    'react-hot-toast',
    'react-toastify',
    'sonner',
    'react-datepicker',
    'react-day-picker',
    'embla-carousel-react',
    '@dnd-kit/core',
    'react-beautiful-dnd',
    'react-hook-form',
  ];

  const needsUseClient = clientOnlyLibraries.some(lib =>
    sanitized.includes(`from '${lib}'`) ||
    sanitized.includes(`from "${lib}"`)
  );

  // Add 'use client' to component files that need it
  // Include page.tsx if it imports client libraries (like recharts)
  // OPTION 1: Exclude layout.tsx files (Server Components can't have 'use client')
  // Use regex to match layout files regardless of directory depth
  // (?:^|[/\\]) matches either start of string OR a path separator
  const isLayoutFile = /(?:^|[/\\])layout\.tsx$/i.test(filePath);
  if (needsUseClient &&
      (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) &&
      !isLayoutFile &&
      !sanitized.includes("'use client'") &&
      !sanitized.includes('"use client"')) {

    // Remove async from default export function if it exists
    // Can't have async server functions in client components
    sanitized = sanitized.replace(
      /export\s+default\s+async\s+function/g,
      'export default function'
    );

    // Add 'use client' at the very top, before any imports
    sanitized = `'use client';\n\n${sanitized}`;
    console.log(`   ✅ Added 'use client' to ${filePath} (uses client-only libraries)`);
  }

  // Personal tools are simpler - they don't have auth/DB to remove
  if (isPersonal) {
    // Just ensure localStorage is used safely with window checks
    sanitized = sanitized.replace(
      /(?<![.])(localStorage\.(getItem|setItem|removeItem|clear))/g,
      (match, fullMatch, method) => {
        // If already wrapped in typeof check, don't wrap again
        if (content.includes('typeof window')) {
          return fullMatch;
        }
        return `(typeof window !== 'undefined' ? ${fullMatch} : ${
          method === 'getItem' ? 'null' :
          method === 'setItem' || method === 'removeItem' ? 'undefined' :
          '(()=>{})'
        })`;
      }
    );

    return sanitized;
  }

  // SaaS tools need heavy sanitization
  // Special handling for middleware.ts - replace with pass-through middleware
  if (filePath === 'middleware.ts' || filePath.endsWith('/middleware.ts')) {
    return `// WebContainer-compatible middleware (auth disabled for preview)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Pass through all requests in WebContainer preview mode
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
`;
  }

  // Special handling for Supabase server client - replace with mock (no cookies)
  // Use regex to match ANY path ending with lib/supabase/server.ts (handles all directory structures)
  // (?:^|[/\\]) matches either start of string OR a path separator
  const isSupabaseServer = /(?:^|[/\\])lib[/\\]supabase[/\\]server\.tsx?$/i.test(filePath);
  if (isSupabaseServer) {
    console.log(`   🔄 Replacing Supabase server.ts with WebContainer mock: ${filePath}`);
    return `// WebContainer-compatible Supabase client (mocked for preview)
export async function createClient() {
  // Query builder that supports method chaining
  const createQueryBuilder = () => {
    const builder = {
      select: () => builder,
      insert: () => builder,
      update: () => builder,
      delete: () => builder,
      upsert: () => builder,
      eq: () => builder,
      neq: () => builder,
      gt: () => builder,
      gte: () => builder,
      lt: () => builder,
      lte: () => builder,
      like: () => builder,
      ilike: () => builder,
      is: () => builder,
      in: () => builder,
      contains: () => builder,
      containedBy: () => builder,
      rangeGt: () => builder,
      rangeGte: () => builder,
      rangeLt: () => builder,
      rangeLte: () => builder,
      rangeAdjacent: () => builder,
      overlaps: () => builder,
      textSearch: () => builder,
      match: () => builder,
      not: () => builder,
      or: () => builder,
      filter: () => builder,
      order: () => builder,
      limit: () => builder,
      range: () => builder,
      abortSignal: () => builder,
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (resolve) => resolve({ data: [], error: null }),
      catch: () => Promise.resolve({ data: [], error: null }),
    };
    return builder;
  };

  // Mock Supabase client for WebContainer preview
  return {
    from: (table: string) => createQueryBuilder(),
    auth: {
      getUser: () => Promise.resolve({
        data: { user: { id: 'demo-user', email: 'demo@example.com' } },
        error: null
      }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signIn: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      signUp: () => Promise.resolve({ data: null, error: null }),
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        download: () => Promise.resolve({ data: null, error: null }),
        remove: () => Promise.resolve({ data: null, error: null }),
        list: () => Promise.resolve({ data: [], error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
    rpc: () => Promise.resolve({ data: null, error: null }),
  } as any;
}
`;
  }

  // Special handling for Supabase browser client - replace with mock
  // Use regex to match ANY path ending with lib/supabase/client.ts (handles all directory structures)
  // (?:^|[/\\]) matches either start of string OR a path separator
  const isSupabaseClient = /(?:^|[/\\])lib[/\\]supabase[/\\]client\.tsx?$/i.test(filePath);
  if (isSupabaseClient) {
    console.log(`   🔄 Replacing Supabase client.ts with WebContainer mock: ${filePath}`);
    return `// WebContainer-compatible Supabase client (mocked for preview)
export function createClient() {
  // Query builder that supports method chaining
  const createQueryBuilder = () => {
    const builder = {
      select: () => builder,
      insert: () => builder,
      update: () => builder,
      delete: () => builder,
      upsert: () => builder,
      eq: () => builder,
      neq: () => builder,
      gt: () => builder,
      gte: () => builder,
      lt: () => builder,
      lte: () => builder,
      like: () => builder,
      ilike: () => builder,
      is: () => builder,
      in: () => builder,
      contains: () => builder,
      containedBy: () => builder,
      rangeGt: () => builder,
      rangeGte: () => builder,
      rangeLt: () => builder,
      rangeLte: () => builder,
      rangeAdjacent: () => builder,
      overlaps: () => builder,
      textSearch: () => builder,
      match: () => builder,
      not: () => builder,
      or: () => builder,
      filter: () => builder,
      order: () => builder,
      limit: () => builder,
      range: () => builder,
      abortSignal: () => builder,
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (resolve) => resolve({ data: [], error: null }),
      catch: () => Promise.resolve({ data: [], error: null }),
    };
    return builder;
  };

  // Mock Supabase client for WebContainer preview
  return {
    from: (table: string) => createQueryBuilder(),
    auth: {
      getUser: () => Promise.resolve({
        data: { user: { id: 'demo-user', email: 'demo@example.com' } },
        error: null
      }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signIn: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      signUp: () => Promise.resolve({ data: null, error: null }),
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        download: () => Promise.resolve({ data: null, error: null }),
        remove: () => Promise.resolve({ data: null, error: null }),
        list: () => Promise.resolve({ data: [], error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
    rpc: () => Promise.resolve({ data: null, error: null }),
  } as any;
}
`;
  }

  // Remove Clerk imports and usage
  sanitized = sanitized.replace(/import\s+.*from\s+['"]@clerk\/nextjs\/server['"];?\s*/g, '');
  sanitized = sanitized.replace(/import\s+.*from\s+['"]@clerk\/nextjs['"];?\s*/g, '');
  sanitized = sanitized.replace(/import\s+\{[^}]*\}\s+from\s+['"]@clerk\/nextjs\/server['"];?\s*/g, '');
  sanitized = sanitized.replace(/import\s+\{[^}]*\}\s+from\s+['"]@clerk\/nextjs['"];?\s*/g, '');

  // Note: ClerkProvider removal for layout files is now handled in early return (line 757)
  // This prevents code duplication and ensures layout files are properly protected

  // Replace auth() and currentUser() server calls with mock values
  // CRITICAL: Must provide mock values, not remove entirely, or userId/user will be undefined

  // Handle: const { userId } = await auth();
  sanitized = sanitized.replace(
    /const\s+\{\s*userId\s*\}\s*=\s*await\s+auth\(\);?/g,
    'const { userId } = { userId: "demo-user" };'
  );

  // Handle: const { userId, sessionId } = await auth();
  // Handle: const { userId, ...rest } = await auth();
  sanitized = sanitized.replace(
    /const\s+\{\s*([^}]*userId[^}]*)\}\s*=\s*await\s+auth\(\);?/g,
    'const { $1 } = { userId: "demo-user", sessionId: "demo-session", orgId: null, sessionClaims: {} };'
  );

  // Handle: const user = await currentUser();
  sanitized = sanitized.replace(
    /const\s+user\s*=\s*await\s+currentUser\(\);?/g,
    'const user = { id: "demo-user", firstName: "Demo", lastName: "User", emailAddresses: [{ emailAddress: "demo@example.com" }] };'
  );

  // Remove Clerk hook calls and replace with mock values
  // useAuth() -> mock authenticated state
  sanitized = sanitized.replace(
    /const\s+\{\s*([^}]+)\}\s*=\s*useAuth\(\);?/g,
    'const { $1 } = { isSignedIn: true, isLoaded: true, userId: "demo-user" };'
  );

  // useUser() -> mock user object
  sanitized = sanitized.replace(
    /const\s+\{\s*([^}]+)\}\s*=\s*useUser\(\);?/g,
    'const { $1 } = { user: { id: "demo-user", fullName: "Demo User", emailAddress: "demo@example.com" }, isLoaded: true };'
  );

  // useClerk() -> mock clerk object
  sanitized = sanitized.replace(
    /const\s+\{\s*([^}]+)\}\s*=\s*useClerk\(\);?/g,
    'const { $1 } = { signOut: async () => {}, openSignIn: () => {} };'
  );

  // CRITICAL: Remove Clerk JSX components (prevents "X is not defined" errors)
  // Replace with mock components or remove entirely
  const clerkComponents = [
    'UserButton',
    'SignInButton',
    'SignUpButton',
    'SignOutButton',
    'SignedIn',
    'SignedOut',
    'RedirectToSignIn',
    'RedirectToSignUp',
    'ClerkLoaded',
    'ClerkLoading'
  ];

  for (const component of clerkComponents) {
    // Self-closing tags: <UserButton ... />
    sanitized = sanitized.replace(
      new RegExp(`<${component}[^>]*\\/>`, 'g'),
      component === 'UserButton'
        ? '<div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">Demo</div>'
        : ''
    );

    // Opening and closing tags: <SignedIn>...</SignedIn>
    // For SignedIn, keep the children (user is signed in in preview)
    // For SignedOut, remove everything (user is signed in in preview)
    if (component === 'SignedIn' || component === 'ClerkLoaded') {
      // Keep children, remove wrapper
      sanitized = sanitized.replace(
        new RegExp(`<${component}[^>]*>`, 'g'),
        '<>'
      );
      sanitized = sanitized.replace(
        new RegExp(`<\\/${component}>`, 'g'),
        '</>'
      );
    } else if (component === 'SignedOut' || component === 'ClerkLoading') {
      // Remove entire block including children
      sanitized = sanitized.replace(
        new RegExp(`<${component}[^>]*>[\\s\\S]*?<\\/${component}>`, 'g'),
        ''
      );
    } else {
      // Other components: remove opening/closing tags
      sanitized = sanitized.replace(
        new RegExp(`<${component}[^>]*>`, 'g'),
        ''
      );
      sanitized = sanitized.replace(
        new RegExp(`<\\/${component}>`, 'g'),
        ''
      );
    }
  }

  // Remove Supabase imports
  sanitized = sanitized.replace(/import\s+.*from\s+['"]@supabase\/[^'"]+['"];?\s*/g, '');

  // Remove Stripe imports
  sanitized = sanitized.replace(/import\s+.*from\s+['"]stripe['"];?\s*/g, '');

  // Fix useState calls that should have array defaults
  // Pattern: const [varName, setVarName] = useState<Type?>(); where varName suggests it should be an array
  // Handles: useState(), useState<T>(), useState<T[]>(), React.useState(), etc.
  sanitized = sanitized.replace(
    /const\s+\[(\w*(?:s|List|Items|Data|Accounts|Users|Products|Orders|Trades))\s*,\s*(\w+)\]\s*=\s*(?:React\.)?useState(?:<[^>]+>)?\(\s*\);?/gi,
    (match, varName, setterName) => `const [${varName}, ${setterName}] = useState([]);`
  );

  // Also fix useState with null/undefined that should be arrays
  sanitized = sanitized.replace(
    /const\s+\[(\w*(?:s|List|Items|Data|Accounts|Users|Products|Orders|Trades))\s*,\s*(\w+)\]\s*=\s*(?:React\.)?useState(?:<[^>]+>)?\((?:null|undefined)\);?/gi,
    (match, varName, setterName) => `const [${varName}, ${setterName}] = useState([]);`
  );

  // CRITICAL: Add defensive array operations wrappers
  // This ensures .filter(), .map(), etc. never crash even if state isn't an array
  // Pattern: variableName.filter(...) where variableName looks like an array
  // IMPORTANT: Uses negative lookbehind (?<![.\w]) to avoid matching property access like state.projects
  // The pattern (?<![.\w]) ensures we don't match if preceded by a dot OR word character
  sanitized = sanitized.replace(
    /(?<![.\w])(\w*(?:s|List|Items|Data|Accounts|Users|Products|Orders|Trades|Results))\.filter\(/gi,
    (match, varName) => `(Array.isArray(${varName}) ? ${varName} : []).filter(`
  );

  sanitized = sanitized.replace(
    /(?<![.\w])(\w*(?:s|List|Items|Data|Accounts|Users|Products|Orders|Trades|Results))\.map\(/gi,
    (match, varName) => `(Array.isArray(${varName}) ? ${varName} : []).map(`
  );

  sanitized = sanitized.replace(
    /(?<![.\w])(\w*(?:s|List|Items|Data|Accounts|Users|Products|Orders|Trades|Results))\.find\(/gi,
    (match, varName) => `(Array.isArray(${varName}) ? ${varName} : []).find(`
  );

  sanitized = sanitized.replace(
    /(?<![.\w])(\w*(?:s|List|Items|Data|Accounts|Users|Products|Orders|Trades|Results))\.some\(/gi,
    (match, varName) => `(Array.isArray(${varName}) ? ${varName} : []).some(`
  );

  sanitized = sanitized.replace(
    /(?<![.\w])(\w*(?:s|List|Items|Data|Accounts|Users|Products|Orders|Trades|Results))\.every\(/gi,
    (match, varName) => `(Array.isArray(${varName}) ? ${varName} : []).every(`
  );

  sanitized = sanitized.replace(
    /(?<![.\w])(\w*(?:s|List|Items|Data|Accounts|Users|Products|Orders|Trades|Results))\.reduce\(/gi,
    (match, varName) => `(Array.isArray(${varName}) ? ${varName} : []).reduce(`
  );

  // Fix .length access on potential arrays
  sanitized = sanitized.replace(
    /(?<![.\w])(\w*(?:s|List|Items|Data|Accounts|Users|Products|Orders|Trades|Results))\.length(?!\s*[><=!])/gi,
    (match, varName) => `(Array.isArray(${varName}) ? ${varName}.length : 0)`
  );

  // CRITICAL: Fix Radix UI Select.Item with empty value prop
  // Radix UI validates that Select.Item value cannot be an empty string
  // Common AI mistake: <Select.Item value="">All</Select.Item>
  // Fix: Replace empty string with "all" or based on the text content
  sanitized = sanitized.replace(
    /<(Select\.Item|SelectItem)(\s+[^>]*?)value=""/gi,
    (match, componentName, attrs) => {
      // Use "all" as default value for empty strings
      return `<${componentName}${attrs}value="all"`;
    }
  );

  // Also fix Select.Item with value='' (single quotes)
  sanitized = sanitized.replace(
    /<(Select\.Item|SelectItem)(\s+[^>]*?)value=''/gi,
    (match, componentName, attrs) => {
      return `<${componentName}${attrs}value="all"`;
    }
  );

  // Mock API routes to return safe defaults (prevents crashes from DB errors)
  if (filePath.startsWith('app/api/') && (filePath.endsWith('route.ts') || filePath.endsWith('route.js'))) {
    // Wrap API route exports to catch errors and return safe defaults
    sanitized = `// WebContainer-safe API route wrapper
const safeApiHandler = (handler: Function) => async (req: Request, context?: any) => {
  try {
    return await handler(req, context);
  } catch (error) {
    console.warn('[WebContainer] API route error (returning safe default):', error);
    // Return empty array for list endpoints, empty object for single items
    const url = new URL(req.url);
    const isList = !url.pathname.match(/\\/[^/]+\\/[^/]+$/); // No ID in path = list
    return Response.json(isList ? [] : {}, { status: 200 });
  }
};

${sanitized}

// Wrap all exported handlers
if (typeof GET !== 'undefined') { const _GET = GET; GET = safeApiHandler(_GET); }
if (typeof POST !== 'undefined') { const _POST = POST; POST = safeApiHandler(_POST); }
if (typeof PUT !== 'undefined') { const _PUT = PUT; PUT = safeApiHandler(_PUT); }
if (typeof PATCH !== 'undefined') { const _PATCH = PATCH; PATCH = safeApiHandler(_PATCH); }
if (typeof DELETE !== 'undefined') { const _DELETE = DELETE; DELETE = safeApiHandler(_DELETE); }
`;
  }

  // Fix Card component file itself - add missing subcomponent exports
  // Use regex to match card component file regardless of directory structure
  // (?:^|[/\\]) matches either start of string OR a path separator
  if (/(?:^|[/\\])components[/\\]ui[/\\]card\.(tsx?|jsx?)$/i.test(filePath)) {
    // Check what's currently exported
    const hasCardHeader = /export.*CardHeader/.test(sanitized);
    const hasCardTitle = /export.*CardTitle/.test(sanitized);
    const hasCardDescription = /export.*CardDescription/.test(sanitized);
    const hasCardContent = /export.*CardContent/.test(sanitized);
    const hasCardFooter = /export.*CardFooter/.test(sanitized);

    const missingExports: string[] = [];
    if (!hasCardHeader) missingExports.push('CardHeader');
    if (!hasCardTitle) missingExports.push('CardTitle');
    if (!hasCardDescription) missingExports.push('CardDescription');
    if (!hasCardContent) missingExports.push('CardContent');
    if (!hasCardFooter) missingExports.push('CardFooter');

    if (missingExports.length > 0) {
      // Add missing subcomponent exports to the Card file
      const fallbackComponents = `
// Fallback Card subcomponents for WebContainer compatibility
${!hasCardHeader ? `export const CardHeader = ({ children, className = "", ...props }: any) => (
  <div className={\`p-6 \${className}\`} {...props}>{children}</div>
);` : ''}

${!hasCardTitle ? `export const CardTitle = ({ children, className = "", ...props }: any) => (
  <h3 className={\`text-2xl font-semibold leading-none tracking-tight \${className}\`} {...props}>{children}</h3>
);` : ''}

${!hasCardDescription ? `export const CardDescription = ({ children, className = "", ...props }: any) => (
  <p className={\`text-sm text-muted-foreground \${className}\`} {...props}>{children}</p>
);` : ''}

${!hasCardContent ? `export const CardContent = ({ children, className = "", ...props }: any) => (
  <div className={\`p-6 pt-0 \${className}\`} {...props}>{children}</div>
);` : ''}

${!hasCardFooter ? `export const CardFooter = ({ children, className = "", ...props }: any) => (
  <div className={\`flex items-center p-6 pt-0 \${className}\`} {...props}>{children}</div>
);` : ''}
`;

      // Append to end of file
      sanitized = sanitized.trimEnd() + '\n' + fallbackComponents;
    }
  }

  return sanitized;
}

/**
 * Check if a file should be modified for WebContainer
 */
export function shouldModifyForWebContainer(filePath: string): boolean {
  return filePath === 'package.json' ||
         filePath.endsWith('.tsx') ||
         filePath.endsWith('.ts') ||
         filePath.endsWith('.jsx') ||
         filePath.endsWith('.js');
}

/**
 * Detect missing component imports and create stub files
 */
function detectMissingComponents(
  files: Array<{ path: string; content: string }>
): Array<{ path: string; content: string }> {
  const filePathsSet = new Set(files.map(f => f.path));
  const missingComponents: Map<string, string> = new Map();

  // Pattern to match component imports like: import { Foo } from '@/components/bar'
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]@\/components\/([^'"]+)['"]/g;

  for (const file of files) {
    if (!file.path.endsWith('.tsx') && !file.path.endsWith('.jsx')) continue;

    let match;
    while ((match = importRegex.exec(file.content)) !== null) {
      const componentNames = match[1].split(',').map(n => n.trim());
      const componentPath = match[2]; // e.g., "header" or "ui/card"

      // Check if this component file exists
      const possiblePaths = [
        `components/${componentPath}.tsx`,
        `components/${componentPath}.ts`,
        `components/${componentPath}.jsx`,
        `components/${componentPath}.js`,
      ];

      const exists = possiblePaths.some(p => filePathsSet.has(p));

      if (!exists && !missingComponents.has(componentPath)) {
        // Create a stub component file
        const stubPath = `components/${componentPath}.tsx`;
        const componentName = componentNames[0]; // Use first imported name as main component

        const stubContent = `// Stub component created by WebContainer sanitization
// Original file was missing from generation

export const ${componentName} = ({ children, ...props }: any) => {
  return (
    <div className="p-4 border border-dashed border-gray-300 rounded" {...props}>
      <p className="text-sm text-gray-500">Component: ${componentName}</p>
      <p className="text-xs text-gray-400">This is a placeholder. Generate the full component for production.</p>
      {children}
    </div>
  );
};

${componentNames.slice(1).map(name => `
export const ${name} = ({ children, ...props }: any) => {
  return <div {...props}>{children}</div>;
};`).join('\n')}

export default ${componentName};
`;

        missingComponents.set(stubPath, stubContent);
      }
    }
  }

  return Array.from(missingComponents.entries()).map(([path, content]) => ({
    path,
    content,
  }));
}

/**
 * Sanitize all files for WebContainer compatibility
 * NEVER throws errors - always returns sanitized files
 */
export async function sanitizeFilesForWebContainer(
  files: Array<{ path: string; content: string }>
): Promise<Array<{ path: string; content: string }>> {
  try {
    // Detect if this is a personal tool (lighter sanitization needed)
    const isPersonal = isPersonalTool(files);

    console.log(`\n🔍 WebContainer Sanitization:`);
    console.log(`   Tool Type: ${isPersonal ? 'PERSONAL (localStorage)' : 'SAAS (auth/DB)'}`);
    console.log(`   Files: ${files.length}`);

    // First, detect and create stub files for missing components (only for SaaS)
    const stubComponents = isPersonal ? [] : detectMissingComponents(files);
    if (stubComponents.length > 0) {
      console.log(`   Created ${stubComponents.length} stub components`);
    }

    // Combine original files with stub components
    const allFiles = [...files, ...stubComponents];

    // CRITICAL: Scan all files for imported packages
    // This ensures packages used in code are added to package.json
    console.log('🔎 Scanning files for package imports...');
    const requiredPackages = collectRequiredPackages(allFiles);
    console.log(`   Found ${requiredPackages.size} imported packages`);

    // Then sanitize all files
    const sanitizedFiles = await Promise.allSettled(
      allFiles.map(async (file) => {
        if (file.path === 'package.json') {
          return {
            ...file,
            content: await sanitizePackageJsonForWebContainer(file.content, requiredPackages),
          };
        }

        // Sanitize TypeScript/JavaScript files
        if (file.path.endsWith('.tsx') || file.path.endsWith('.ts') ||
            file.path.endsWith('.jsx') || file.path.endsWith('.js')) {
          return {
            ...file,
            content: sanitizeCodeFile(file.content, file.path, isPersonal),
          };
        }

        return file;
      })
    );

    // Extract successfully sanitized files, keep original on failure
    const result = sanitizedFiles.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.warn(`⚠️ Failed to sanitize file ${allFiles[index].path}, using original:`, result.reason);
        return allFiles[index];
      }
    });

    console.log('✅ WebContainer sanitization complete');
    return result;
  } catch (error) {
    // If sanitization completely fails, return original files
    // Better to try running them than to have no files at all
    console.error('❌ Critical error in WebContainer sanitization, using original files:', error instanceof Error ? error.message : 'Unknown error');
    return files;
  }
}

// ============================================================================
// WEBCONTAINER FILE COMPATIBILITY
// ============================================================================

/**
 * Check if generated files are WebContainer-compatible
 */
export function validateWebContainerCompatibility(
  files: Array<{ path: string; content: string }>
): {
  compatible: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check package.json
  const packageJson = files.find(f => f.path === 'package.json');
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson.content);
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      // Check for incompatible packages
      for (const incompatiblePkg of INCOMPATIBLE_PACKAGES) {
        if (allDeps[incompatiblePkg]) {
          warnings.push(`Package "${incompatiblePkg}" may not work in WebContainer (requires native binaries)`);
        }
      }

      // Check for missing core dependencies
      if (!allDeps['next']) {
        errors.push('Missing required dependency: next');
      }
      if (!allDeps['react']) {
        errors.push('Missing required dependency: react');
      }
      if (!allDeps['react-dom']) {
        errors.push('Missing required dependency: react-dom');
      }
    } catch (e) {
      errors.push('Invalid package.json format');
    }
  } else {
    errors.push('Missing package.json');
  }

  // Check for required files
  const requiredFiles = ['app/layout.tsx', 'app/page.tsx'];
  for (const required of requiredFiles) {
    if (!files.find(f => f.path === required)) {
      warnings.push(`Missing recommended file: ${required}`);
    }
  }

  return {
    compatible: errors.length === 0,
    warnings,
    errors,
  };
}
