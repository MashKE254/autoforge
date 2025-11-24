/**
 * Project Templates - Bolt.new Style
 * 
 * File: src/lib/templates/index.ts
 * 
 * Templates ensure all essential project files exist before the dev server starts.
 * This solves the "missing files" problem where AI-generated code doesn't include
 * all required config files.
 * 
 * How it works:
 * 1. Start with a complete template (all files needed for Next.js to run)
 * 2. Merge in AI-generated files (they override template files)
 * 3. Result: Complete project that always works
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
// NEXT.JS TEMPLATE
// ============================================================================

/**
 * Get a complete Next.js 14 template with TypeScript and Tailwind CSS
 * All files needed for `npm run dev` to work
 */
export function getNextJsTemplate(projectName: string = 'my-app'): ProjectTemplate {
  // Sanitize project name for package.json
  const safeName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'my-app';
  
  return {
    name: 'nextjs',
    description: 'Next.js 14 with TypeScript and Tailwind CSS',
    framework: 'nextjs',
    installCommand: 'npm install --silent --no-fund --no-audit',
    devCommand: 'npm run dev -- --port 3000 --hostname 0.0.0.0',
    buildCommand: 'npm run build',
    
    files: [
      // ========================================
      // package.json - REQUIRED
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
            'react': '^18.3.1',
            'react-dom': '^18.3.1'
          },
          devDependencies: {
            '@types/node': '^20',
            '@types/react': '^18',
            '@types/react-dom': '^18',
            'typescript': '^5',
            'tailwindcss': '^3.4.0',
            'autoprefixer': '^10.4.0',
            'postcss': '^8.4.0'
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
      // Using .mjs for better WebContainer compatibility
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
      // tailwind.config.ts - REQUIRED for Tailwind
      // ========================================
      {
        path: 'tailwind.config.ts',
        content: `import type { Config } from 'tailwindcss';

const config: Config = {
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

export default config;
`
      },
      
      // ========================================
      // postcss.config.mjs - REQUIRED for Tailwind
      // ========================================
      {
        path: 'postcss.config.mjs',
        content: `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
`
      },
      
      // ========================================
      // app/globals.css - REQUIRED for styles
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
      // This file MUST exist or Next.js won't start
      // ========================================
      {
        path: 'app/layout.tsx',
        content: `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '${projectName}',
  description: 'Generated by AutoForge',
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
          ${projectName}
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
          Built with AutoForge ⚡
        </p>
      </div>
    </main>
  );
}
`
      },
      
      // ========================================
      // .gitignore - Good to have
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
// VITE + REACT TEMPLATE (Optional - for future use)
// ============================================================================

export function getViteReactTemplate(projectName: string = 'my-app'): ProjectTemplate {
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/gi, '-') || 'my-app';
  
  return {
    name: 'vite-react',
    description: 'Vite with React and TypeScript',
    framework: 'vite',
    installCommand: 'npm install --silent --no-fund --no-audit',
    devCommand: 'npm run dev -- --port 3000 --host',
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
            'react': '^18.3.1',
            'react-dom': '^18.3.1'
          },
          devDependencies: {
            '@types/react': '^18.3.0',
            '@types/react-dom': '^18.3.0',
            '@vitejs/plugin-react': '^4.3.0',
            'typescript': '^5.4.0',
            'vite': '^5.4.0'
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
          include: ['src'],
          references: [{ path: './tsconfig.node.json' }]
        }, null, 2)
      },
      {
        path: 'tsconfig.node.json',
        content: JSON.stringify({
          compilerOptions: {
            composite: true,
            skipLibCheck: true,
            module: 'ESNext',
            moduleResolution: 'bundler',
            allowSyntheticDefaultImports: true
          },
          include: ['vite.config.ts']
        }, null, 2)
      },
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
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
        ${projectName}
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
 * Generated files take priority over template files
 * 
 * @param template - The base template to use
 * @param generatedFiles - Files from AI generation
 * @returns Merged file list with no duplicates
 */
export function mergeWithTemplate(
  template: ProjectTemplate,
  generatedFiles: Array<{ path: string; content: string }>
): TemplateFile[] {
  // Create a map for efficient lookup
  const fileMap = new Map<string, string>();
  
  // 1. Add all template files first
  template.files.forEach(f => {
    fileMap.set(f.path, f.content);
  });
  
  // 2. Override with generated files (they take priority)
  generatedFiles.forEach(f => {
    fileMap.set(f.path, f.content);
  });
  
  // 3. Convert back to array
  return Array.from(fileMap.entries()).map(([path, content]) => ({
    path,
    content
  }));
}

/**
 * Get the appropriate template based on detected framework
 */
export function getTemplateForFramework(
  framework: 'nextjs' | 'vite' | 'auto',
  projectName: string,
  files?: Array<{ path: string; content: string }>
): ProjectTemplate {
  // Auto-detect if needed
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
  
  // Default to Next.js
  if (framework === 'vite') {
    return getViteReactTemplate(projectName);
  }
  
  return getNextJsTemplate(projectName);
}

/**
 * Validate that all essential files exist
 * Returns list of missing files
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
        'tailwind.config.ts',
        'postcss.config.mjs',
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