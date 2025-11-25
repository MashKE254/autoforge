/**
 * Project Templates - WebContainer Stable Version
 * 
 * File: src/lib/templates/index.ts
 * 
 * STABLE: Uses Tailwind CSS v3 for maximum WebContainer compatibility
 * 
 * Tailwind v4 has installation issues in WebContainer environments.
 * This version uses v3 which is proven to work reliably.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TemplateFile {
  path: string;
  content: string;
}

export interface ProjectTemplate {
  name: string;
  description: string;
  framework: 'nextjs' | 'vite' | 'remix';
  files: TemplateFile[];
  installCommand: string;
  devCommand: string;
  buildCommand: string;
}

// ============================================================================
// NEXT.JS TEMPLATE (Tailwind v3 - WebContainer Stable)
// ============================================================================

/**
 * Get a complete Next.js 14 template with TypeScript and Tailwind CSS v3
 * All files needed for `npm run dev` to work
 */
export function getNextJsTemplate(projectName: string = 'my-app'): ProjectTemplate {
  // Sanitize project name - handle multi-line prompts and special characters
  const safeName = projectName
    .split('\n')[0]  // Take only first line
    .slice(0, 50)    // Limit length
    .toLowerCase()
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'my-app';
  
  // Create a safe title (single line, escaped)
  const safeTitle = projectName
    .split('\n')[0]  // Take only first line
    .slice(0, 60)    // Limit length
    .replace(/'/g, "\\'")  // Escape single quotes
    .trim() || 'My App';
  
  return {
    name: 'nextjs',
    description: 'Next.js 14 with TypeScript and Tailwind CSS v3',
    framework: 'nextjs',
    installCommand: 'npm install',
    devCommand: 'npm run dev -- --port 3000 --hostname 0.0.0.0',
    buildCommand: 'npm run build',
    
    files: [
      // ========================================
      // package.json - REQUIRED (Tailwind v3)
      // ========================================
      {
        path: 'package.json',
        content: JSON.stringify({
          name: safeName,
          version: '0.1.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            lint: 'next lint'
          },
          dependencies: {
            'next': '14.2.5',
            'react': '18.3.1',
            'react-dom': '18.3.1'
          },
          devDependencies: {
            '@types/node': '20.14.0',
            '@types/react': '18.3.3',
            '@types/react-dom': '18.3.0',
            'typescript': '5.5.2',
            'tailwindcss': '3.4.4',
            'autoprefixer': '10.4.19',
            'postcss': '8.4.38'
          }
        }, null, 2)
      },
      
      // ========================================
      // tsconfig.json - REQUIRED for TypeScript
      // ========================================
      {
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: 'ES2017',
            lib: ['dom', 'dom.iterable', 'esnext'],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: 'esnext',
            moduleResolution: 'bundler',
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: 'preserve',
            incremental: true,
            plugins: [{ name: 'next' }],
            paths: {
              '@/*': ['./*']
            }
          },
          include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
          exclude: ['node_modules']
        }, null, 2)
      },
      
      // ========================================
      // next.config.mjs - REQUIRED
      // ========================================
      {
        path: 'next.config.mjs',
        content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`
      },
      
      // ========================================
      // tailwind.config.js - REQUIRED for Tailwind v3
      // ========================================
      {
        path: 'tailwind.config.js',
        content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
    },
  },
  plugins: [],
};
`
      },
      
      // ========================================
      // postcss.config.js - REQUIRED for Tailwind v3
      // ========================================
      {
        path: 'postcss.config.js',
        content: `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`
      },
      
      // ========================================
      // app/globals.css - REQUIRED (Tailwind v3 syntax)
      // ========================================
      {
        path: 'app/globals.css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
    'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

a {
  color: inherit;
  text-decoration: none;
}
`
      },
      
      // ========================================
      // app/layout.tsx - REQUIRED for App Router
      // ========================================
      {
        path: 'app/layout.tsx',
        content: `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '${safeTitle}',
  description: 'Generated by BuildNow',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`
      },
      
      // ========================================
      // app/page.tsx - Default home page
      // ========================================
      {
        path: 'app/page.tsx',
        content: `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          ${safeTitle}
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Your application is running successfully!
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Next.js Docs →
          </a>
          <a
            href="https://tailwindcss.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Tailwind Docs →
          </a>
        </div>
        <p className="text-sm text-gray-500 mt-12">
          Built with BuildNow ⚡
        </p>
      </div>
    </main>
  );
}
`
      },
      
      // ========================================
      // .gitignore
      // ========================================
      {
        path: '.gitignore',
        content: `# Dependencies
node_modules
.pnp
.pnp.js

# Testing
coverage

# Next.js
.next
out
build
dist

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env
.env*.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts
`
      }
    ]
  };
}

// ============================================================================
// VITE + REACT TEMPLATE
// ============================================================================

export function getViteReactTemplate(projectName: string = 'my-app'): ProjectTemplate {
  // Sanitize project name - handle multi-line prompts
  const safeName = projectName
    .split('\n')[0]  // Take only first line
    .slice(0, 50)    // Limit length
    .toLowerCase()
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'my-app';
  
  // Create a safe title (single line, escaped)
  const safeTitle = projectName
    .split('\n')[0]  // Take only first line
    .slice(0, 60)    // Limit length
    .replace(/'/g, "\\'")  // Escape single quotes
    .trim() || 'My App';
  
  return {
    name: 'vite-react',
    description: 'Vite + React with TypeScript',
    framework: 'vite',
    installCommand: 'npm install',
    devCommand: 'npm run dev -- --host 0.0.0.0 --port 3000',
    buildCommand: 'npm run build',
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: safeName,
          private: true,
          version: '0.0.0',
          type: 'module',
          scripts: {
            dev: 'vite',
            build: 'tsc && vite build',
            preview: 'vite preview'
          },
          dependencies: {
            'react': '18.2.0',
            'react-dom': '18.2.0'
          },
          devDependencies: {
            '@types/react': '18.2.0',
            '@types/react-dom': '18.2.0',
            '@vitejs/plugin-react': '4.0.0',
            'typescript': '5.0.0',
            'vite': '5.0.0'
          }
        }, null, 2)
      },
      {
        path: 'vite.config.ts',
        content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            useDefineForClassFields: true,
            lib: ['ES2020', 'DOM', 'DOM.Iterable'],
            module: 'ESNext',
            skipLibCheck: true,
            moduleResolution: 'bundler',
            allowImportingTsExtensions: true,
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            jsx: 'react-jsx',
            strict: true
          },
          include: ['src']
        }, null, 2)
      },
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`
      },
      {
        path: 'src/main.tsx',
        content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`
      },
      {
        path: 'src/App.tsx',
        content: `function App() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        ${safeTitle}
      </h1>
      <p style={{ color: '#666' }}>
        Your Vite + React app is running!
      </p>
    </div>
  )
}

export default App
`
      },
      {
        path: 'src/index.css',
        content: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
}
`
      }
    ]
  };
}

// ============================================================================
// TEMPLATE UTILITIES
// ============================================================================

/**
 * Merge generated files with a template
 * Template files take priority to ensure stability
 * 
 * @param template - The base template to use
 * @param generatedFiles - Files from AI generation
 * @returns Merged file list with no duplicates
 */
export function mergeWithTemplate(
  template: ProjectTemplate,
  generatedFiles: Array<{ path: string; content: string }>
): TemplateFile[] {
  const fileMap = new Map<string, string>();
  
  // 1. Add generated files first
  generatedFiles.forEach(f => {
    let content = f.content;
    
    // Force Tailwind v3 syntax for CSS files
    if (f.path.endsWith('.css')) {
      content = enforceTailwindV3Syntax(content);
    }
    
    fileMap.set(f.path, content);
  });
  
  // 2. Override with template files for critical config files
  // This ensures config files are always correct
  const criticalFiles = [
    'package.json',
    'tsconfig.json',
    'next.config.mjs',
    'tailwind.config.js',
    'postcss.config.js',
    'app/globals.css'
  ];
  
  template.files.forEach(f => {
    if (criticalFiles.includes(f.path)) {
      fileMap.set(f.path, f.content);
    } else if (!fileMap.has(f.path)) {
      // Add template file if not already present
      fileMap.set(f.path, f.content);
    }
  });
  
  // 3. Convert back to array
  return Array.from(fileMap.entries()).map(([path, content]) => ({
    path,
    content
  }));
}

/**
 * Force Tailwind v3 syntax in CSS files
 * Converts any v4 syntax to v3
 */
function enforceTailwindV3Syntax(content: string): string {
  // Remove v4 imports
  let newContent = content
    .replace(/@import\s+["']tailwindcss["'];?\s*/g, '')
    .replace(/@import\s+["']tw-animate-css["'];?\s*/g, '');
  
  // Check if v3 directives already exist
  const hasV3Directives = 
    newContent.includes('@tailwind base') ||
    newContent.includes('@tailwind components') ||
    newContent.includes('@tailwind utilities');
  
  // Add v3 directives at the beginning if not present
  if (!hasV3Directives) {
    newContent = `@tailwind base;
@tailwind components;
@tailwind utilities;

` + newContent.trim();
  }
  
  return newContent;
}

/**
 * Get the appropriate template based on detected framework
 */
export function getTemplateForFramework(
  framework: 'nextjs' | 'vite' | 'auto',
  projectName: string,
  files?: Array<{ path: string; content: string }>
): ProjectTemplate {
  if (framework === 'auto' && files) {
    const hasNextIndicator = files.some(f => 
      f.path.includes('next.config') || 
      f.path === 'app/layout.tsx' ||
      f.path === 'app/page.tsx' ||
      (f.path === 'package.json' && f.content.includes('"next"'))
    );
    
    const hasViteIndicator = files.some(f => 
      f.path.includes('vite.config') ||
      (f.path === 'package.json' && f.content.includes('"vite"'))
    );
    
    if (hasViteIndicator && !hasNextIndicator) {
      return getViteReactTemplate(projectName);
    }
  }
  
  if (framework === 'vite') {
    return getViteReactTemplate(projectName);
  }
  
  return getNextJsTemplate(projectName);
}

/**
 * Validate that all essential files exist
 */
export function validateProjectFiles(
  files: TemplateFile[],
  framework: 'nextjs' | 'vite' = 'nextjs'
): string[] {
  const requiredFiles = framework === 'nextjs' 
    ? [
        'package.json',
        'tsconfig.json',
        'next.config.mjs',
        'tailwind.config.js',
        'postcss.config.js',
        'app/globals.css',
        'app/layout.tsx',
        'app/page.tsx'
      ]
    : [
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'index.html',
        'src/main.tsx',
        'src/App.tsx'
      ];
  
  const existingPaths = new Set(files.map(f => f.path));
  return requiredFiles.filter(f => !existingPaths.has(f));
}

// ============================================================================
// EXPORTS
// ============================================================================

const templatesApi = {
  getNextJsTemplate,
  getViteReactTemplate,
  mergeWithTemplate,
  getTemplateForFramework,
  validateProjectFiles
};

export default templatesApi;