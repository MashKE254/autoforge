/**
 * Base Generation API Route - FIXED VERSION
 * 
 * File: src/app/api/generate/route.ts
 * 
 * FIXES:
 * 1. Improved file parser with multiple format support
 * 2. Always ensures app/page.tsx exists
 * 3. Saves to BOTH filesJson AND GeneratedFile table
 * 4. Better error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import { PREMIUM_UI_SYSTEM_PROMPT, buildPremiumUserPrompt } from '@/lib/generation/premium-ui-prompt';

// ============================================================================
// GET: Info about generation endpoints
// ============================================================================

export async function GET() {
  return NextResponse.json({
    endpoints: {
      '/api/generate': 'POST - Main generation endpoint (this one)',
      '/api/generate/stream': 'POST - Streaming generation with SSE',
    },
    usage: {
      method: 'POST',
      body: {
        prompt: 'string (required) - Description of what to build',
      },
    },
  });
}

// ============================================================================
// POST: Main generation endpoint
// ============================================================================

export async function POST(request: NextRequest) {
  let jobId: string | null = null;
  
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // 2. Get user from database by email
    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      console.log(`Creating user for email: ${session.user.email}`);
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name || null,
          image: session.user.image || null,
        },
      });
    }

    // 3. Parse request
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: 'Valid prompt is required (minimum 3 characters)' },
        { status: 400 }
      );
    }

    const trimmedPrompt = prompt.trim();
    console.log(`📝 /api/generate - Direct generation`);
    console.log(`   User: ${user.email} (${user.id})`);
    console.log(`   Prompt: "${trimmedPrompt.slice(0, 50)}..."`);

    // 4. Create job record
    const job = await prisma.generationJob.create({
      data: {
        userId: user.id,
        prompt: trimmedPrompt,
        status: 'RUNNING',
        generationStartedAt: new Date(),
      },
    });
    jobId = job.id;

    console.log(`   Job ID: ${job.id}`);

    // 5. Generate with Claude
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    console.log(`   Calling Claude API...`);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      temperature: 0.7,
      system: PREMIUM_UI_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: buildPremiumUserPrompt(trimmedPrompt),
      }],
    });

    // 6. Extract text content
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    console.log(`   Response length: ${textContent.text.length} chars`);

    // 7. Parse files from response
    let files = parseFilesFromResponse(textContent.text);

    console.log(`   Parsed ${files.length} files from response`);

    // 8. CRITICAL: Ensure app/page.tsx exists
    files = ensureAppPageExists(files, trimmedPrompt);

    // 9. Sanitize all files (fix CSS issues)
    files = sanitizeFiles(files);

    // 10. Add missing essential files
    files = addMissingEssentialFiles(files, trimmedPrompt);

    if (files.length === 0) {
      console.error('   No files after processing');
      throw new Error('No files were generated. Please try again.');
    }

    console.log(`   Final file count: ${files.length}`);
    files.forEach(f => console.log(`   - ${f.path}`));

    // 11. Save files to BOTH locations for compatibility
    await prisma.generatedFile.deleteMany({
      where: { generationJobId: job.id },
    });

    for (const file of files) {
      await prisma.generatedFile.create({
        data: {
          generationJobId: job.id,
          path: file.path,
          content: file.content,
          language: file.language,
          size: file.content.length,
        },
      });
    }

    // Also save to filesJson
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        generationCompletedAt: new Date(),
        filesJson: JSON.stringify(files),
        completedModules: files.length,
        totalModules: files.length,
      },
    });

    console.log(`   ✅ Generation complete! Saved ${files.length} files`);

    // 12. Return success response
    return NextResponse.json({
      success: true,
      jobId: job.id,
      files,
      fileCount: files.length,
      message: `Generated ${files.length} files successfully`,
    });

  } catch (error) {
    console.error('❌ Generation error:', error);
    
    if (jobId) {
      try {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            errorLog: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (updateError) {
        console.error('Failed to update job status:', updateError);
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Generation failed';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// ============================================================================
// FILE PARSER - Multiple format support
// ============================================================================

interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

function parseFilesFromResponse(response: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const seenPaths = new Set<string>();
  
  // Pattern 1: <file path="...">content</file>
  const fileTagRegex = /<file\s+path=["']([^"']+)["']>([\s\S]*?)<\/file>/gi;
  let match;
  
  while ((match = fileTagRegex.exec(response)) !== null) {
    const [, filePath, content] = match;
    const normalizedPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    
    if (!seenPaths.has(normalizedPath)) {
      seenPaths.add(normalizedPath);
      files.push({
        path: normalizedPath,
        content: content.trim(),
        language: getLanguageFromPath(normalizedPath),
      });
    }
  }
  
  // If we found files with the <file> tag format, return them
  if (files.length > 0) {
    console.log(`   Found ${files.length} files using <file> tag format`);
    return files;
  }
  
  // Pattern 2: ### `path/to/file.ext` followed by ```lang\ncode```
  const markdownRegex = /###\s*`([^`]+)`\s*\n```(\w+)?\n([\s\S]*?)```/gi;
  
  while ((match = markdownRegex.exec(response)) !== null) {
    const [, filePath, , content] = match;
    const normalizedPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    
    if (!seenPaths.has(normalizedPath)) {
      seenPaths.add(normalizedPath);
      files.push({
        path: normalizedPath,
        content: content.trim(),
        language: getLanguageFromPath(normalizedPath),
      });
    }
  }
  
  if (files.length > 0) {
    console.log(`   Found ${files.length} files using markdown format`);
    return files;
  }
  
  // Pattern 3: **path/to/file.ext** followed by code block
  const boldPathRegex = /\*\*([^*]+\.(ts|tsx|js|jsx|json|css|md|mjs|prisma|html))\*\*\s*\n```(\w+)?\n([\s\S]*?)```/gi;
  
  while ((match = boldPathRegex.exec(response)) !== null) {
    const [, filePath, , , content] = match;
    const normalizedPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    
    if (!seenPaths.has(normalizedPath)) {
      seenPaths.add(normalizedPath);
      files.push({
        path: normalizedPath,
        content: content.trim(),
        language: getLanguageFromPath(normalizedPath),
      });
    }
  }
  
  if (files.length > 0) {
    console.log(`   Found ${files.length} files using bold path format`);
    return files;
  }
  
  // Pattern 4: File: path/to/file.ext followed by code block
  const fileColonRegex = /File:\s*`?([^\n`]+\.(ts|tsx|js|jsx|json|css|md|mjs))`?\s*\n```(\w+)?\n([\s\S]*?)```/gi;
  
  while ((match = fileColonRegex.exec(response)) !== null) {
    const [, filePath, , , content] = match;
    const normalizedPath = filePath.trim().startsWith('/') ? filePath.trim().slice(1) : filePath.trim();
    
    if (!seenPaths.has(normalizedPath)) {
      seenPaths.add(normalizedPath);
      files.push({
        path: normalizedPath,
        content: content.trim(),
        language: getLanguageFromPath(normalizedPath),
      });
    }
  }
  
  if (files.length > 0) {
    console.log(`   Found ${files.length} files using File: format`);
  }

  return files;
}

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'json': 'json',
    'css': 'css',
    'scss': 'scss',
    'html': 'html',
    'md': 'markdown',
    'mjs': 'javascript',
    'prisma': 'prisma',
    'sql': 'sql',
    'yaml': 'yaml',
    'yml': 'yaml',
    'env': 'plaintext',
  };
  return languageMap[ext] || 'plaintext';
}

// ============================================================================
// ENSURE app/page.tsx EXISTS
// ============================================================================

function ensureAppPageExists(files: GeneratedFile[], prompt: string): GeneratedFile[] {
  const hasAppPage = files.some(f => f.path === 'app/page.tsx');
  
  if (hasAppPage) {
    return files;
  }
  
  console.warn('⚠️ No app/page.tsx found! Adding DASHBOARD fallback...');
  
  // Extract a title from the prompt
  const titleMatch = prompt.match(/(?:build|create|make)\s+(?:a\s+)?([^.!?\n]+)/i);
  const appTitle = titleMatch ? titleMatch[1].trim().slice(0, 30) : 'Dashboard';
  
  // Create a REAL DASHBOARD fallback, not a landing page
  const fallbackPage: GeneratedFile = {
    path: 'app/page.tsx',
    content: `'use client';

import { useState } from 'react';
import {
  LayoutDashboard, FileText, Settings, Users, PieChart,
  TrendingUp, TrendingDown, DollarSign, Activity,
  Plus, Search, Bell, MoreHorizontal, ChevronDown, X
} from 'lucide-react';

// Mock Data
const stats = [
  { label: 'Total Revenue', value: '$45,231', change: '+12.5%', trend: 'up', icon: DollarSign },
  { label: 'Active Users', value: '2,345', change: '+8.2%', trend: 'up', icon: Users },
  { label: 'Transactions', value: '1,234', change: '-2.4%', trend: 'down', icon: Activity },
  { label: 'Growth Rate', value: '23.5%', change: '+4.1%', trend: 'up', icon: TrendingUp },
];

const recentItems = [
  { id: 1, name: 'Project Alpha', status: 'Active', amount: '$12,500', date: 'Jan 15, 2024' },
  { id: 2, name: 'Project Beta', status: 'Pending', amount: '$8,200', date: 'Jan 14, 2024' },
  { id: 3, name: 'Project Gamma', status: 'Completed', amount: '$15,800', date: 'Jan 13, 2024' },
  { id: 4, name: 'Project Delta', status: 'Active', amount: '$6,300', date: 'Jan 12, 2024' },
  { id: 5, name: 'Project Epsilon', status: 'Pending', amount: '$9,100', date: 'Jan 11, 2024' },
];

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: FileText, label: 'Reports', active: false },
  { icon: Users, label: 'Users', active: false },
  { icon: PieChart, label: 'Analytics', active: false },
  { icon: Settings, label: 'Settings', active: false },
];

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500/20 text-green-400';
      case 'Pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'Completed': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="flex h-screen bg-[#09090B]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-[#0A0A0B] flex flex-col">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white">${appTitle}</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item, i) => (
            <button
              key={i}
              className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors \${
                item.active
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }\`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">John Doe</p>
              <p className="text-xs text-gray-500 truncate">john@example.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-white/10 flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold text-white">Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 w-64"
              />
            </div>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg">
              <Bell className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-1.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {stats.map((stat, i) => (
              <div key={i} className="bg-zinc-900 rounded-xl border border-white/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">{stat.label}</span>
                  <stat.icon className="w-4 h-4 text-violet-400" />
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  {stat.trend === 'up' ? (
                    <TrendingUp className="w-3 h-3 text-green-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  )}
                  <span className={\`text-xs \${stat.trend === 'up' ? 'text-green-400' : 'text-red-400'}\`}>
                    {stat.change}
                  </span>
                  <span className="text-xs text-gray-500">vs last month</span>
                </div>
              </div>
            ))}
          </div>

          {/* Data Table */}
          <div className="bg-zinc-900 rounded-xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-white">Recent Items</h3>
              <button className="text-sm text-violet-400 hover:text-violet-300">View All</button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Date</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentItems.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-sm text-white font-medium">{item.name}</td>
                    <td className="py-3 px-4">
                      <span className={\`px-2 py-1 text-xs font-medium rounded-full \${getStatusColor(item.status)}\`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-white">{item.amount}</td>
                    <td className="py-3 px-4 text-sm text-gray-400">{item.date}</td>
                    <td className="py-3 px-4 text-right">
                      <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-gray-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-zinc-900 rounded-xl border border-white/10 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Add New Item</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                  placeholder="Enter name..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Amount</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                  placeholder="$0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-violet-500">
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-white/10">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`,
    language: 'typescript',
  };
  
  return [fallbackPage, ...files];
}

// ============================================================================
// SANITIZE FILES (Fix CSS issues)
// ============================================================================

function sanitizeFiles(files: GeneratedFile[]): GeneratedFile[] {
  return files.map(file => {
    let content = file.content;
    
    // Fix CSS files
    if (file.path.endsWith('.css')) {
      // Remove Google Fonts @import
      content = content.replace(/@import\s+url\([^)]+fonts\.googleapis\.com[^)]+\);?\s*/g, '');
      
      // Fix Tailwind imports
      content = content.replace(/@import\s+['"]tailwindcss\/base['"];?/g, '@tailwind base;');
      content = content.replace(/@import\s+['"]tailwindcss\/components['"];?/g, '@tailwind components;');
      content = content.replace(/@import\s+['"]tailwindcss\/utilities['"];?/g, '@tailwind utilities;');
    }
    
    // Fix TSX/JSX/CSS files - replace problematic Tailwind classes
    if (file.path.endsWith('.tsx') || file.path.endsWith('.jsx') || file.path.endsWith('.css')) {
      content = content.replace(/\bbg-dark-\d+\b/g, 'bg-zinc-900');
      content = content.replace(/\bborder-border\b/g, 'border-white/10');
      content = content.replace(/\bbg-background\b/g, 'bg-zinc-950');
      content = content.replace(/\btext-foreground\b/g, 'text-white');
      content = content.replace(/\bbg-card\b/g, 'bg-zinc-900');
      content = content.replace(/\btext-card-foreground\b/g, 'text-white');
      content = content.replace(/\bbg-muted\b/g, 'bg-zinc-800');
      content = content.replace(/\btext-muted-foreground\b/g, 'text-gray-400');
      content = content.replace(/\bring-ring\b/g, 'ring-violet-500');
    }
    
    return {
      ...file,
      content,
    };
  });
}

// ============================================================================
// ADD MISSING ESSENTIAL FILES
// ============================================================================

function addMissingEssentialFiles(files: GeneratedFile[], prompt: string): GeneratedFile[] {
  const fileMap = new Map(files.map(f => [f.path, f]));
  const safeTitle = prompt.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'AutoForge App';
  const safeName = safeTitle.toLowerCase().replace(/\s+/g, '-');
  
  // Ensure package.json exists
  if (!fileMap.has('package.json')) {
    fileMap.set('package.json', {
      path: 'package.json',
      content: JSON.stringify({
        name: safeName,
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint',
        },
        dependencies: {
          next: '14.2.5',
          react: '18.3.1',
          'react-dom': '18.3.1',
          'lucide-react': '^0.400.0',
          clsx: '^2.1.1',
          'date-fns': '^3.6.0',
        },
        devDependencies: {
          typescript: '5.5.2',
          '@types/node': '20.14.2',
          '@types/react': '18.3.3',
          '@types/react-dom': '18.3.0',
          tailwindcss: '3.4.4',
          postcss: '8.4.38',
          autoprefixer: '10.4.19',
        },
      }, null, 2),
      language: 'json',
    });
  }
  
  // Ensure app/layout.tsx exists
  if (!fileMap.has('app/layout.tsx')) {
    fileMap.set('app/layout.tsx', {
      path: 'app/layout.tsx',
      content: `import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '${safeTitle}',
  description: 'Generated by AutoForge',
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
`,
      language: 'typescript',
    });
  }
  
  // Ensure app/globals.css exists
  if (!fileMap.has('app/globals.css')) {
    fileMap.set('app/globals.css', {
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
`,
      language: 'css',
    });
  }
  
  // Ensure tailwind.config.ts exists
  if (!fileMap.has('tailwind.config.ts') && !fileMap.has('tailwind.config.js')) {
    fileMap.set('tailwind.config.ts', {
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
`,
      language: 'typescript',
    });
  }
  
  // Ensure postcss.config.mjs exists
  if (!fileMap.has('postcss.config.mjs') && !fileMap.has('postcss.config.js')) {
    fileMap.set('postcss.config.mjs', {
      path: 'postcss.config.mjs',
      content: `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
`,
      language: 'javascript',
    });
  }
  
  // Ensure next.config.mjs exists
  if (!fileMap.has('next.config.mjs') && !fileMap.has('next.config.js')) {
    fileMap.set('next.config.mjs', {
      path: 'next.config.mjs',
      content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`,
      language: 'javascript',
    });
  }
  
  // Ensure tsconfig.json exists
  if (!fileMap.has('tsconfig.json')) {
    fileMap.set('tsconfig.json', {
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
          paths: { '@/*': ['./*'] },
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules'],
      }, null, 2),
      language: 'json',
    });
  }
  
  return Array.from(fileMap.values());
}