/**
 * API Backend Generator
 * 
 * File: src/lib/generation/api-generator.ts
 * 
 * Generates API-only backends (headless) including:
 * - RESTful API routes with proper structure
 * - Database models with Prisma
 * - Authentication (API keys, JWT)
 * - Input validation with Zod
 * - OpenAPI/Swagger documentation
 * - Rate limiting
 * - Error handling
 */

import Anthropic from '@anthropic-ai/sdk';

import { prisma } from '../prisma';
import { GeneratedFile, GenerationResult, StreamCallbacks } from './bolt-generator';

// ============================================================================
// API SYSTEM PROMPT
// ============================================================================

const API_SYSTEM_PROMPT = `You are an expert backend API architect. You create production-ready, headless API backends using Next.js API routes.

OUTPUT FORMAT:
You MUST output files in this exact format:

<file path="package.json">
{
  "name": "api-backend",
  ...
}
</file>

<file path="app/api/v1/users/route.ts">
// API route implementation
</file>

## API ARCHITECTURE

### REQUIRED STRUCTURE:
\`\`\`
app/
├── api/
│   ├── v1/                    # Versioned API
│   │   ├── users/
│   │   │   ├── route.ts       # GET all, POST create
│   │   │   └── [id]/
│   │   │       └── route.ts   # GET one, PUT, DELETE
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   └── refresh/route.ts
│   │   └── [resource]/        # Other resources
│   ├── health/route.ts        # Health check
│   └── docs/route.ts          # API documentation
lib/
├── db.ts                      # Prisma client
├── auth.ts                    # Auth utilities
├── validation.ts              # Zod schemas
├── errors.ts                  # Error handling
├── rate-limit.ts              # Rate limiting
└── types.ts                   # TypeScript types
prisma/
└── schema.prisma              # Database schema
\`\`\`

### API ROUTE PATTERN:

\`\`\`typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { ApiError, handleError } from '@/lib/errors';

// Validation schema
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
});

// GET /api/v1/users
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // Authentication (optional for public endpoints)
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const skip = (page - 1) * limit;

    // Query
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: { id: true, email: true, name: true, createdAt: true },
      }),
      prisma.user.count(),
    ]);

    return NextResponse.json({
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/v1/users
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validation
    const result = CreateUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: result.data.email,
        name: result.data.name,
        // Hash password before storing
        passwordHash: await hashPassword(result.data.password),
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
\`\`\`

### AUTHENTICATION PATTERNS:

\`\`\`typescript
// lib/auth.ts
import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.slice(7);
  
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub as string },
    });
    return user;
  } catch {
    return null;
  }
}

export async function generateToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}
\`\`\`

### API KEY AUTHENTICATION:

\`\`\`typescript
// For service-to-service or external API access
export async function authenticateApiKey(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey) return null;
  
  const key = await prisma.apiKey.findUnique({
    where: { key: apiKey, active: true },
    include: { user: true },
  });
  
  if (!key) return null;
  
  // Update last used
  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });
  
  return key.user;
}
\`\`\`

### ERROR HANDLING:

\`\`\`typescript
// lib/errors.ts
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export function handleError(error: unknown) {
  console.error('API Error:', error);

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.statusCode }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A record with this value already exists' },
        { status: 409 }
      );
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }
  }

  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
\`\`\`

### RATE LIMITING:

\`\`\`typescript
// lib/rate-limit.ts
import { NextRequest } from 'next/server';

const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

export async function rateLimit(
  request: NextRequest,
  limit: number = 100,
  windowMs: number = 60000
) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  
  const record = rateLimitMap.get(ip);
  
  if (!record || now - record.timestamp > windowMs) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return { success: true, headers: getRateLimitHeaders(1, limit) };
  }
  
  if (record.count >= limit) {
    return {
      success: false,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(record.timestamp + windowMs).toISOString(),
      },
    };
  }
  
  record.count++;
  return { success: true, headers: getRateLimitHeaders(record.count, limit) };
}

function getRateLimitHeaders(current: number, limit: number) {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': (limit - current).toString(),
  };
}
\`\`\`

### OPENAPI DOCUMENTATION:

Generate an OpenAPI spec file and a docs endpoint:

\`\`\`typescript
// app/api/docs/route.ts
import { NextResponse } from 'next/server';

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'API Documentation',
    version: '1.0.0',
    description: 'RESTful API documentation',
  },
  servers: [
    { url: '/api/v1', description: 'API v1' },
  ],
  paths: {
    '/users': {
      get: {
        summary: 'List users',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'List of users' },
        },
      },
      post: {
        summary: 'Create user',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  name: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'User created' },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(openApiSpec);
}
\`\`\`

## CRITICAL RULES:
1. Always version your API (/api/v1/)
2. Use proper HTTP methods (GET, POST, PUT, PATCH, DELETE)
3. Return consistent response formats
4. Include pagination for list endpoints
5. Validate all inputs with Zod
6. Include proper error handling
7. Add rate limiting
8. Use proper status codes
9. Include API documentation
10. NO frontend pages - this is API only`;

function buildAPIUserPrompt(userRequest: string): string {
  return `Create a complete, production-ready API backend for:

"${userRequest}"

This is an API-ONLY backend with:
1. Versioned RESTful API routes (/api/v1/...)
2. Database schema with Prisma
3. Authentication (JWT + API keys)
4. Input validation with Zod
5. Rate limiting
6. Proper error handling
7. OpenAPI documentation endpoint
8. Health check endpoint

NO frontend pages - only API routes.

Start generating files now:`;
}

// ============================================================================
// API GENERATOR CLASS
// ============================================================================

export class APIGenerator {
  private client: Anthropic;
  
  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  
  async generate(
    prompt: string,
    jobId?: string,
    callbacks?: StreamCallbacks
  ): Promise<GenerationResult> {
    console.log('🔌 API Backend generation starting...');
    console.log(`   Prompt: "${prompt.slice(0, 100)}..."`);
    
    try {
      if (jobId) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: 'RUNNING',
            generationStartedAt: new Date(),
          }
        });
      }
      
      callbacks?.onProgress?.('🔌 Generating API backend...');
      
      let responseText = '';
      
      const stream = this.client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 32000,
        temperature: 0.7,
        system: API_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: buildAPIUserPrompt(prompt)
        }]
      });
      
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          responseText += event.delta.text;
        }
      }
      
      callbacks?.onProgress?.('📦 Parsing API files...');
      
      let files = this.parseFilesFromResponse(responseText);
      files = this.ensureEssentialAPIFiles(files, prompt);
      
      console.log(`   Generated ${files.length} API files`);
      files.forEach((f: GeneratedFile) => {
        console.log(`   - ${f.path}`);
        callbacks?.onFileComplete?.(f.path, f.content);
      });
      
      if (jobId) {
        await prisma.$transaction(
          files.map((file: GeneratedFile) =>
            prisma.generatedFile.upsert({
              where: {
                generationJobId_path: {
                  generationJobId: jobId,
                  path: file.path,
                },
              },
              update: {
                content: file.content,
                language: file.language,
                size: file.content.length,
              },
              create: {
                generationJobId: jobId,
                path: file.path,
                content: file.content,
                language: file.language,
                size: file.content.length,
              },
            })
          )
        );
        
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            generationCompletedAt: new Date(),
            totalModules: files.length,
            completedModules: files.length,
          }
        });
      }
      
      callbacks?.onProgress?.('✅ API backend generated successfully!');
      
      return { success: true, files };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ API generation failed:', errorMessage);
      callbacks?.onError?.(errorMessage);
      
      if (jobId) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { status: 'FAILED', errorLog: errorMessage },
        });
      }
      
      return { success: false, files: [], error: errorMessage };
    }
  }
  
  private parseFilesFromResponse(response: string): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const fileRegex = /<file\s+path=["']([^"']+)["']>([\s\S]*?)<\/file>/gi;
    
    let match;
    while ((match = fileRegex.exec(response)) !== null) {
      const path = match[1].trim();
      const content = match[2].replace(/^\n+/, '').replace(/\n+$/, '').trim();
      const language = this.detectLanguage(path);
      files.push({ path, content, language });
    }
    
    return files;
  }
  
  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'json': 'json',
      'prisma': 'prisma',
    };
    return languageMap[ext] || 'plaintext';
  }
  
  private ensureEssentialAPIFiles(files: GeneratedFile[], prompt: string): GeneratedFile[] {
    const fileMap = new Map(files.map(f => [f.path, f]));
    const projectName = prompt.slice(0, 30).replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'api';
    const safeName = projectName.toLowerCase().replace(/\s+/g, '-');
    
    // Ensure package.json
    if (!fileMap.has('package.json')) {
      fileMap.set('package.json', {
        path: 'package.json',
        content: JSON.stringify({
          name: safeName,
          version: '0.1.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'prisma generate && next build',
            start: 'next start',
            postinstall: 'prisma generate'
          },
          dependencies: {
            'next': '14.2.5',
            'react': '18.3.1',
            'react-dom': '18.3.1',
            '@prisma/client': '^5.0.0',
            'zod': '^3.22.0',
            'jose': '^5.0.0',
            'bcryptjs': '^2.4.3'
          },
          devDependencies: {
            'prisma': '^5.0.0',
            'typescript': '5.5.2',
            '@types/node': '20.14.0',
            '@types/react': '18.3.3',
            '@types/bcryptjs': '^2.4.0'
          }
        }, null, 2),
        language: 'json'
      });
    }
    
    // Ensure lib/db.ts
    if (!fileMap.has('lib/db.ts')) {
      fileMap.set('lib/db.ts', {
        path: 'lib/db.ts',
        content: `import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
`,
        language: 'typescript'
      });
    }
    
    // Ensure health check
    if (!fileMap.has('app/api/health/route.ts')) {
      fileMap.set('app/api/health/route.ts', {
        path: 'app/api/health/route.ts',
        content: `import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw\`SELECT 1\`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      },
      { status: 503 }
    );
  }
}
`,
        language: 'typescript'
      });
    }
    
    // Ensure tsconfig.json
    if (!fileMap.has('tsconfig.json')) {
      fileMap.set('tsconfig.json', {
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
            paths: { '@/*': ['./*'] }
          },
          include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
          exclude: ['node_modules']
        }, null, 2),
        language: 'json'
      });
    }
    
    // Ensure next.config.mjs
    if (!fileMap.has('next.config.mjs')) {
      fileMap.set('next.config.mjs', {
        path: 'next.config.mjs',
        content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  // API-only mode - no need for standalone output
  reactStrictMode: true,
};

export default nextConfig;
`,
        language: 'javascript'
      });
    }
    
    // Ensure .env.example
    if (!fileMap.has('.env.example')) {
      fileMap.set('.env.example', {
        path: '.env.example',
        content: `# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET="your-jwt-secret-here"

# API Configuration
API_RATE_LIMIT=100
API_RATE_LIMIT_WINDOW_MS=60000
`,
        language: 'plaintext'
      });
    }
    
    return Array.from(fileMap.values());
  }
}

// Export singleton
export const apiGenerator = new APIGenerator();
