/**
 * Supabase Provisioner for Managed Infrastructure
 * 
 * File: src/lib/infrastructure/providers/supabase.ts
 * 
 * Handles Supabase database provisioning for generated apps:
 * - Creates new Supabase projects programmatically
 * - Waits for projects to become ready
 * - Retrieves API keys (anon, service_role)
 * - Runs database migrations from Prisma schemas
 * - Manages project lifecycle (create, delete, pause)
 * 
 * Uses the Supabase Management API:
 * https://supabase.com/docs/reference/api/introduction
 * 
 * Note: Requires SUPABASE_ACCESS_TOKEN (Personal Access Token)
 * Generate at: https://supabase.com/dashboard/account/tokens
 */

import { encrypt } from '@/lib/encryption';

// ============================================================================
// TYPES
// ============================================================================

export interface SupabaseProject {
  id: string;
  organization_id: string;
  name: string;
  region: string;
  created_at: string;
  database: {
    host: string;
    version: string;
  };
  status: SupabaseProjectStatus;
}

export type SupabaseProjectStatus = 
  | 'ACTIVE_HEALTHY'
  | 'ACTIVE_UNHEALTHY'
  | 'COMING_UP'
  | 'GOING_DOWN'
  | 'INACTIVE'
  | 'INIT_FAILED'
  | 'REMOVED'
  | 'RESTARTING'
  | 'UNKNOWN'
  | 'UPGRADING'
  | 'PAUSING'
  | 'RESTORING';

export interface CreateProjectParams {
  name: string;
  organizationId: string;
  region?: string;
  dbPassword: string;
  plan?: 'free' | 'pro';
}

export interface CreateProjectResult {
  projectId: string;
  projectRef: string;
  projectUrl: string;
  dbHost: string;
  dbPassword: string;
  anonKey: string;
  serviceRoleKey: string;
  jwtSecret: string;
}

export interface SupabaseApiKeys {
  anon_key: string;
  service_role_key: string;
}

export interface MigrationResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SUPABASE_API_URL = 'https://api.supabase.com';

// Available regions for Supabase projects
export const SUPABASE_REGIONS = {
  'us-east-1': 'US East (N. Virginia)',
  'us-west-1': 'US West (N. California)',
  'eu-west-1': 'Europe (Ireland)',
  'eu-west-2': 'Europe (London)',
  'eu-central-1': 'Europe (Frankfurt)',
  'ap-southeast-1': 'Asia Pacific (Singapore)',
  'ap-southeast-2': 'Asia Pacific (Sydney)',
  'ap-northeast-1': 'Asia Pacific (Tokyo)',
  'ap-south-1': 'Asia Pacific (Mumbai)',
  'sa-east-1': 'South America (São Paulo)',
} as const;

export type SupabaseRegion = keyof typeof SUPABASE_REGIONS;

// Default region
const DEFAULT_REGION: SupabaseRegion = 'us-east-1';

// Polling configuration
const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 60; // 5 minutes max wait

// ============================================================================
// SUPABASE PROVISIONER CLASS
// ============================================================================

export class SupabaseProvisioner {
  private accessToken: string | null;
  private organizationId: string | null;
  private simulationMode: boolean;

  constructor() {
    this.simulationMode = process.env.SIMULATE_INFRASTRUCTURE === 'true';

    if (this.simulationMode) {
      console.log('🎭 [SUPABASE] Running in simulation mode - no real Supabase calls');
      this.accessToken = null;
      this.organizationId = null;
      return;
    }

    const token = process.env.SUPABASE_ACCESS_TOKEN;
    const orgId = process.env.SUPABASE_ORG_ID;

    if (!token) {
      console.warn('⚠️ SUPABASE_ACCESS_TOKEN not set - enabling simulation mode');
      this.simulationMode = true;
      this.accessToken = null;
      this.organizationId = null;
      return;
    }

    if (!orgId) {
      console.warn('⚠️ SUPABASE_ORG_ID not set - enabling simulation mode');
      this.simulationMode = true;
      this.accessToken = null;
      this.organizationId = null;
      return;
    }

    this.accessToken = token;
    this.organizationId = orgId;
  }

  // ==========================================================================
  // API REQUEST HELPERS
  // ==========================================================================

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${SUPABASE_API_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage: string;
      
      try {
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.message || errorJson.error || errorBody;
      } catch {
        errorMessage = errorBody;
      }
      
      throw new Error(
        `Supabase API error (${response.status}): ${errorMessage}`
      );
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text);
  }

  // ==========================================================================
  // PROJECT MANAGEMENT
  // ==========================================================================

  /**
   * Create a new Supabase project
   */
  async createProject(params: CreateProjectParams): Promise<CreateProjectResult> {
    const {
      name,
      organizationId = this.organizationId,
      region = DEFAULT_REGION,
      dbPassword,
      plan = 'free',
    } = params;

    console.log(`🗄️ Creating Supabase project: ${name}`);
    console.log(`   Region: ${SUPABASE_REGIONS[region as SupabaseRegion] || region}`);

    // Create the project
    const project = await this.request<SupabaseProject>('/v1/projects', {
      method: 'POST',
      body: JSON.stringify({
        name,
        organization_id: organizationId,
        region,
        db_pass: dbPassword,
        plan,
      }),
    });

    console.log(`   Project created: ${project.id}`);
    console.log(`   Waiting for project to become ready...`);

    // Wait for the project to be ready
    await this.waitForProjectReady(project.id);

    // Get API keys
    const keys = await this.getApiKeys(project.id);

    // Construct the result
    const projectUrl = `https://${project.id}.supabase.co`;

    console.log(`✅ Supabase project ready: ${projectUrl}`);

    return {
      projectId: project.id,
      projectRef: project.id,
      projectUrl,
      dbHost: project.database?.host || `db.${project.id}.supabase.co`,
      dbPassword,
      anonKey: keys.anon_key,
      serviceRoleKey: keys.service_role_key,
      jwtSecret: '', // JWT secret is not exposed via API
    };
  }

  /**
   * Wait for a project to become ACTIVE_HEALTHY
   */
  async waitForProjectReady(
    projectId: string,
    maxAttempts: number = MAX_POLL_ATTEMPTS
  ): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const project = await this.getProject(projectId);
      
      console.log(`   Status: ${project.status} (attempt ${attempt + 1}/${maxAttempts})`);

      if (project.status === 'ACTIVE_HEALTHY') {
        return;
      }

      if (project.status === 'INIT_FAILED' || project.status === 'REMOVED') {
        throw new Error(`Project initialization failed: ${project.status}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    throw new Error(
      `Timeout waiting for project ${projectId} to become ready. ` +
      `Max attempts (${maxAttempts}) exceeded.`
    );
  }

  /**
   * Get a project by ID
   */
  async getProject(projectId: string): Promise<SupabaseProject> {
    return this.request<SupabaseProject>(`/v1/projects/${projectId}`);
  }

  /**
   * List all projects in the organization
   */
  async listProjects(): Promise<SupabaseProject[]> {
    return this.request<SupabaseProject[]>('/v1/projects');
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<void> {
    console.log(`🗑️ Deleting Supabase project: ${projectId}`);
    
    await this.request(`/v1/projects/${projectId}`, {
      method: 'DELETE',
    });

    console.log(`✅ Project deleted: ${projectId}`);
  }

  /**
   * Pause a project (free tier only)
   */
  async pauseProject(projectId: string): Promise<void> {
    console.log(`⏸️ Pausing Supabase project: ${projectId}`);
    
    await this.request(`/v1/projects/${projectId}/pause`, {
      method: 'POST',
    });

    console.log(`✅ Project paused: ${projectId}`);
  }

  /**
   * Resume a paused project
   */
  async resumeProject(projectId: string): Promise<void> {
    console.log(`▶️ Resuming Supabase project: ${projectId}`);
    
    await this.request(`/v1/projects/${projectId}/restore`, {
      method: 'POST',
    });

    // Wait for it to become ready
    await this.waitForProjectReady(projectId);

    console.log(`✅ Project resumed: ${projectId}`);
  }

  // ==========================================================================
  // API KEYS
  // ==========================================================================

  /**
   * Get API keys for a project
   */
  async getApiKeys(projectId: string): Promise<SupabaseApiKeys> {
    interface ApiKeyResponse {
      name: string;
      api_key: string;
    }

    const keys = await this.request<ApiKeyResponse[]>(
      `/v1/projects/${projectId}/api-keys`
    );

    const anonKey = keys.find(k => k.name === 'anon')?.api_key;
    const serviceRoleKey = keys.find(k => k.name === 'service_role')?.api_key;

    if (!anonKey || !serviceRoleKey) {
      throw new Error('Could not retrieve API keys');
    }

    return {
      anon_key: anonKey,
      service_role_key: serviceRoleKey,
    };
  }

  // ==========================================================================
  // DATABASE OPERATIONS
  // ==========================================================================

  /**
   * Run SQL migrations on a project
   */
  async runMigrations(
    projectId: string,
    sql: string
  ): Promise<MigrationResult> {
    console.log(`📦 Running migrations on project: ${projectId}`);

    try {
      // Use the SQL query endpoint
      await this.request(`/v1/projects/${projectId}/database/query`, {
        method: 'POST',
        body: JSON.stringify({
          query: sql,
        }),
      });

      console.log(`✅ Migrations completed successfully`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Migration failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Convert Prisma schema to SQL
   * This is a simplified converter - for production use consider using prisma migrate
   */
  prismaToSQL(prismaSchema: string): string {
    const sql: string[] = [];
    const models: Map<string, { fields: string[]; indexes: string[] }> = new Map();

    // Parse models from Prisma schema
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = modelRegex.exec(prismaSchema)) !== null) {
      const modelName = match[1];
      const modelBody = match[2];
      const fields: string[] = [];
      const indexes: string[] = [];

      // Parse fields
      const fieldLines = modelBody.split('\n').filter(line => line.trim());
      
      for (const line of fieldLines) {
        const trimmedLine = line.trim();
        
        // Skip comments and decorators
        if (trimmedLine.startsWith('//') || trimmedLine.startsWith('@@')) {
          // Handle @@index and @@unique
          if (trimmedLine.startsWith('@@index')) {
            const indexMatch = trimmedLine.match(/@@index\(\[([^\]]+)\]\)/);
            if (indexMatch) {
              const indexFields = indexMatch[1].split(',').map(f => f.trim());
              indexes.push(
                `CREATE INDEX IF NOT EXISTS "${modelName.toLowerCase()}_${indexFields.join('_')}_idx" ` +
                `ON "${modelName}" (${indexFields.map(f => `"${f}"`).join(', ')});`
              );
            }
          }
          if (trimmedLine.startsWith('@@unique')) {
            const uniqueMatch = trimmedLine.match(/@@unique\(\[([^\]]+)\]\)/);
            if (uniqueMatch) {
              const uniqueFields = uniqueMatch[1].split(',').map(f => f.trim());
              indexes.push(
                `ALTER TABLE "${modelName}" ADD CONSTRAINT "${modelName.toLowerCase()}_${uniqueFields.join('_')}_key" ` +
                `UNIQUE (${uniqueFields.map(f => `"${f}"`).join(', ')});`
              );
            }
          }
          continue;
        }

        // Parse field definition
        const fieldMatch = trimmedLine.match(/^(\w+)\s+(\w+)(\?)?(\[\])?\s*(.*)?$/);
        if (!fieldMatch) continue;

        const [, fieldName, fieldType, optional, isArray, attributes] = fieldMatch;

        // Skip relation fields
        if (attributes?.includes('@relation')) continue;

        // Map Prisma types to PostgreSQL types
        let pgType = this.mapPrismaType(fieldType, isArray);
        let constraints = optional ? '' : ' NOT NULL';

        // Handle attributes
        if (attributes) {
          if (attributes.includes('@id')) {
            constraints += ' PRIMARY KEY';
          }
          if (attributes.includes('@unique')) {
            constraints += ' UNIQUE';
          }
          if (attributes.includes('@default(cuid())') || attributes.includes('@default(uuid())')) {
            pgType = 'TEXT';
            constraints += ` DEFAULT gen_random_uuid()::text`;
          } else if (attributes.includes('@default(now())')) {
            constraints += ' DEFAULT CURRENT_TIMESTAMP';
          } else if (attributes.includes('@default(autoincrement())')) {
            pgType = 'SERIAL';
            constraints = constraints.replace(' NOT NULL', '');
          } else if (attributes.includes('@default(')) {
            const defaultMatch = attributes.match(/@default\(([^)]+)\)/);
            if (defaultMatch) {
              let defaultValue = defaultMatch[1];
              // Handle boolean and numeric defaults
              if (defaultValue === 'true') defaultValue = 'TRUE';
              else if (defaultValue === 'false') defaultValue = 'FALSE';
              else if (!isNaN(Number(defaultValue))) {
                // numeric, keep as is
              } else if (!defaultValue.startsWith("'")) {
                // Check if it's an enum value
                defaultValue = `'${defaultValue}'`;
              }
              constraints += ` DEFAULT ${defaultValue}`;
            }
          }
          if (attributes.includes('@updatedAt')) {
            constraints += ' DEFAULT CURRENT_TIMESTAMP';
          }
        }

        fields.push(`"${fieldName}" ${pgType}${constraints}`);
      }

      models.set(modelName, { fields, indexes });
    }

    // Parse enums
    const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
    while ((match = enumRegex.exec(prismaSchema)) !== null) {
      const enumName = match[1];
      const enumValues = match[2]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//'));
      
      sql.push(
        `CREATE TYPE "${enumName}" AS ENUM (${enumValues.map(v => `'${v}'`).join(', ')});`
      );
    }

    // Generate CREATE TABLE statements
    for (const [modelName, { fields, indexes }] of models) {
      if (fields.length > 0) {
        sql.push(`CREATE TABLE IF NOT EXISTS "${modelName}" (\n  ${fields.join(',\n  ')}\n);`);
        sql.push(...indexes);
      }
    }

    return sql.join('\n\n');
  }

  /**
   * Map Prisma type to PostgreSQL type
   */
  private mapPrismaType(prismaType: string, isArray?: string): string {
    const typeMap: Record<string, string> = {
      'String': 'TEXT',
      'Int': 'INTEGER',
      'Float': 'DOUBLE PRECISION',
      'Decimal': 'DECIMAL',
      'Boolean': 'BOOLEAN',
      'DateTime': 'TIMESTAMP WITH TIME ZONE',
      'Json': 'JSONB',
      'Bytes': 'BYTEA',
      'BigInt': 'BIGINT',
    };

    let pgType = typeMap[prismaType] || prismaType.toUpperCase();
    
    if (isArray) {
      pgType += '[]';
    }

    return pgType;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Generate a secure database password
   */
  static generatePassword(length: number = 32): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    const randomBytes = new Uint8Array(length);
    crypto.getRandomValues(randomBytes);
    
    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length];
    }
    
    return password;
  }

  /**
   * Build the DATABASE_URL for a Supabase project
   */
  static buildDatabaseUrl(params: {
    projectId: string;
    password: string;
    pooler?: boolean;
  }): string {
    const { projectId, password, pooler = true } = params;
    
    const host = pooler 
      ? `aws-0-us-east-1.pooler.supabase.com`
      : `db.${projectId}.supabase.co`;
    
    const port = pooler ? 6543 : 5432;
    
    return `postgresql://postgres.${projectId}:${password}@${host}:${port}/postgres`;
  }

  /**
   * Verify Supabase configuration
   */
  async verifyConfiguration(): Promise<{ valid: boolean; error?: string }> {
    try {
      // Try to list projects (simple API call)
      await this.listProjects();
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let supabaseProvisioner: SupabaseProvisioner | null = null;

export function getSupabaseProvisioner(): SupabaseProvisioner {
  if (!supabaseProvisioner) {
    supabaseProvisioner = new SupabaseProvisioner();
  }
  return supabaseProvisioner;
}

// ============================================================================
// ENVIRONMENT VARIABLE BUILDER
// ============================================================================

/**
 * Build Supabase environment variables for a managed project
 */
export function buildSupabaseEnvVars(params: {
  projectUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  dbPassword: string;
  projectId: string;
}): Record<string, string> {
  const { projectUrl, anonKey, serviceRoleKey, dbPassword, projectId } = params;

  // Build connection URLs
  const databaseUrl = SupabaseProvisioner.buildDatabaseUrl({
    projectId,
    password: dbPassword,
    pooler: true,
  });

  const directUrl = SupabaseProvisioner.buildDatabaseUrl({
    projectId,
    password: dbPassword,
    pooler: false,
  });

  return {
    NEXT_PUBLIC_SUPABASE_URL: projectUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: directUrl,
  };
}

// ============================================================================
// CREDENTIAL ENCRYPTION HELPER
// ============================================================================

/**
 * Encrypt Supabase credentials for database storage
 */
export function encryptSupabaseCredentials(params: {
  serviceRoleKey: string;
  dbPassword: string;
}): {
  encryptedServiceKey: string;
  encryptedDbPassword: string;
} {
  return {
    encryptedServiceKey: encrypt(params.serviceRoleKey),
    encryptedDbPassword: encrypt(params.dbPassword),
  };
}

// ============================================================================
// PRISMA SCHEMA EXTRACTOR
// ============================================================================

/**
 * Extract Prisma schema from generated files
 */
export function extractPrismaSchema(
  files: Array<{ path: string; content: string }>
): string | null {
  const prismaFile = files.find(f => 
    f.path === 'prisma/schema.prisma' || 
    f.path.endsWith('schema.prisma')
  );

  return prismaFile?.content || null;
}

/**
 * Generate a minimal Prisma schema if none exists
 */
export function generateMinimalPrismaSchema(appName: string): string {
  return `
// Prisma Schema for ${appName}
// Generated by AutoForge

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
}
`;
}