/**
 * Infrastructure/PaaS Generator
 * 
 * File: src/lib/generation/infrastructure-generator.ts
 * 
 * Generates deployment infrastructure including:
 * - Dockerfile and docker-compose.yml
 * - GitHub Actions CI/CD pipelines
 * - Kubernetes manifests (optional)
 * - Environment management
 * - Nginx configs
 * - Database setup scripts
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../prisma';
import { GeneratedFile, GenerationResult, StreamCallbacks } from './bolt-generator';

// ============================================================================
// INFRASTRUCTURE SYSTEM PROMPT
// ============================================================================

const INFRASTRUCTURE_SYSTEM_PROMPT = `You are an expert DevOps and infrastructure engineer. You create production-ready deployment configurations for applications.

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

function buildInfrastructureUserPrompt(userRequest: string, includeK8s: boolean = false): string {
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
${includeK8s ? '8. Kubernetes manifests (deployment, service, ingress, HPA)' : ''}

Make everything production-ready with proper security, caching, and best practices.

Start generating files now:`;
}

// ============================================================================
// INFRASTRUCTURE GENERATOR CLASS
// ============================================================================

export class InfrastructureGenerator {
  private client: Anthropic;
  
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  
  /**
   * Generate infrastructure files
   */
  async generate(
    prompt: string,
    jobId?: string,
    callbacks?: StreamCallbacks,
    options: { includeK8s?: boolean } = {}
  ): Promise<GenerationResult> {
    console.log('🏗️ Infrastructure generation starting...');
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
      
      callbacks?.onProgress?.('🏗️ Generating infrastructure configuration...');
      
      let responseText = '';
      
      const stream = this.client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 32000,
        temperature: 0.7,
        system: INFRASTRUCTURE_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: buildInfrastructureUserPrompt(prompt, options.includeK8s)
        }]
      });
      
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          responseText += event.delta.text;
        }
      }
      
      callbacks?.onProgress?.('📦 Parsing infrastructure files...');
      
      let files = this.parseFilesFromResponse(responseText);
      
      console.log(`   Parsed ${files.length} files from response`);
      
      // Ensure essential infrastructure files
      files = this.ensureEssentialInfraFiles(files, prompt, options.includeK8s);
      
      console.log('   Generated infrastructure files:');
      files.forEach((f: GeneratedFile) => {
        console.log(`   - ${f.path} (${f.content.length} chars)`);
        callbacks?.onFileComplete?.(f.path, f.content);
      });
      
      if (jobId) {
        callbacks?.onProgress?.('💾 Saving to database...');
        
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
      
      callbacks?.onProgress?.('✅ Infrastructure generated successfully!');
      
      return {
        success: true,
        files,
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Infrastructure generation failed:', errorMessage);
      
      callbacks?.onError?.(errorMessage);
      
      if (jobId) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            errorLog: errorMessage,
          }
        });
      }
      
      return {
        success: false,
        files: [],
        error: errorMessage,
      };
    }
  }
  
  /**
   * Generate infrastructure for an existing project
   */
  async generateForExistingProject(
    projectFiles: GeneratedFile[],
    jobId?: string,
    callbacks?: StreamCallbacks,
    options: { includeK8s?: boolean } = {}
  ): Promise<GenerationResult> {
    // Analyze existing project to understand its needs
    const hasDatabase = projectFiles.some(f => 
      f.path.includes('prisma') || 
      f.content.includes('DATABASE_URL') ||
      f.content.includes('@prisma/client')
    );
    
    const hasAuth = projectFiles.some(f =>
      f.content.includes('next-auth') ||
      f.content.includes('NextAuth')
    );
    
    const hasStripe = projectFiles.some(f =>
      f.content.includes('stripe') ||
      f.content.includes('STRIPE_')
    );
    
    const prompt = `A Next.js application with:
- ${hasDatabase ? 'PostgreSQL database with Prisma' : 'No database'}
- ${hasAuth ? 'NextAuth authentication' : 'No authentication'}
- ${hasStripe ? 'Stripe payment integration' : 'No payments'}
- Standard Next.js build process`;
    
    return this.generate(prompt, jobId, callbacks, options);
  }
  
  private parseFilesFromResponse(response: string): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const fileRegex = /<file\s+path=["']([^"']+)["']>([\s\S]*?)<\/file>/gi;
    
    let match;
    while ((match = fileRegex.exec(response)) !== null) {
      const path = match[1].trim();
      let content = match[2];
      
      content = content
        .replace(/^\n+/, '')
        .replace(/\n+$/, '')
        .trim();
      
      const language = this.detectLanguage(path);
      files.push({ path, content, language });
    }
    
    return files;
  }
  
  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const filename = path.split('/').pop()?.toLowerCase() || '';
    
    // Handle special filenames
    if (filename === 'dockerfile') return 'dockerfile';
    if (filename.endsWith('.yml') || filename.endsWith('.yaml')) return 'yaml';
    if (filename.endsWith('.sh')) return 'bash';
    if (filename.endsWith('.tf')) return 'hcl';
    
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'sh': 'bash',
      'tf': 'hcl',
      'conf': 'nginx',
      'env': 'plaintext',
    };
    return languageMap[ext] || 'plaintext';
  }
  
  private ensureEssentialInfraFiles(
    files: GeneratedFile[], 
    prompt: string,
    includeK8s?: boolean
  ): GeneratedFile[] {
    const fileMap = new Map(files.map(f => [f.path, f]));
    
    // Ensure Dockerfile
    if (!fileMap.has('Dockerfile')) {
      fileMap.set('Dockerfile', {
        path: 'Dockerfile',
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
        language: 'dockerfile'
      });
    }
    
    // Ensure docker-compose.yml
    if (!fileMap.has('docker-compose.yml')) {
      fileMap.set('docker-compose.yml', {
        path: 'docker-compose.yml',
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
        language: 'yaml'
      });
    }
    
    // Ensure .dockerignore
    if (!fileMap.has('.dockerignore')) {
      fileMap.set('.dockerignore', {
        path: '.dockerignore',
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
        language: 'plaintext'
      });
    }
    
    // Ensure GitHub Actions
    if (!fileMap.has('.github/workflows/ci.yml')) {
      fileMap.set('.github/workflows/ci.yml', {
        path: '.github/workflows/ci.yml',
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
        language: 'yaml'
      });
    }
    
    // Ensure deploy workflow
    if (!fileMap.has('.github/workflows/deploy.yml')) {
      fileMap.set('.github/workflows/deploy.yml', {
        path: '.github/workflows/deploy.yml',
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
          # - kubectl set image deployment/app app=\$IMAGE
          # - ssh server "docker pull \$IMAGE && docker-compose up -d"
          # - Use Vercel/Railway/Fly.io CLI
`,
        language: 'yaml'
      });
    }
    
    // Add health check API route
    if (!fileMap.has('app/api/health/route.ts')) {
      fileMap.set('app/api/health/route.ts', {
        path: 'app/api/health/route.ts',
        content: `import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
`,
        language: 'typescript'
      });
    }
    
    // Add Kubernetes files if requested
    if (includeK8s) {
      if (!fileMap.has('k8s/deployment.yaml')) {
        fileMap.set('k8s/deployment.yaml', {
          path: 'k8s/deployment.yaml',
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
          language: 'yaml'
        });
      }
      
      if (!fileMap.has('k8s/service.yaml')) {
        fileMap.set('k8s/service.yaml', {
          path: 'k8s/service.yaml',
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
          language: 'yaml'
        });
      }
      
      if (!fileMap.has('k8s/ingress.yaml')) {
        fileMap.set('k8s/ingress.yaml', {
          path: 'k8s/ingress.yaml',
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
          language: 'yaml'
        });
      }
    }
    
    return Array.from(fileMap.values());
  }
}

// Export singleton instance
export const infrastructureGenerator = new InfrastructureGenerator();