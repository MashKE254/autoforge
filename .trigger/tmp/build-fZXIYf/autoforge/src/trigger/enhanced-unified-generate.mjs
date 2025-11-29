import {
  AgentGenerator,
  SaaSGenerator,
  WorkflowGenerator
} from "../../../chunk-YHXRBZK6.mjs";
import {
  Anthropic,
  BoltGenerator,
  prisma
} from "../../../chunk-2RFTIJZX.mjs";
import {
  logger,
  task
} from "../../../chunk-AC4VMWMU.mjs";
import "../../../chunk-PFMI3Y4O.mjs";
import {
  __name,
  init_esm
} from "../../../chunk-VWGL725N.mjs";

// src/trigger/enhanced-unified-generate.ts
init_esm();

// src/lib/generation/api-generator.ts
init_esm();
var API_SYSTEM_PROMPT = `You are an expert backend API architect. You create production-ready, headless API backends using Next.js API routes.

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
function buildAPIUserPrompt(userRequest) {
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
__name(buildAPIUserPrompt, "buildAPIUserPrompt");
var APIGenerator = class {
  static {
    __name(this, "APIGenerator");
  }
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
  async generate(prompt, jobId, callbacks) {
    console.log("🔌 API Backend generation starting...");
    console.log(`   Prompt: "${prompt.slice(0, 100)}..."`);
    try {
      if (jobId) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: "RUNNING",
            generationStartedAt: /* @__PURE__ */ new Date()
          }
        });
      }
      callbacks?.onProgress?.("🔌 Generating API backend...");
      let responseText = "";
      const stream = this.client.messages.stream({
        model: "claude-sonnet-4-20250514",
        max_tokens: 32e3,
        temperature: 0.7,
        system: API_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: buildAPIUserPrompt(prompt)
        }]
      });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          responseText += event.delta.text;
        }
      }
      callbacks?.onProgress?.("📦 Parsing API files...");
      let files = this.parseFilesFromResponse(responseText);
      files = this.ensureEssentialAPIFiles(files, prompt);
      console.log(`   Generated ${files.length} API files`);
      files.forEach((f) => {
        console.log(`   - ${f.path}`);
        callbacks?.onFileComplete?.(f.path, f.content);
      });
      if (jobId) {
        await prisma.$transaction(
          files.map(
            (file) => prisma.generatedFile.upsert({
              where: {
                generationJobId_path: {
                  generationJobId: jobId,
                  path: file.path
                }
              },
              update: {
                content: file.content,
                language: file.language,
                size: file.content.length
              },
              create: {
                generationJobId: jobId,
                path: file.path,
                content: file.content,
                language: file.language,
                size: file.content.length
              }
            })
          )
        );
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            generationCompletedAt: /* @__PURE__ */ new Date(),
            totalModules: files.length,
            completedModules: files.length
          }
        });
      }
      callbacks?.onProgress?.("✅ API backend generated successfully!");
      return { success: true, files };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ API generation failed:", errorMessage);
      callbacks?.onError?.(errorMessage);
      if (jobId) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { status: "FAILED", errorLog: errorMessage }
        });
      }
      return { success: false, files: [], error: errorMessage };
    }
  }
  parseFilesFromResponse(response) {
    const files = [];
    const fileRegex = /<file\s+path=["']([^"']+)["']>([\s\S]*?)<\/file>/gi;
    let match;
    while ((match = fileRegex.exec(response)) !== null) {
      const path = match[1].trim();
      const content = match[2].replace(/^\n+/, "").replace(/\n+$/, "").trim();
      const language = this.detectLanguage(path);
      files.push({ path, content, language });
    }
    return files;
  }
  detectLanguage(path) {
    const ext = path.split(".").pop()?.toLowerCase() || "";
    const languageMap = {
      "ts": "typescript",
      "tsx": "typescript",
      "js": "javascript",
      "json": "json",
      "prisma": "prisma"
    };
    return languageMap[ext] || "plaintext";
  }
  ensureEssentialAPIFiles(files, prompt) {
    const fileMap = new Map(files.map((f) => [f.path, f]));
    const projectName = prompt.slice(0, 30).replace(/[^a-zA-Z0-9\s]/g, "").trim() || "api";
    const safeName = projectName.toLowerCase().replace(/\s+/g, "-");
    if (!fileMap.has("package.json")) {
      fileMap.set("package.json", {
        path: "package.json",
        content: JSON.stringify({
          name: safeName,
          version: "0.1.0",
          private: true,
          scripts: {
            dev: "next dev",
            build: "prisma generate && next build",
            start: "next start",
            postinstall: "prisma generate"
          },
          dependencies: {
            "next": "14.2.5",
            "react": "18.3.1",
            "react-dom": "18.3.1",
            "@prisma/client": "^5.0.0",
            "zod": "^3.22.0",
            "jose": "^5.0.0",
            "bcryptjs": "^2.4.3"
          },
          devDependencies: {
            "prisma": "^5.0.0",
            "typescript": "5.5.2",
            "@types/node": "20.14.0",
            "@types/react": "18.3.3",
            "@types/bcryptjs": "^2.4.0"
          }
        }, null, 2),
        language: "json"
      });
    }
    if (!fileMap.has("lib/db.ts")) {
      fileMap.set("lib/db.ts", {
        path: "lib/db.ts",
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
        language: "typescript"
      });
    }
    if (!fileMap.has("app/api/health/route.ts")) {
      fileMap.set("app/api/health/route.ts", {
        path: "app/api/health/route.ts",
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
        language: "typescript"
      });
    }
    if (!fileMap.has("tsconfig.json")) {
      fileMap.set("tsconfig.json", {
        path: "tsconfig.json",
        content: JSON.stringify({
          compilerOptions: {
            target: "es5",
            lib: ["dom", "dom.iterable", "esnext"],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: "esnext",
            moduleResolution: "bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: "preserve",
            incremental: true,
            plugins: [{ name: "next" }],
            paths: { "@/*": ["./*"] }
          },
          include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
          exclude: ["node_modules"]
        }, null, 2),
        language: "json"
      });
    }
    if (!fileMap.has("next.config.mjs")) {
      fileMap.set("next.config.mjs", {
        path: "next.config.mjs",
        content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  // API-only mode - no need for standalone output
  reactStrictMode: true,
};

export default nextConfig;
`,
        language: "javascript"
      });
    }
    if (!fileMap.has(".env.example")) {
      fileMap.set(".env.example", {
        path: ".env.example",
        content: `# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET="your-jwt-secret-here"

# API Configuration
API_RATE_LIMIT=100
API_RATE_LIMIT_WINDOW_MS=60000
`,
        language: "plaintext"
      });
    }
    return Array.from(fileMap.values());
  }
};
var apiGenerator = new APIGenerator();

// src/lib/generation/infrastructure-generator.ts
init_esm();
var INFRASTRUCTURE_SYSTEM_PROMPT = `You are an expert DevOps and infrastructure engineer. You create production-ready deployment configurations for applications.

OUTPUT FORMAT:
You MUST output files in this exact format:

<file path="Dockerfile">
FROM node:20-alpine
...
</file>

<file path="docker-compose.yml">
version: '3.8'
...
</file>

## INFRASTRUCTURE COMPONENTS TO GENERATE:

### CONTAINERIZATION:
- Dockerfile (multi-stage build, optimized)
- docker-compose.yml (development environment)
- docker-compose.prod.yml (production with replicas)
- .dockerignore

### CI/CD PIPELINES:
- .github/workflows/ci.yml (test, lint, build)
- .github/workflows/deploy.yml (deploy to production)
- .github/workflows/preview.yml (deploy previews on PR)

### KUBERNETES (if requested):
- k8s/deployment.yaml
- k8s/service.yaml
- k8s/ingress.yaml
- k8s/configmap.yaml
- k8s/secrets.yaml (template)
- k8s/hpa.yaml (horizontal pod autoscaler)

### INFRASTRUCTURE AS CODE:
- terraform/main.tf (optional)
- terraform/variables.tf
- terraform/outputs.tf

### CONFIGURATION:
- nginx/nginx.conf (reverse proxy)
- .env.example (all required variables)
- scripts/setup.sh (initial setup script)
- scripts/deploy.sh (deployment script)
- scripts/backup.sh (database backup)

## DOCKERFILE BEST PRACTICES:

\`\`\`dockerfile
# Multi-stage build for smaller image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
\`\`\`

## DOCKER COMPOSE FOR DEVELOPMENT:

\`\`\`yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/mydb
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=\${NEXTAUTH_SECRET}
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
\`\`\`

## GITHUB ACTIONS CI/CD:

\`\`\`yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: \${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    permissions:
      contents: read
      packages: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}
          tags: |
            type=sha
            type=raw,value=latest
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          # Add your deployment commands here
          # Examples:
          # - kubectl apply
          # - SSH and docker pull
          # - Vercel/Railway/Fly.io CLI
\`\`\`

## KUBERNETES DEPLOYMENT:

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  labels:
    app: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: app
          image: ghcr.io/username/app:latest
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: database-url
          resources:
            requests:
              memory: "256Mi"
              cpu: "200m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: app-service
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-service
                port:
                  number: 80
\`\`\`

## CRITICAL RULES:
1. Always use multi-stage Docker builds for smaller images
2. Include health checks in all configurations
3. Never hardcode secrets - use environment variables
4. Include proper resource limits in Kubernetes
5. Add caching layers where appropriate
6. Include rollback strategies
7. Generate .env.example with all required variables
8. Include database migration scripts
9. Add logging configuration
10. Include monitoring/observability hooks`;
function buildInfrastructureUserPrompt(userRequest, includeK8s = false) {
  return `Create complete deployment infrastructure for:

"${userRequest}"

Generate the following:
1. Dockerfile (multi-stage, optimized for Next.js)
2. docker-compose.yml (for local development with PostgreSQL and Redis)
3. docker-compose.prod.yml (for production)
4. .dockerignore
5. GitHub Actions CI/CD pipeline (.github/workflows/)
6. Environment template (.env.example)
7. Setup and deployment scripts
${includeK8s ? "8. Kubernetes manifests (deployment, service, ingress, HPA)" : ""}

Make everything production-ready with proper security, caching, and best practices.

Start generating files now:`;
}
__name(buildInfrastructureUserPrompt, "buildInfrastructureUserPrompt");
var InfrastructureGenerator = class {
  static {
    __name(this, "InfrastructureGenerator");
  }
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
  /**
   * Generate infrastructure files
   */
  async generate(prompt, jobId, callbacks, options = {}) {
    console.log("🏗️ Infrastructure generation starting...");
    console.log(`   Prompt: "${prompt.slice(0, 100)}..."`);
    try {
      if (jobId) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: "RUNNING",
            generationStartedAt: /* @__PURE__ */ new Date()
          }
        });
      }
      callbacks?.onProgress?.("🏗️ Generating infrastructure configuration...");
      let responseText = "";
      const stream = this.client.messages.stream({
        model: "claude-sonnet-4-20250514",
        max_tokens: 32e3,
        temperature: 0.7,
        system: INFRASTRUCTURE_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: buildInfrastructureUserPrompt(prompt, options.includeK8s)
        }]
      });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          responseText += event.delta.text;
        }
      }
      callbacks?.onProgress?.("📦 Parsing infrastructure files...");
      let files = this.parseFilesFromResponse(responseText);
      console.log(`   Parsed ${files.length} files from response`);
      files = this.ensureEssentialInfraFiles(files, prompt, options.includeK8s);
      console.log("   Generated infrastructure files:");
      files.forEach((f) => {
        console.log(`   - ${f.path} (${f.content.length} chars)`);
        callbacks?.onFileComplete?.(f.path, f.content);
      });
      if (jobId) {
        callbacks?.onProgress?.("💾 Saving to database...");
        await prisma.$transaction(
          files.map(
            (file) => prisma.generatedFile.upsert({
              where: {
                generationJobId_path: {
                  generationJobId: jobId,
                  path: file.path
                }
              },
              update: {
                content: file.content,
                language: file.language,
                size: file.content.length
              },
              create: {
                generationJobId: jobId,
                path: file.path,
                content: file.content,
                language: file.language,
                size: file.content.length
              }
            })
          )
        );
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            generationCompletedAt: /* @__PURE__ */ new Date(),
            totalModules: files.length,
            completedModules: files.length
          }
        });
      }
      callbacks?.onProgress?.("✅ Infrastructure generated successfully!");
      return {
        success: true,
        files
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Infrastructure generation failed:", errorMessage);
      callbacks?.onError?.(errorMessage);
      if (jobId) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: "FAILED",
            errorLog: errorMessage
          }
        });
      }
      return {
        success: false,
        files: [],
        error: errorMessage
      };
    }
  }
  /**
   * Generate infrastructure for an existing project
   */
  async generateForExistingProject(projectFiles, jobId, callbacks, options = {}) {
    const hasDatabase = projectFiles.some(
      (f) => f.path.includes("prisma") || f.content.includes("DATABASE_URL") || f.content.includes("@prisma/client")
    );
    const hasAuth = projectFiles.some(
      (f) => f.content.includes("next-auth") || f.content.includes("NextAuth")
    );
    const hasStripe = projectFiles.some(
      (f) => f.content.includes("stripe") || f.content.includes("STRIPE_")
    );
    const prompt = `A Next.js application with:
- ${hasDatabase ? "PostgreSQL database with Prisma" : "No database"}
- ${hasAuth ? "NextAuth authentication" : "No authentication"}
- ${hasStripe ? "Stripe payment integration" : "No payments"}
- Standard Next.js build process`;
    return this.generate(prompt, jobId, callbacks, options);
  }
  parseFilesFromResponse(response) {
    const files = [];
    const fileRegex = /<file\s+path=["']([^"']+)["']>([\s\S]*?)<\/file>/gi;
    let match;
    while ((match = fileRegex.exec(response)) !== null) {
      const path = match[1].trim();
      let content = match[2];
      content = content.replace(/^\n+/, "").replace(/\n+$/, "").trim();
      const language = this.detectLanguage(path);
      files.push({ path, content, language });
    }
    return files;
  }
  detectLanguage(path) {
    const ext = path.split(".").pop()?.toLowerCase() || "";
    const filename = path.split("/").pop()?.toLowerCase() || "";
    if (filename === "dockerfile") return "dockerfile";
    if (filename.endsWith(".yml") || filename.endsWith(".yaml")) return "yaml";
    if (filename.endsWith(".sh")) return "bash";
    if (filename.endsWith(".tf")) return "hcl";
    const languageMap = {
      "ts": "typescript",
      "tsx": "typescript",
      "js": "javascript",
      "json": "json",
      "yaml": "yaml",
      "yml": "yaml",
      "sh": "bash",
      "tf": "hcl",
      "conf": "nginx",
      "env": "plaintext"
    };
    return languageMap[ext] || "plaintext";
  }
  ensureEssentialInfraFiles(files, prompt, includeK8s) {
    const fileMap = new Map(files.map((f) => [f.path, f]));
    if (!fileMap.has("Dockerfile")) {
      fileMap.set("Dockerfile", {
        path: "Dockerfile",
        content: `# Multi-stage build for Next.js
FROM node:20-alpine AS base

# Dependencies stage
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client if schema exists
RUN if [ -f "prisma/schema.prisma" ]; then npx prisma generate; fi

ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set correct permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
`,
        language: "dockerfile"
      });
    }
    if (!fileMap.has("docker-compose.yml")) {
      fileMap.set("docker-compose.yml", {
        path: "docker-compose.yml",
        content: `version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: builder
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/mydb
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=\${NEXTAUTH_SECRET:-development-secret-change-in-production}
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    command: npm run dev

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
  redis_data:
`,
        language: "yaml"
      });
    }
    if (!fileMap.has(".dockerignore")) {
      fileMap.set(".dockerignore", {
        path: ".dockerignore",
        content: `# Dependencies
node_modules
npm-debug.log

# Next.js
.next
out

# Testing
coverage

# Misc
.DS_Store
*.pem
.env*.local
.env

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.idea
.vscode
*.swp
*.swo

# Git
.git
.gitignore

# Docker
Dockerfile*
docker-compose*
.docker

# Documentation
README.md
docs
`,
        language: "plaintext"
      });
    }
    if (!fileMap.has(".github/workflows/ci.yml")) {
      fileMap.set(".github/workflows/ci.yml", {
        path: ".github/workflows/ci.yml",
        content: `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint --if-present
      
      - name: Run type check
        run: npm run type-check --if-present
      
      - name: Run tests
        run: npm test --if-present
      
      - name: Build
        run: npm run build
        env:
          DATABASE_URL: "postgresql://test:test@localhost:5432/test"

  build-docker:
    runs-on: ubuntu-latest
    needs: lint-and-test
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Build Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          tags: app:test
          cache-from: type=gha
          cache-to: type=gha,mode=max
`,
        language: "yaml"
      });
    }
    if (!fileMap.has(".github/workflows/deploy.yml")) {
      fileMap.set(".github/workflows/deploy.yml", {
        path: ".github/workflows/deploy.yml",
        content: `name: Deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: \${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    outputs:
      image_tag: \${{ steps.meta.outputs.tags }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=
            type=raw,value=latest,enable={{is_default_branch}}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Deploy to production
        run: |
          echo "🚀 Deploying image: \${{ needs.build-and-push.outputs.image_tag }}"
          # Add your deployment steps here:
          # - kubectl set image deployment/app app=$IMAGE
          # - ssh server "docker pull $IMAGE && docker-compose up -d"
          # - Use Vercel/Railway/Fly.io CLI
`,
        language: "yaml"
      });
    }
    if (!fileMap.has("app/api/health/route.ts")) {
      fileMap.set("app/api/health/route.ts", {
        path: "app/api/health/route.ts",
        content: `import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
`,
        language: "typescript"
      });
    }
    if (includeK8s) {
      if (!fileMap.has("k8s/deployment.yaml")) {
        fileMap.set("k8s/deployment.yaml", {
          path: "k8s/deployment.yaml",
          content: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  labels:
    app: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: app
          image: ghcr.io/username/app:latest
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: app-secrets
            - configMapRef:
                name: app-config
          resources:
            requests:
              memory: "256Mi"
              cpu: "200m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
`,
          language: "yaml"
        });
      }
      if (!fileMap.has("k8s/service.yaml")) {
        fileMap.set("k8s/service.yaml", {
          path: "k8s/service.yaml",
          content: `apiVersion: v1
kind: Service
metadata:
  name: app-service
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
`,
          language: "yaml"
        });
      }
      if (!fileMap.has("k8s/ingress.yaml")) {
        fileMap.set("k8s/ingress.yaml", {
          path: "k8s/ingress.yaml",
          content: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-service
                port:
                  number: 80
`,
          language: "yaml"
        });
      }
    }
    return Array.from(fileMap.values());
  }
};
var infrastructureGenerator = new InfrastructureGenerator();

// src/lib/generation/enhanced-prompt-classifier.ts
init_esm();
var SAAS_KEYWORDS = [
  "saas",
  "subscription",
  "billing",
  "pricing",
  "plans",
  "free trial",
  "pro plan",
  "enterprise",
  "tier",
  "monthly",
  "yearly",
  "annual",
  "recurring",
  "checkout",
  "payment",
  "stripe",
  "paywall",
  "upgrade",
  "downgrade",
  "cancel subscription",
  "team",
  "workspace",
  "organization",
  "tenant",
  "admin dashboard",
  "admin panel",
  "user management",
  "invite users",
  "roles",
  "permissions",
  "analytics dashboard",
  "usage tracking",
  "onboarding",
  "customer portal"
];
var API_KEYWORDS = [
  "api",
  "rest api",
  "graphql",
  "endpoint",
  "microservice",
  "backend only",
  "no frontend",
  "headless",
  "api-first",
  "api gateway",
  "webhook",
  "api key",
  "rate limiting",
  "openapi",
  "swagger",
  "documentation"
];
var INFRASTRUCTURE_KEYWORDS = [
  "docker",
  "dockerfile",
  "container",
  "kubernetes",
  "k8s",
  "helm",
  "ci/cd",
  "pipeline",
  "github actions",
  "gitlab ci",
  "deploy",
  "deployment",
  "production",
  "terraform",
  "pulumi",
  "infrastructure as code",
  "nginx",
  "reverse proxy",
  "load balancer",
  "scaling",
  "auto-scaling",
  "horizontal scaling",
  "monitoring",
  "logging",
  "observability",
  "aws",
  "gcp",
  "azure",
  "cloud"
];
var BILLING_PATTERNS = [
  /subscription\s*(management|billing|plan)/i,
  /payment\s*(integration|processing|gateway)/i,
  /stripe\s*(integration|checkout|billing)/i,
  /pricing\s*(page|tier|plan)/i,
  /(monthly|yearly|annual)\s*(subscription|billing|payment)/i,
  /free\s*(trial|tier|plan)/i,
  /upgrade.*plan/i,
  /billing\s*(portal|dashboard|management)/i,
  /checkout\s*(flow|page|session)/i,
  /customer\s*portal/i
];
var MULTI_TENANT_PATTERNS = [
  /multi.?tenant/i,
  /workspace.*team/i,
  /organization.*member/i,
  /team\s*(management|invite|member)/i,
  /tenant\s*(isolation|management)/i,
  /white.?label/i,
  /b2b\s*saas/i,
  /enterprise.*customer/i
];
var ADMIN_PATTERNS = [
  /admin\s*(dashboard|panel|portal)/i,
  /user\s*management/i,
  /role.*permission/i,
  /super.?admin/i,
  /back.?office/i,
  /cms|content\s*management/i,
  /analytics\s*(dashboard|reporting)/i
];
function enhancedClassifyPrompt(prompt) {
  const text = prompt.toLowerCase();
  const features = {
    hasUI: detectUIIndicators(text),
    hasWorkflow: detectWorkflowIndicators(text),
    hasAgents: detectAgentIndicators(text),
    hasTriggers: detectTriggerPatterns(text),
    hasIntegrations: detectIntegrations(text),
    hasAutonomy: detectAutonomy(text),
    // New detections
    hasBilling: detectBillingFeatures(text),
    hasSubscriptions: detectSubscriptionFeatures(text),
    hasMultiTenancy: detectMultiTenancy(text),
    hasUserManagement: detectUserManagement(text),
    hasAdminDashboard: detectAdminFeatures(text),
    hasAPI: detectAPIFeatures(text),
    needsDatabase: detectDatabaseNeeds(text),
    needsAuth: detectAuthNeeds(text),
    needsInfrastructure: detectInfrastructureNeeds(text),
    needsDocker: detectDockerNeeds(text),
    needsK8s: detectK8sNeeds(text),
    needsCI: detectCINeeds(text)
  };
  const saasScore = calculateSaaSScore(text, features);
  const apiScore = calculateAPIScore(text, features);
  const infraScore = calculateInfraScore(text, features);
  const workflowScore = calculateWorkflowScore(text, features);
  const agentScore = calculateAgentScore(text, features);
  const uiScore = calculateUIScore(text, features);
  const { primaryType, confidence, reasoning } = determineEnhancedType(
    saasScore,
    apiScore,
    infraScore,
    workflowScore,
    agentScore,
    uiScore,
    features
  );
  const suggestedGenerators = getSuggestedGenerators(primaryType, features);
  const suggestedTechStack = getEnhancedTechStack(primaryType, features);
  return {
    primaryType,
    confidence,
    detectedFeatures: features,
    suggestedTechStack,
    suggestedGenerators,
    reasoning
  };
}
__name(enhancedClassifyPrompt, "enhancedClassifyPrompt");
function detectUIIndicators(text) {
  const uiWords = [
    "app",
    "application",
    "website",
    "dashboard",
    "ui",
    "interface",
    "page",
    "form",
    "button",
    "display",
    "view",
    "frontend"
  ];
  return uiWords.some((w) => text.includes(w));
}
__name(detectUIIndicators, "detectUIIndicators");
function detectWorkflowIndicators(text) {
  const workflowWords = [
    "workflow",
    "automation",
    "automate",
    "trigger",
    "schedule",
    "cron",
    "webhook",
    "pipeline",
    "when",
    "then"
  ];
  return workflowWords.some((w) => text.includes(w));
}
__name(detectWorkflowIndicators, "detectWorkflowIndicators");
function detectAgentIndicators(text) {
  const agentWords = [
    "agent",
    "ai agent",
    "autonomous",
    "multi-agent",
    "langchain",
    "langgraph",
    "crewai"
  ];
  return agentWords.some((w) => text.includes(w));
}
__name(detectAgentIndicators, "detectAgentIndicators");
function detectTriggerPatterns(text) {
  const patterns = [
    /when\s+(.+)\s+(then|do|send)/i,
    /every\s+(hour|day|week|month)/i,
    /on\s+(new|updated|created)/i
  ];
  return patterns.some((p) => p.test(text));
}
__name(detectTriggerPatterns, "detectTriggerPatterns");
function detectIntegrations(text) {
  const integrations = [
    "slack",
    "stripe",
    "github",
    "twilio",
    "sendgrid",
    "mailchimp",
    "hubspot",
    "salesforce",
    "shopify"
  ];
  return integrations.some((i) => text.includes(i));
}
__name(detectIntegrations, "detectIntegrations");
function detectAutonomy(text) {
  const autonomyWords = [
    "automatically",
    "autonomously",
    "on its own",
    "self-improving",
    "learning"
  ];
  return autonomyWords.some((w) => text.includes(w));
}
__name(detectAutonomy, "detectAutonomy");
function detectBillingFeatures(text) {
  return BILLING_PATTERNS.some((p) => p.test(text)) || SAAS_KEYWORDS.filter((k) => k.includes("billing") || k.includes("payment") || k.includes("stripe")).some((k) => text.includes(k));
}
__name(detectBillingFeatures, "detectBillingFeatures");
function detectSubscriptionFeatures(text) {
  return text.includes("subscription") || text.includes("recurring") || text.includes("monthly") || text.includes("yearly") || /pricing\s*(plan|tier)/i.test(text);
}
__name(detectSubscriptionFeatures, "detectSubscriptionFeatures");
function detectMultiTenancy(text) {
  return MULTI_TENANT_PATTERNS.some((p) => p.test(text));
}
__name(detectMultiTenancy, "detectMultiTenancy");
function detectUserManagement(text) {
  return text.includes("user management") || text.includes("invite user") || text.includes("role") || /permission.*system/i.test(text);
}
__name(detectUserManagement, "detectUserManagement");
function detectAdminFeatures(text) {
  return ADMIN_PATTERNS.some((p) => p.test(text));
}
__name(detectAdminFeatures, "detectAdminFeatures");
function detectAPIFeatures(text) {
  return API_KEYWORDS.some((k) => text.includes(k));
}
__name(detectAPIFeatures, "detectAPIFeatures");
function detectDatabaseNeeds(text) {
  return text.includes("database") || text.includes("store") || text.includes("save") || text.includes("persist") || text.includes("user") || text.includes("data");
}
__name(detectDatabaseNeeds, "detectDatabaseNeeds");
function detectAuthNeeds(text) {
  return text.includes("auth") || text.includes("login") || text.includes("signup") || text.includes("sign in") || text.includes("user") || text.includes("account");
}
__name(detectAuthNeeds, "detectAuthNeeds");
function detectInfrastructureNeeds(text) {
  return INFRASTRUCTURE_KEYWORDS.some((k) => text.includes(k));
}
__name(detectInfrastructureNeeds, "detectInfrastructureNeeds");
function detectDockerNeeds(text) {
  return text.includes("docker") || text.includes("container") || text.includes("deploy");
}
__name(detectDockerNeeds, "detectDockerNeeds");
function detectK8sNeeds(text) {
  return text.includes("kubernetes") || text.includes("k8s") || text.includes("helm") || text.includes("cluster");
}
__name(detectK8sNeeds, "detectK8sNeeds");
function detectCINeeds(text) {
  return text.includes("ci/cd") || text.includes("pipeline") || text.includes("github actions") || text.includes("continuous");
}
__name(detectCINeeds, "detectCINeeds");
function calculateSaaSScore(text, features) {
  let score = 0;
  SAAS_KEYWORDS.forEach((keyword) => {
    if (text.includes(keyword)) score += 2;
  });
  BILLING_PATTERNS.forEach((pattern) => {
    if (pattern.test(text)) score += 3;
  });
  if (features.hasBilling) score += 5;
  if (features.hasSubscriptions) score += 5;
  if (features.hasMultiTenancy) score += 4;
  if (features.hasUserManagement) score += 3;
  if (features.hasAdminDashboard) score += 3;
  if (features.needsAuth) score += 2;
  return score;
}
__name(calculateSaaSScore, "calculateSaaSScore");
function calculateAPIScore(text, features) {
  let score = 0;
  API_KEYWORDS.forEach((keyword) => {
    if (text.includes(keyword)) score += 2;
  });
  if (text.includes("api only") || text.includes("backend only") || text.includes("headless")) {
    score += 5;
  }
  if (features.hasAPI && !features.hasUI) score += 5;
  return score;
}
__name(calculateAPIScore, "calculateAPIScore");
function calculateInfraScore(text, features) {
  let score = 0;
  INFRASTRUCTURE_KEYWORDS.forEach((keyword) => {
    if (text.includes(keyword)) score += 2;
  });
  if (features.needsDocker) score += 3;
  if (features.needsK8s) score += 4;
  if (features.needsCI) score += 3;
  if (features.needsInfrastructure && !features.hasUI && !features.hasAPI) {
    score += 5;
  }
  return score;
}
__name(calculateInfraScore, "calculateInfraScore");
function calculateWorkflowScore(text, features) {
  let score = 0;
  if (features.hasWorkflow) score += 5;
  if (features.hasTriggers) score += 4;
  if (features.hasIntegrations) score += 2;
  return score;
}
__name(calculateWorkflowScore, "calculateWorkflowScore");
function calculateAgentScore(text, features) {
  let score = 0;
  if (features.hasAgents) score += 5;
  if (features.hasAutonomy) score += 4;
  return score;
}
__name(calculateAgentScore, "calculateAgentScore");
function calculateUIScore(text, features) {
  let score = 0;
  if (features.hasUI) score += 3;
  return score;
}
__name(calculateUIScore, "calculateUIScore");
function determineEnhancedType(saasScore, apiScore, infraScore, workflowScore, agentScore, uiScore, features) {
  if (saasScore >= 10 || features.hasBilling && features.hasSubscriptions) {
    if (features.needsInfrastructure || features.needsDocker) {
      return {
        primaryType: "full-stack-saas",
        confidence: Math.min(0.95, 0.7 + saasScore * 0.02),
        reasoning: `Complete SaaS + Infrastructure: billing (${features.hasBilling}), subscriptions (${features.hasSubscriptions}), infrastructure (${features.needsInfrastructure})`
      };
    }
    return {
      primaryType: "full-saas",
      confidence: Math.min(0.95, 0.7 + saasScore * 0.02),
      reasoning: `SaaS indicators: billing (${features.hasBilling}), subscriptions (${features.hasSubscriptions}), user mgmt (${features.hasUserManagement})`
    };
  }
  if (apiScore >= 8 && !features.hasUI) {
    return {
      primaryType: "api-backend",
      confidence: 0.85,
      reasoning: "API-only backend detected, no UI requirements"
    };
  }
  if (infraScore >= 8 && !features.hasUI && !saasScore) {
    return {
      primaryType: "infrastructure",
      confidence: 0.85,
      reasoning: "Infrastructure/DevOps configuration requested"
    };
  }
  if (agentScore >= 5) {
    if (features.hasUI) {
      return {
        primaryType: "hybrid-agent-ui",
        confidence: 0.8,
        reasoning: "AI agent system with UI"
      };
    }
    return {
      primaryType: "ai-agent-network",
      confidence: 0.85,
      reasoning: "Multi-agent AI system"
    };
  }
  if (workflowScore >= 5) {
    if (features.hasUI) {
      return {
        primaryType: "hybrid-workflow-ui",
        confidence: 0.8,
        reasoning: "Workflow automation with UI"
      };
    }
    return {
      primaryType: "workflow-automation",
      confidence: 0.85,
      reasoning: "Workflow automation system"
    };
  }
  return {
    primaryType: "ui-application",
    confidence: 0.7,
    reasoning: "Standard UI application"
  };
}
__name(determineEnhancedType, "determineEnhancedType");
function getSuggestedGenerators(type, features) {
  const generators = [];
  switch (type) {
    case "full-stack-saas":
      generators.push("saas-generator");
      generators.push("infrastructure-generator");
      break;
    case "full-saas":
      generators.push("saas-generator");
      if (features.needsInfrastructure) generators.push("infrastructure-generator");
      break;
    case "api-backend":
      generators.push("api-generator");
      if (features.needsInfrastructure) generators.push("infrastructure-generator");
      break;
    case "infrastructure":
      generators.push("infrastructure-generator");
      break;
    case "workflow-automation":
    case "hybrid-workflow-ui":
      generators.push("workflow-generator");
      if (features.needsInfrastructure) generators.push("infrastructure-generator");
      break;
    case "ai-agent-network":
    case "hybrid-agent-ui":
      generators.push("agent-generator");
      if (features.needsInfrastructure) generators.push("infrastructure-generator");
      break;
    case "ui-application":
    default:
      generators.push("bolt-generator");
      if (features.needsInfrastructure) generators.push("infrastructure-generator");
      break;
  }
  return generators;
}
__name(getSuggestedGenerators, "getSuggestedGenerators");
function getEnhancedTechStack(type, features) {
  const baseStack = ["Next.js 14", "TypeScript", "Tailwind CSS"];
  switch (type) {
    case "full-stack-saas":
    case "full-saas":
      return [
        ...baseStack,
        "NextAuth.js (authentication)",
        "Prisma (database ORM)",
        "PostgreSQL (database)",
        "Stripe (payments)",
        features.needsDocker ? "Docker" : "",
        features.needsK8s ? "Kubernetes" : "",
        features.needsCI ? "GitHub Actions" : ""
      ].filter(Boolean);
    case "api-backend":
      return [
        "Next.js 14 API Routes",
        "TypeScript",
        "Prisma (database ORM)",
        "PostgreSQL",
        "Zod (validation)",
        features.needsDocker ? "Docker" : ""
      ].filter(Boolean);
    case "infrastructure":
      return [
        "Docker",
        features.needsK8s ? "Kubernetes" : "",
        "GitHub Actions",
        "Nginx"
      ].filter(Boolean);
    case "workflow-automation":
    case "hybrid-workflow-ui":
      return [
        ...baseStack,
        "Inngest (workflow engine)",
        "Prisma (database)",
        features.hasIntegrations ? "Integration SDKs" : ""
      ].filter(Boolean);
    case "ai-agent-network":
    case "hybrid-agent-ui":
      return [
        ...baseStack,
        "LangChain.js",
        "LangGraph",
        "AI SDK (Vercel)",
        "OpenAI/Anthropic API"
      ].filter(Boolean);
    case "ui-application":
    default:
      return [
        ...baseStack,
        features.needsDatabase ? "Prisma" : "",
        features.needsAuth ? "NextAuth.js" : ""
      ].filter(Boolean);
  }
}
__name(getEnhancedTechStack, "getEnhancedTechStack");

// src/trigger/enhanced-unified-generate.ts
async function executeEnhancedGeneration(payload) {
  const { jobId, forceType, includeInfrastructure, includeK8s } = payload;
  logger.info("Starting enhanced unified generation", { jobId, forceType });
  try {
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId }
    });
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "RUNNING",
        generationStartedAt: /* @__PURE__ */ new Date()
      }
    });
    const classification = enhancedClassifyPrompt(job.prompt);
    const generationType = forceType || classification.primaryType;
    logger.info("Classification result", {
      type: generationType,
      confidence: classification.confidence,
      features: classification.detectedFeatures
    });
    const saasGenerator = new SaaSGenerator();
    const apiGenerator2 = new APIGenerator();
    const infraGenerator = new InfrastructureGenerator();
    const boltGenerator = new BoltGenerator();
    const workflowGenerator = new WorkflowGenerator();
    const agentGenerator = new AgentGenerator();
    let files = [];
    const callbacks = {
      onProgress: /* @__PURE__ */ __name((msg) => logger.info(msg), "onProgress"),
      onFileComplete: /* @__PURE__ */ __name((path) => logger.info(`Generated: ${path}`), "onFileComplete"),
      onError: /* @__PURE__ */ __name((err) => logger.error(err), "onError")
    };
    switch (generationType) {
      case "full-stack-saas":
        logger.info("Generating Full-Stack SaaS (SaaS + Infrastructure)");
        const saasResult = await saasGenerator.generate(job.prompt, jobId, callbacks);
        files = saasResult.files;
        const infraResult = await infraGenerator.generate(
          job.prompt,
          void 0,
          callbacks,
          { includeK8s }
        );
        files = [...files, ...infraResult.files];
        break;
      case "full-saas":
        logger.info("Generating Full SaaS");
        const saasOnlyResult = await saasGenerator.generate(job.prompt, jobId, callbacks);
        files = saasOnlyResult.files;
        if (includeInfrastructure) {
          const infraAddResult = await infraGenerator.generate(
            job.prompt,
            void 0,
            callbacks,
            { includeK8s }
          );
          files = [...files, ...infraAddResult.files];
        }
        break;
      case "api-backend":
        logger.info("Generating API Backend");
        const apiResult = await apiGenerator2.generate(job.prompt, jobId, callbacks);
        files = apiResult.files;
        if (includeInfrastructure) {
          const infraApiResult = await infraGenerator.generate(
            job.prompt,
            void 0,
            callbacks,
            { includeK8s }
          );
          files = [...files, ...infraApiResult.files];
        }
        break;
      case "infrastructure":
        logger.info("Generating Infrastructure Only");
        const infraOnlyResult = await infraGenerator.generate(
          job.prompt,
          jobId,
          callbacks,
          { includeK8s }
        );
        files = infraOnlyResult.files;
        break;
      case "workflow-automation":
      case "hybrid-workflow-ui":
        logger.info("Generating Workflow");
        const workflowResult = await workflowGenerator.generate(job.prompt, jobId, callbacks);
        files = workflowResult.files;
        if (includeInfrastructure) {
          const infraWfResult = await infraGenerator.generate(
            job.prompt,
            void 0,
            callbacks,
            { includeK8s }
          );
          files = [...files, ...infraWfResult.files];
        }
        break;
      case "ai-agent-network":
      case "hybrid-agent-ui":
        logger.info("Generating AI Agent Network");
        const agentResult = await agentGenerator.generate(job.prompt, jobId, callbacks);
        files = agentResult.files;
        if (includeInfrastructure) {
          const infraAgentResult = await infraGenerator.generate(
            job.prompt,
            void 0,
            callbacks,
            { includeK8s }
          );
          files = [...files, ...infraAgentResult.files];
        }
        break;
      case "ui-application":
      default:
        logger.info("Generating UI Application");
        const uiResult = await boltGenerator.generate(job.prompt, jobId, callbacks);
        files = uiResult.files;
        if (includeInfrastructure) {
          const infraUiResult = await infraGenerator.generate(
            job.prompt,
            void 0,
            callbacks,
            { includeK8s }
          );
          files = [...files, ...infraUiResult.files];
        }
        break;
    }
    const fileMap = new Map(files.map((f) => [f.path, f]));
    const uniqueFiles = Array.from(fileMap.values());
    logger.info(`Saving ${uniqueFiles.length} files to database`);
    await prisma.$transaction(
      uniqueFiles.map(
        (file) => prisma.generatedFile.upsert({
          where: {
            generationJobId_path: {
              generationJobId: jobId,
              path: file.path
            }
          },
          update: {
            content: file.content,
            language: file.language,
            size: file.content.length
          },
          create: {
            generationJobId: jobId,
            path: file.path,
            content: file.content,
            language: file.language,
            size: file.content.length
          }
        })
      )
    );
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        generationCompletedAt: /* @__PURE__ */ new Date(),
        totalModules: uniqueFiles.length,
        completedModules: uniqueFiles.length,
        blueprint: JSON.stringify({
          classification: generationType,
          confidence: classification.confidence,
          detectedFeatures: classification.detectedFeatures,
          suggestedTechStack: classification.suggestedTechStack,
          generatorsUsed: getGeneratorsUsed(generationType, includeInfrastructure),
          filesGenerated: uniqueFiles.length
        })
      }
    });
    logger.info("Generation completed successfully", {
      jobId,
      type: generationType,
      filesCount: uniqueFiles.length
    });
    return {
      success: true,
      jobId,
      type: generationType,
      filesCount: uniqueFiles.length
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Generation failed", { jobId, error: errorMessage });
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorLog: errorMessage
      }
    });
    throw error;
  }
}
__name(executeEnhancedGeneration, "executeEnhancedGeneration");
var enhancedUnifiedGenerationJob = task({
  id: "enhanced-unified-generation-job",
  maxDuration: 900,
  // 15 minutes
  run: /* @__PURE__ */ __name(async (payload) => {
    return executeEnhancedGeneration(payload);
  }, "run")
});
var saasGenerationJob = task({
  id: "saas-generation-job",
  maxDuration: 600,
  // 10 minutes
  run: /* @__PURE__ */ __name(async (payload) => {
    return executeEnhancedGeneration({
      ...payload,
      forceType: "full-saas"
    });
  }, "run")
});
var apiBackendGenerationJob = task({
  id: "api-backend-generation-job",
  maxDuration: 300,
  // 5 minutes
  run: /* @__PURE__ */ __name(async (payload) => {
    return executeEnhancedGeneration({
      ...payload,
      forceType: "api-backend"
    });
  }, "run")
});
var infrastructureGenerationJob = task({
  id: "infrastructure-generation-job",
  maxDuration: 300,
  // 5 minutes
  run: /* @__PURE__ */ __name(async (payload) => {
    return executeEnhancedGeneration({
      ...payload,
      forceType: "infrastructure"
    });
  }, "run")
});
var fullStackSaasGenerationJob = task({
  id: "full-stack-saas-generation-job",
  maxDuration: 900,
  // 15 minutes
  run: /* @__PURE__ */ __name(async (payload) => {
    return executeEnhancedGeneration({
      ...payload,
      forceType: "full-stack-saas",
      includeInfrastructure: true
    });
  }, "run")
});
function getGeneratorsUsed(type, includeInfra) {
  const generators = [];
  switch (type) {
    case "full-stack-saas":
      generators.push("saas-generator", "infrastructure-generator");
      break;
    case "full-saas":
      generators.push("saas-generator");
      break;
    case "api-backend":
      generators.push("api-generator");
      break;
    case "infrastructure":
      generators.push("infrastructure-generator");
      break;
    case "workflow-automation":
    case "hybrid-workflow-ui":
      generators.push("workflow-generator");
      break;
    case "ai-agent-network":
    case "hybrid-agent-ui":
      generators.push("agent-generator");
      break;
    default:
      generators.push("bolt-generator");
  }
  if (includeInfra && !generators.includes("infrastructure-generator")) {
    generators.push("infrastructure-generator");
  }
  return generators;
}
__name(getGeneratorsUsed, "getGeneratorsUsed");
export {
  apiBackendGenerationJob,
  enhancedUnifiedGenerationJob,
  fullStackSaasGenerationJob,
  infrastructureGenerationJob,
  saasGenerationJob
};
//# sourceMappingURL=enhanced-unified-generate.mjs.map
