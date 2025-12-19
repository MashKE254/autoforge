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
];

/**
 * Packages that should be replaced with alternatives
 */
const PACKAGE_REPLACEMENTS: Record<string, string> = {
  'bcrypt': 'bcryptjs',
};

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
 * - Keep the structure lightweight
 * - Ensure Next.js, React, and Tailwind work properly
 */
export function sanitizePackageJsonForWebContainer(packageJsonContent: string): string {
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

    return JSON.stringify(pkg, null, 2);
  } catch (error) {
    console.error('Failed to sanitize package.json:', error);
    return packageJsonContent; // Return original if parsing fails
  }
}

/**
 * Check if a file should be modified for WebContainer
 */
export function shouldModifyForWebContainer(filePath: string): boolean {
  return filePath === 'package.json';
}

/**
 * Sanitize all files for WebContainer compatibility
 */
export function sanitizeFilesForWebContainer(
  files: Array<{ path: string; content: string }>
): Array<{ path: string; content: string }> {
  return files.map(file => {
    if (shouldModifyForWebContainer(file.path)) {
      return {
        ...file,
        content: sanitizePackageJsonForWebContainer(file.content),
      };
    }
    return file;
  });
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
