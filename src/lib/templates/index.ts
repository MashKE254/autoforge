/**
 * Project Templates - Bolt.new Style (Fixed)
 * 
 * File: src/lib/templates/index.ts
 * 
 * CRITICAL FIX: This version does NOT include a default app/page.tsx
 * The AI MUST generate app/page.tsx - we never provide a fallback
 * that could overwrite the AI's generated code.
 * 
 * Templates only provide CONFIG files (package.json, tsconfig, etc.)
 * NOT application code (page.tsx, components, etc.)
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
  files: TemplateFile[];
}

// ============================================================================
// NEXT.JS TEMPLATE (CONFIG ONLY - NO app/page.tsx!)
// ============================================================================

export function getNextJsTemplate(projectName: string): ProjectTemplate {
  const safeName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'my-app';

  return {
    name: safeName,
    description: `Next.js config template for ${projectName}`,
    files: [
      // package.json - dependencies only
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
      // tsconfig.json
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
            paths: { '@/*': ['./*'] }
          },
          include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
          exclude: ['node_modules']
        }, null, 2)
      },
      // next.config.mjs
      {
        path: 'next.config.mjs',
        content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`
      },
      // tailwind.config.js
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
    extend: {},
  },
  plugins: [],
};
`
      },
      // postcss.config.js
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
      // app/globals.css
      {
        path: 'app/globals.css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;
`
      },
      // app/layout.tsx - minimal layout (required)
      {
        path: 'app/layout.tsx',
        content: `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '${projectName.slice(0, 50)}',
  description: 'Generated application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`
      }
      // ❌ NO app/page.tsx - AI MUST generate this!
    ]
  };
}

// ============================================================================
// MERGE WITH TEMPLATE (ONLY ADDS MISSING CONFIG FILES)
// ============================================================================

/**
 * Merge AI-generated files with template
 * 
 * CRITICAL: This function ONLY adds files that are MISSING.
 * It NEVER overwrites existing files.
 * 
 * The AI's app/page.tsx is ALWAYS preserved.
 */
export function mergeWithTemplate(
  template: ProjectTemplate,
  generatedFiles: { path: string; content: string }[]
): TemplateFile[] {
  const result: TemplateFile[] = [];
  const existingPaths = new Set(generatedFiles.map(f => f.path));
  
  // First, add ALL generated files (these take priority)
  for (const file of generatedFiles) {
    result.push({
      path: file.path,
      content: file.content
    });
  }
  
  // Then, add template files ONLY if they don't exist
  for (const templateFile of template.files) {
    if (!existingPaths.has(templateFile.path)) {
      console.log(`⚠️ Adding missing file from template: ${templateFile.path}`);
      result.push(templateFile);
    }
  }
  
  // CRITICAL CHECK: app/page.tsx MUST exist (either from AI or error)
  const hasPageTsx = result.some(f => f.path === 'app/page.tsx');
  if (!hasPageTsx) {
    console.error('❌ CRITICAL: No app/page.tsx generated! This should not happen with Bolt-style generation.');
    // DO NOT add a default - let the error be visible
  }
  
  return result;
}

// ============================================================================
// VALIDATE PROJECT FILES
// ============================================================================

/**
 * Check which required files are missing
 */
export function validateProjectFiles(
  files: { path: string; content: string }[]
): string[] {
  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'next.config.mjs',
    'tailwind.config.js',
    'postcss.config.js',
    'app/globals.css',
    'app/layout.tsx',
    'app/page.tsx'  // This is required but NOT provided by template
  ];
  
  const existingPaths = new Set(files.map(f => f.path));
  return requiredFiles.filter(f => !existingPaths.has(f));
}

// ============================================================================
// VITE REACT TEMPLATE (for future use)
// ============================================================================

export function getViteReactTemplate(projectName: string): ProjectTemplate {
  const safeName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .slice(0, 50) || 'my-app';

  return {
    name: safeName,
    description: `Vite React template for ${projectName}`,
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
            '@types/react': '^18.3.3',
            '@types/react-dom': '^18.3.0',
            '@vitejs/plugin-react': '^4.3.1',
            'typescript': '^5.5.2',
            'vite': '^5.3.4'
          }
        }, null, 2)
      },
      {
        path: 'vite.config.ts',
        content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
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
            strict: true,
            noUnusedLocals: true,
            noUnusedParameters: true,
            noFallthroughCasesInSwitch: true
          },
          include: ['src'],
          references: [{ path: './tsconfig.node.json' }]
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
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`
      }
      // ❌ NO src/App.tsx - AI must generate this
    ]
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getTemplateForFramework(
  framework: 'nextjs' | 'vite-react',
  projectName: string
): ProjectTemplate {
  switch (framework) {
    case 'vite-react':
      return getViteReactTemplate(projectName);
    case 'nextjs':
    default:
      return getNextJsTemplate(projectName);
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

const templatesApi = {
  getNextJsTemplate,
  getViteReactTemplate,
  mergeWithTemplate,
  getTemplateForFramework,
  validateProjectFiles
};

export default templatesApi;