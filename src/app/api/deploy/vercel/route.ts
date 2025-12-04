/**
 * Vercel Deployment API Route - NODE.JS VERSION FIXED
 * 
 * File: src/app/api/deploy/vercel/route.ts
 * 
 * FIX: Node.js version must be set via package.json "engines" field
 * Vercel ignores projectSettings.nodeVersion in API v13
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';

// Types
interface GeneratedFile {
  path: string;
  content: string;
  language?: string;
}

interface DeployRequestBody {
  jobId: string;
  deploymentType?: 'personal' | 'public';
  enableMonetization?: boolean;
}

// Helper: Ensure package.json has correct Node.js version
function ensureNodeVersion(files: GeneratedFile[]): GeneratedFile[] {
  const packageJsonIndex = files.findIndex(f => f.path === 'package.json');
  
  if (packageJsonIndex === -1) {
    console.error('❌ No package.json found in files!');
    return files;
  }
  
  try {
    const packageJson = JSON.parse(files[packageJsonIndex].content);
    
    // Add engines field with Node.js 24
    packageJson.engines = {
      node: '24.x',
    };
    
    // Update the file
    const updatedFiles = [...files];
    updatedFiles[packageJsonIndex] = {
      ...files[packageJsonIndex],
      content: JSON.stringify(packageJson, null, 2),
    };
    
    console.log('✅ Added Node.js 24.x to package.json engines');
    return updatedFiles;
    
  } catch (e) {
    console.error('❌ Failed to parse package.json:', e);
    return files;
  }
}

// Helper: Ensure all required Next.js files exist
function ensureRequiredFiles(files: GeneratedFile[], projectName: string): GeneratedFile[] {
  const fileMap = new Map(files.map(f => [f.path, f]));
  const updatedFiles = [...files];
  
  // Check for required files
  const requiredFiles = [
    'package.json',
    'app/layout.tsx',
    'app/page.tsx',
    'tailwind.config.js',
    'postcss.config.js',
    'next.config.mjs',
    'tsconfig.json',
    'app/globals.css',
  ];
  
  const missing = requiredFiles.filter(f => !fileMap.has(f));
  if (missing.length > 0) {
    console.log('⚠️ Missing files:', missing.join(', '));
  }
  
  // Add postcss.config.js if missing
  if (!fileMap.has('postcss.config.js')) {
    updatedFiles.push({
      path: 'postcss.config.js',
      content: `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`,
    });
    console.log('✅ Added missing postcss.config.js');
  }
  
  // Add tailwind.config.js if missing
  if (!fileMap.has('tailwind.config.js') && !fileMap.has('tailwind.config.ts')) {
    updatedFiles.push({
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
`,
    });
    console.log('✅ Added missing tailwind.config.js');
  }
  
  // Add next.config.mjs if missing
  if (!fileMap.has('next.config.mjs') && !fileMap.has('next.config.js')) {
    updatedFiles.push({
      path: 'next.config.mjs',
      content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`,
    });
    console.log('✅ Added missing next.config.mjs');
  }
  
  // Add tsconfig.json if missing
  if (!fileMap.has('tsconfig.json')) {
    updatedFiles.push({
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'es5',
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
    });
    console.log('✅ Added missing tsconfig.json');
  }
  
  // Add app/globals.css if missing
  if (!fileMap.has('app/globals.css')) {
    updatedFiles.push({
      path: 'app/globals.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-rgb: 255, 255, 255;
}

body {
  color: rgb(var(--foreground-rgb));
  background: rgb(var(--background-rgb));
}
`,
    });
    console.log('✅ Added missing app/globals.css');
  }
  
  // Add app/layout.tsx if missing
  if (!fileMap.has('app/layout.tsx')) {
    updatedFiles.push({
      path: 'app/layout.tsx',
      content: `import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '${projectName}',
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
    });
    console.log('✅ Added missing app/layout.tsx');
  }
  
  // Add app/page.tsx if missing
  if (!fileMap.has('app/page.tsx')) {
    updatedFiles.push({
      path: 'app/page.tsx',
      content: `export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">${projectName}</h1>
        <p className="text-gray-400">Generated by AutoForge</p>
      </div>
    </main>
  );
}
`,
    });
    console.log('✅ Added missing app/page.tsx');
  }
  
  return updatedFiles;
}

// POST: Create new deployment
export async function POST(request: NextRequest) {
  console.log('🚀 [Deploy API] Starting deployment...');
  
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('❌ [Deploy API] No session found');
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }
    console.log('✅ [Deploy API] User authenticated:', session.user.id);

    // 2. Parse request body
    let body: DeployRequestBody;
    try {
      body = await request.json();
    } catch (e) {
      console.error('❌ [Deploy API] Invalid JSON body');
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { jobId, deploymentType = 'personal', enableMonetization = false } = body;
    console.log('📋 [Deploy API] Job ID:', jobId, '| Type:', deploymentType);

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID required' },
        { status: 400 }
      );
    }

    // 3. Check VERCEL_TOKEN
    const vercelToken = process.env.VERCEL_TOKEN;
    if (!vercelToken) {
      console.error('❌ [Deploy API] VERCEL_TOKEN not set!');
      return NextResponse.json(
        { 
          error: 'Vercel not configured. Please add VERCEL_TOKEN to your .env.local file.',
          help: 'Get a token from https://vercel.com/account/tokens'
        },
        { status: 500 }
      );
    }
    console.log('✅ [Deploy API] VERCEL_TOKEN found');

    // 4. Get job with files
    const job = await prisma.generationJob.findUnique({
      where: {
        id: jobId,
        userId: session.user.id,
      },
      include: { files: true },
    });

    if (!job) {
      console.error('❌ [Deploy API] Job not found:', jobId);
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }
    console.log('✅ [Deploy API] Job found:', job.prompt.slice(0, 50) + '...');

    if (job.status !== 'COMPLETED') {
      console.error('❌ [Deploy API] Job not completed. Status:', job.status);
      return NextResponse.json(
        { error: `Generation not completed yet. Current status: ${job.status}` },
        { status: 400 }
      );
    }

    if (!job.files || job.files.length === 0) {
      console.error('❌ [Deploy API] No files found for job');
      return NextResponse.json(
        { error: 'No files found for this job' },
        { status: 400 }
      );
    }
    console.log('✅ [Deploy API] Original files found:', job.files.length);

    // 5. Check for existing active deployment
    const existingDeployment = await prisma.deployment.findFirst({
      where: {
        generationJobId: jobId,
        status: { in: ['PENDING', 'BUILDING', 'READY'] },
      },
    });

    if (existingDeployment && existingDeployment.deploymentUrl) {
      console.log('ℹ️ [Deploy API] Using existing deployment:', existingDeployment.deploymentUrl);
      return NextResponse.json({
        success: true,
        deploymentId: existingDeployment.id,
        deploymentUrl: existingDeployment.deploymentUrl,
        status: existingDeployment.status,
        message: 'Using existing deployment',
      });
    }

    // 6. Create deployment record
    const deployment = await prisma.deployment.create({
      data: {
        generationJobId: jobId,
        status: 'PENDING',
      },
    });
    console.log('✅ [Deploy API] Deployment record created:', deployment.id);

    // 7. Process files - ensure Node.js version and required files
    const sanitizedName = job.prompt
      .slice(0, 30)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'autoforge-app';
    
    let processedFiles = job.files.map((f: GeneratedFile) => ({
      path: f.path,
      content: f.content,
    }));
    
    // Add Node.js version to package.json
    processedFiles = ensureNodeVersion(processedFiles);
    
    // Ensure all required files exist
    processedFiles = ensureRequiredFiles(processedFiles, sanitizedName);
    
    console.log('📦 [Deploy API] Deploying as:', sanitizedName);
    console.log('📦 [Deploy API] Total files after processing:', processedFiles.length);

    // 8. Prepare files for Vercel (base64 encoded)
    const vercelFiles = processedFiles.map((f: { path: string; content: string }) => ({
      file: f.path,
      data: Buffer.from(f.content).toString('base64'),
      encoding: 'base64',
    }));

    // Log file names for debugging
    console.log('📦 [Deploy API] Files:', processedFiles.map((f: { path: string }) => f.path).join(', '));

    // 9. Deploy to Vercel
    const vercelPayload = {
      name: sanitizedName,
      files: vercelFiles,
      projectSettings: {
        framework: 'nextjs',
        buildCommand: 'npm run build',
        outputDirectory: '.next',
        installCommand: 'npm install',
      },
      target: 'production',
    };

    console.log('📡 [Deploy API] Sending to Vercel API...');
    
    const vercelResponse = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vercelPayload),
    });

    // 10. Handle Vercel response
    const responseText = await vercelResponse.text();
    console.log('📡 [Deploy API] Vercel response status:', vercelResponse.status);
    
    if (!vercelResponse.ok) {
      console.error('❌ [Deploy API] Vercel API error:', responseText);
      
      let errorMessage = 'Vercel deployment failed';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || errorData.message || responseText;
      } catch (e) {
        // Keep original error
      }
      
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: 'ERROR',
          errorMessage: errorMessage,
        },
      });

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    // 11. Parse success response
    let vercelData;
    try {
      vercelData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ [Deploy API] Failed to parse Vercel response');
      return NextResponse.json(
        { error: 'Invalid response from Vercel' },
        { status: 500 }
      );
    }

    // 12. Update deployment record
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: {
        vercelDeploymentId: vercelData.id,
        vercelProjectId: vercelData.projectId,
        deploymentUrl: `https://${vercelData.url}`,
        status: 'BUILDING',
      },
    });

    console.log('✅ [Deploy API] Deployment created successfully!');
    console.log('   → URL:', `https://${vercelData.url}`);
    console.log('   → ID:', vercelData.id);

    return NextResponse.json({
      success: true,
      deploymentId: deployment.id,
      vercelDeploymentId: vercelData.id,
      deploymentUrl: `https://${vercelData.url}`,
      status: 'BUILDING',
      deploymentType,
      enableMonetization,
    });

  } catch (error) {
    console.error('❌ [Deploy API] Unexpected error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to deploy',
      },
      { status: 500 }
    );
  }
}

// GET: Check deployment status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');
    const deploymentId = searchParams.get('deploymentId');

    if (!jobId && !deploymentId) {
      return NextResponse.json(
        { error: 'Job ID or Deployment ID required' },
        { status: 400 }
      );
    }

    const deployment = await prisma.deployment.findFirst({
      where: jobId 
        ? { generationJobId: jobId }
        : { id: deploymentId! },
      orderBy: { createdAt: 'desc' },
      include: {
        generationJob: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!deployment) {
      return NextResponse.json({
        exists: false,
      });
    }

    if (deployment.generationJob.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // If deployment is building, check Vercel status
    if (deployment.status === 'BUILDING' && deployment.vercelDeploymentId) {
      const vercelToken = process.env.VERCEL_TOKEN;
      if (vercelToken) {
        try {
          const vercelResponse = await fetch(
            `https://api.vercel.com/v13/deployments/${deployment.vercelDeploymentId}`,
            {
              headers: {
                Authorization: `Bearer ${vercelToken}`,
              },
            }
          );

          if (vercelResponse.ok) {
            const vercelData = await vercelResponse.json();
            
            let newStatus: typeof deployment.status | 'READY' | 'ERROR' | 'CANCELLED' = deployment.status;
            let errorMessage = deployment.errorMessage;

            if (vercelData.readyState === 'READY') {
              newStatus = 'READY';
            } else if (vercelData.readyState === 'ERROR') {
              newStatus = 'ERROR';
              errorMessage = vercelData.error?.message || 'Build failed on Vercel';
            } else if (vercelData.readyState === 'CANCELED') {
              newStatus = 'CANCELLED';
            }

            if (newStatus !== deployment.status) {
              await prisma.deployment.update({
                where: { id: deployment.id },
                data: {
                  status: newStatus,
                  errorMessage,
                  ...(newStatus === 'READY' && vercelData.url
                    ? { deploymentUrl: `https://${vercelData.url}` }
                    : {}),
                },
              });
              deployment.status = newStatus;
              if (errorMessage) deployment.errorMessage = errorMessage;
            }
          }
        } catch (vercelError) {
          console.error('Error checking Vercel status:', vercelError);
        }
      }
    }

    return NextResponse.json({
      exists: true,
      deploymentId: deployment.id,
      vercelDeploymentId: deployment.vercelDeploymentId,
      deploymentUrl: deployment.deploymentUrl,
      status: deployment.status,
      errorMessage: deployment.errorMessage,
      createdAt: deployment.createdAt,
    });

  } catch (error) {
    console.error('Get deployment status error:', error);
    return NextResponse.json(
      { error: 'Failed to get deployment status' },
      { status: 500 }
    );
  }
}

// DELETE: Cancel deployment
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const deploymentId = searchParams.get('deploymentId');

    if (!deploymentId) {
      return NextResponse.json(
        { error: 'Deployment ID required' },
        { status: 400 }
      );
    }

    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        generationJob: {
          select: { userId: true },
        },
      },
    });

    if (!deployment) {
      return NextResponse.json(
        { error: 'Deployment not found' },
        { status: 404 }
      );
    }

    if (deployment.generationJob.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (deployment.status === 'BUILDING' && deployment.vercelDeploymentId) {
      const vercelToken = process.env.VERCEL_TOKEN;
      if (vercelToken) {
        try {
          await fetch(
            `https://api.vercel.com/v13/deployments/${deployment.vercelDeploymentId}/cancel`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${vercelToken}`,
              },
            }
          );
        } catch (cancelError) {
          console.error('Error canceling Vercel deployment:', cancelError);
        }
      }
    }

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({
      success: true,
      message: 'Deployment cancelled',
    });

  } catch (error) {
    console.error('Cancel deployment error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel deployment' },
      { status: 500 }
    );
  }
}