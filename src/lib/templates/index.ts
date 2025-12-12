/**
 * Project Templates - Bolt.new Style (Fixed with Fallback)
 * 
 * File: src/lib/templates/index.ts
 * 
 * CRITICAL FIX: This version includes an app/page.tsx fallback
 * when AI fails to generate one. This prevents 404 errors.
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
// NEXT.JS TEMPLATE (CONFIG FILES)
// ============================================================================

export function getNextJsTemplate(projectName: string = 'generated-app'): ProjectTemplate {
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 50);
  
  return {
    name: safeName,
    description: 'Next.js 14 with TypeScript and Tailwind CSS',
    files: [
      // package.json
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
            next: '14.2.5',
            react: '18.3.1',
            'react-dom': '18.3.1',
            'lucide-react': '^0.400.0',
            clsx: '^2.1.1',
            'date-fns': '^3.6.0'
          },
          devDependencies: {
            typescript: '5.5.2',
            '@types/node': '20.14.2',
            '@types/react': '18.3.3',
            '@types/react-dom': '18.3.0',
            tailwindcss: '3.4.4',
            postcss: '8.4.38',
            autoprefixer: '10.4.19'
          }
        }, null, 2)
      },
      // tsconfig.json
      {
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
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
      // tailwind.config.ts
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
    extend: {},
  },
  plugins: [],
};

export default config;
`
      },
      // postcss.config.mjs
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
      // app/globals.css
      {
        path: 'app/globals.css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    @apply scroll-smooth antialiased;
  }
  
  body {
    @apply bg-zinc-950 text-white;
  }
}
`
      },
      // app/layout.tsx
      {
        path: 'app/layout.tsx',
        content: `import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '${projectName}',
  description: 'Generated application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
`
      }
      // Note: We intentionally don't include app/page.tsx here
      // The AI should generate it. If it doesn't, we add a fallback in mergeWithTemplate
    ]
  };
}

// ============================================================================
// VITE REACT TEMPLATE
// ============================================================================

export function getViteReactTemplate(projectName: string = 'vite-app'): ProjectTemplate {
  return {
    name: projectName,
    description: 'Vite + React + TypeScript',
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: projectName,
          private: true,
          version: '0.0.0',
          type: 'module',
          scripts: {
            dev: 'vite',
            build: 'tsc && vite build',
            preview: 'vite preview'
          },
          dependencies: {
            react: '^18.3.1',
            'react-dom': '^18.3.1',
            'lucide-react': '^0.400.0'
          },
          devDependencies: {
            '@types/react': '^18.3.3',
            '@types/react-dom': '^18.3.0',
            '@vitejs/plugin-react': '^4.3.1',
            typescript: '^5.5.2',
            vite: '^5.3.0',
            tailwindcss: '^3.4.4',
            postcss: '^8.4.38',
            autoprefixer: '^10.4.19'
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
    ]
  };
}

// ============================================================================
// FALLBACK app/page.tsx
// ============================================================================

function createFallbackPage(projectName: string): TemplateFile {
  const safeTitle = projectName.replace(/[^a-zA-Z0-9\s]/g, ' ').trim() || 'Generated App';
  
  return {
    path: 'app/page.tsx',
    content: `'use client';

import { useState } from 'react';
import { Sparkles, ArrowRight, CheckCircle } from 'lucide-react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">${safeTitle}</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#about" className="text-sm text-gray-400 hover:text-white transition-colors">About</a>
            <button className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 transition-colors">
              Get Started
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/20 text-violet-400 rounded-full text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            Welcome
          </div>
          
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            ${safeTitle}
          </h1>
          
          <p className="text-xl text-gray-400 mb-8">
            Your application has been generated. Customize this page to match your needs.
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-500 transition-colors flex items-center gap-2"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span>Thanks! We'll be in touch.</span>
            </div>
          )}
        </div>

        {/* Features */}
        <section id="features" className="mt-32 grid md:grid-cols-3 gap-6">
          {[
            { title: 'Fast & Reliable', desc: 'Built with modern technologies for optimal performance.' },
            { title: 'Easy to Use', desc: 'Intuitive interface designed for the best user experience.' },
            { title: 'Fully Customizable', desc: 'Adapt the application to fit your specific needs.' },
          ].map((feature, i) => (
            <div key={i} className="p-6 bg-zinc-900 border border-white/10 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.desc}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-gray-500 text-sm">
          © 2024 ${safeTitle}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
`
  };
}

// ============================================================================
// MERGE WITH TEMPLATE (WITH FALLBACK)
// ============================================================================

/**
 * Merge AI-generated files with template
 * 
 * CRITICAL: This function adds missing files AND ensures app/page.tsx exists.
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
      existingPaths.add(templateFile.path);
    }
  }
  
  // CRITICAL: Ensure app/page.tsx exists
  const hasPageTsx = existingPaths.has('app/page.tsx');
  if (!hasPageTsx) {
    console.warn('⚠️ No app/page.tsx found! Adding fallback page...');
    const fallbackPage = createFallbackPage(template.name);
    result.push(fallbackPage);
    existingPaths.add('app/page.tsx');
  }
  
  return result;
}

// ============================================================================
// VALIDATE PROJECT FILES
// ============================================================================

export function validateProjectFiles(files: TemplateFile[]): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const requiredFiles = [
    'package.json',
    'app/page.tsx',
    'app/layout.tsx',
    'app/globals.css',
  ];
  
  const recommendedFiles = [
    'tailwind.config.ts',
    'tsconfig.json',
    'postcss.config.mjs',
    'next.config.mjs',
  ];
  
  const existingPaths = new Set(files.map(f => f.path));
  
  const missing = requiredFiles.filter(f => !existingPaths.has(f));
  const warnings = recommendedFiles.filter(f => !existingPaths.has(f));
  
  return {
    valid: missing.length === 0,
    missing,
    warnings: warnings.length > 0 ? [`Recommended files missing: ${warnings.join(', ')}`] : [],
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
  validateProjectFiles,
  createFallbackPage
};

export default templatesApi;