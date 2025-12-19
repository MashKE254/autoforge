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
 * Sanitize TypeScript/JavaScript file to remove auth-related code for WebContainer
 */
function sanitizeCodeFile(content: string, filePath: string): string {
  let sanitized = content;

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

  // Remove Clerk imports and usage
  sanitized = sanitized.replace(/import\s+.*from\s+['"]@clerk\/nextjs\/server['"];?\s*/g, '');
  sanitized = sanitized.replace(/import\s+.*from\s+['"]@clerk\/nextjs['"];?\s*/g, '');
  sanitized = sanitized.replace(/import\s+\{[^}]*\}\s+from\s+['"]@clerk\/nextjs\/server['"];?\s*/g, '');
  sanitized = sanitized.replace(/import\s+\{[^}]*\}\s+from\s+['"]@clerk\/nextjs['"];?\s*/g, '');

  // Remove ClerkProvider wrapping in layout files
  if (filePath.includes('layout.tsx')) {
    // Replace ClerkProvider with Fragment
    sanitized = sanitized.replace(/<ClerkProvider[^>]*>/g, '<>');
    sanitized = sanitized.replace(/<\/ClerkProvider>/g, '</>');
  }

  // Remove auth() and currentUser() server calls
  sanitized = sanitized.replace(/const\s+\{\s*userId\s*\}\s*=\s*await\s+auth\(\);?\s*/g, '');
  sanitized = sanitized.replace(/const\s+user\s*=\s*await\s+currentUser\(\);?\s*/g, '');

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

  // Remove Supabase imports
  sanitized = sanitized.replace(/import\s+.*from\s+['"]@supabase\/[^'"]+['"];?\s*/g, '');

  // Remove Stripe imports
  sanitized = sanitized.replace(/import\s+.*from\s+['"]stripe['"];?\s*/g, '');

  // Fix useState calls that should have array defaults
  // Pattern: const [varName, setVarName] = useState(); where varName suggests it should be an array
  sanitized = sanitized.replace(
    /const\s+\[(\w*(?:s|List|Items|Data|Accounts|Users|Products|Orders|Trades))\s*,\s*(\w+)\]\s*=\s*useState\(\s*\);?/gi,
    (match, varName, setterName) => `const [${varName}, ${setterName}] = useState([]);`
  );

  // Also fix useState with null/undefined that should be arrays
  sanitized = sanitized.replace(
    /const\s+\[(\w*(?:s|List|Items|Data|Accounts|Users|Products|Orders|Trades))\s*,\s*(\w+)\]\s*=\s*useState\((?:null|undefined)\);?/gi,
    (match, varName, setterName) => `const [${varName}, ${setterName}] = useState([]);`
  );

  // Fix Card component file itself - add missing subcomponent exports
  if (filePath.includes('components/ui/card.')) {
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
 */
export function sanitizeFilesForWebContainer(
  files: Array<{ path: string; content: string }>
): Array<{ path: string; content: string }> {
  // First, detect and create stub files for missing components
  const stubComponents = detectMissingComponents(files);

  // Combine original files with stub components
  const allFiles = [...files, ...stubComponents];

  // Then sanitize all files
  return allFiles.map(file => {
    if (file.path === 'package.json') {
      return {
        ...file,
        content: sanitizePackageJsonForWebContainer(file.content),
      };
    }

    // Sanitize TypeScript/JavaScript files
    if (file.path.endsWith('.tsx') || file.path.endsWith('.ts') ||
        file.path.endsWith('.jsx') || file.path.endsWith('.js')) {
      return {
        ...file,
        content: sanitizeCodeFile(file.content, file.path),
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
