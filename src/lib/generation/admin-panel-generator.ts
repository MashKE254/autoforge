/**
 * ADMIN PANEL GENERATOR
 *
 * File: src/lib/generation/admin-panel-generator.ts
 *
 * Purpose:
 * - Auto-generate complete admin panel for any generated app
 * - Analyze Prisma schema → Generate CRUD interfaces
 * - NO CODE required from users - just click and manage data
 *
 * What This Generates:
 * 1. Dashboard page with analytics
 * 2. Data management pages (Airtable-style tables)
 * 3. Forms for adding/editing records
 * 4. User management interface
 * 5. Settings page
 * 6. Search/filter/export functionality
 *
 * This is the GAME CHANGER that makes AutoForge accessible to non-technical users.
 */

import Anthropic from '@anthropic-ai/sdk';
import { GeneratedFile } from './bolt-generator';

// ============================================================================
// TYPES
// ============================================================================

export interface PrismaModel {
  name: string;
  fields: PrismaField[];
  displayName: string; // User-friendly name
  icon: string; // Lucide icon name
}

export interface PrismaField {
  name: string;
  type: string; // String, Int, Boolean, DateTime, etc.
  isRequired: boolean;
  isUnique: boolean;
  isList: boolean;
  isRelation: boolean;
  relationTo?: string;
  defaultValue?: string;
}

export interface AdminPanelConfig {
  models: PrismaModel[];
  appName: string;
  primaryColor: string;
  enableAnalytics: boolean;
  enableExport: boolean;
  enableSearch: boolean;
}

export interface AdminPanelGenerationResult {
  success: boolean;
  files: GeneratedFile[];
  error?: string;
  generatedPages: string[];
}

// ============================================================================
// ADMIN PANEL GENERATOR CLASS
// ============================================================================

export class AdminPanelGenerator {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Generate complete admin panel from Prisma schema
   */
  async generate(
    prismaSchema: string,
    appName: string,
    existingFiles: GeneratedFile[] = []
  ): Promise<AdminPanelGenerationResult> {
    console.log('🎨 Generating admin panel...');

    try {
      // Step 1: Parse Prisma schema to extract models
      const models = await this.parsePrismaSchema(prismaSchema);
      console.log(`   → Found ${models.length} data models`);

      // Step 2: Generate admin panel configuration
      const config: AdminPanelConfig = {
        models,
        appName,
        primaryColor: '#3B82F6', // Blue
        enableAnalytics: true,
        enableExport: true,
        enableSearch: true,
      };

      const generatedFiles: GeneratedFile[] = [];

      // Step 3: Generate dashboard page
      console.log('   → Generating dashboard...');
      const dashboardFile = await this.generateDashboard(config);
      generatedFiles.push(dashboardFile);

      // Step 4: Generate data management pages for each model
      for (const model of models) {
        console.log(`   → Generating ${model.displayName} management page...`);

        // List page (table view)
        const listPage = await this.generateListPage(model, config);
        generatedFiles.push(listPage);

        // Create/Edit page (form)
        const formPage = await this.generateFormPage(model, config);
        generatedFiles.push(formPage);

        // API routes for CRUD operations
        const apiRoutes = await this.generateApiRoutes(model);
        generatedFiles.push(...apiRoutes);
      }

      // Step 5: Generate admin layout
      console.log('   → Generating admin layout...');
      const layoutFile = await this.generateAdminLayout(config);
      generatedFiles.push(layoutFile);

      // Step 6: Generate navigation component
      const navFile = await this.generateNavigation(config);
      generatedFiles.push(navFile);

      // Step 7: Generate settings page
      const settingsFile = await this.generateSettingsPage(config);
      generatedFiles.push(settingsFile);

      // Step 8: Generate reusable components
      const components = await this.generateComponents(config);
      generatedFiles.push(...components);

      console.log(`✅ Admin panel generated: ${generatedFiles.length} files`);

      return {
        success: true,
        files: generatedFiles,
        generatedPages: generatedFiles.map(f => f.path),
      };
    } catch (error) {
      console.error('Admin panel generation failed:', error);
      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        generatedPages: [],
      };
    }
  }

  /**
   * Parse Prisma schema to extract models and fields
   */
  private async parsePrismaSchema(schema: string): Promise<PrismaModel[]> {
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Analyze this Prisma schema and extract all models with their fields.

For each model, provide:
1. Model name
2. Display name (user-friendly, e.g., "User" → "Users", "BlogPost" → "Blog Posts")
3. Icon (choose appropriate Lucide icon name)
4. Fields with type, required, unique, isList, isRelation

Prisma Schema:
\`\`\`prisma
${schema}
\`\`\`

Output JSON array of models:
\`\`\`json
[
  {
    "name": "User",
    "displayName": "Users",
    "icon": "Users",
    "fields": [
      {
        "name": "id",
        "type": "String",
        "isRequired": true,
        "isUnique": true,
        "isList": false,
        "isRelation": false
      },
      {
        "name": "email",
        "type": "String",
        "isRequired": true,
        "isUnique": true,
        "isList": false,
        "isRelation": false
      },
      {
        "name": "posts",
        "type": "Post",
        "isRequired": false,
        "isUnique": false,
        "isList": true,
        "isRelation": true,
        "relationTo": "Post"
      }
    ]
  }
]
\`\`\`

Only include models that should be user-manageable (exclude internal models like Session, VerificationToken).`,
        },
      ],
    });

    const response = message.content[0];
    if (response.type !== 'text') {
      throw new Error('Invalid response from AI');
    }

    const jsonMatch = response.text.match(/```json\n([\s\S]+?)\n```/);
    if (!jsonMatch) {
      throw new Error('Failed to parse Prisma schema');
    }

    return JSON.parse(jsonMatch[1]);
  }

  /**
   * Generate dashboard page with analytics
   */
  private async generateDashboard(config: AdminPanelConfig): Promise<GeneratedFile> {
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: `Generate a modern admin dashboard page for ${config.appName}.

Requirements:
1. Show key metrics (total records for each model)
2. Recent activity timeline
3. Charts showing trends (use Recharts)
4. Quick actions (Create new records)
5. Responsive design with Tailwind CSS
6. Use shadcn/ui components

Models available:
${config.models.map(m => `- ${m.displayName} (${m.name})`).join('\n')}

Generate a complete Next.js App Router page: app/admin/page.tsx

Use this structure:
- Fetch data with Server Components
- Use Prisma to get counts and recent records
- Display cards with stats
- Show charts with Recharts
- Mobile-responsive

Output the complete file code.`,
        },
      ],
    });

    const response = message.content[0];
    if (response.type !== 'text') {
      throw new Error('Failed to generate dashboard');
    }

    let content = response.text;
    const codeMatch = content.match(/```(?:typescript|tsx)?\n([\s\S]+?)\n```/);
    if (codeMatch) {
      content = codeMatch[1];
    }

    return {
      path: 'app/admin/page.tsx',
      content: content.trim(),
      language: 'typescript',
    };
  }

  /**
   * Generate list page (table view) for a model
   */
  private async generateListPage(
    model: PrismaModel,
    config: AdminPanelConfig
  ): Promise<GeneratedFile> {
    const modelNameLower = model.name.toLowerCase();
    const modelNamePlural = model.displayName.toLowerCase();

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: `Generate an Airtable-style data management page for ${model.displayName}.

Model: ${model.name}
Fields:
${model.fields.map(f => `- ${f.name}: ${f.type}${f.isRequired ? ' (required)' : ''}${f.isRelation ? ` → ${f.relationTo}` : ''}`).join('\n')}

Requirements:
1. Table view with all fields
2. Search functionality
3. Filters (by field values)
4. Sorting (click column headers)
5. Pagination
6. Bulk actions (delete selected)
7. "Create New" button
8. Edit/Delete actions per row
9. Export to CSV
10. Mobile-responsive

Use:
- Next.js App Router (app/admin/${modelNamePlural}/page.tsx)
- Server Components for data fetching
- Prisma for database queries
- shadcn/ui Table component
- Tailwind CSS

Output the complete file code.`,
        },
      ],
    });

    const response = message.content[0];
    if (response.type !== 'text') {
      throw new Error(`Failed to generate list page for ${model.name}`);
    }

    let content = response.text;
    const codeMatch = content.match(/```(?:typescript|tsx)?\n([\s\S]+?)\n```/);
    if (codeMatch) {
      content = codeMatch[1];
    }

    return {
      path: `app/admin/${modelNamePlural}/page.tsx`,
      content: content.trim(),
      language: 'typescript',
    };
  }

  /**
   * Generate form page for creating/editing records
   */
  private async generateFormPage(
    model: PrismaModel,
    config: AdminPanelConfig
  ): Promise<GeneratedFile> {
    const modelNamePlural = model.displayName.toLowerCase();

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: `Generate a form page for creating/editing ${model.displayName}.

Model: ${model.name}
Fields:
${model.fields.map(f => {
  let fieldDesc = `- ${f.name}: ${f.type}`;
  if (f.isRequired) fieldDesc += ' (required)';
  if (f.isUnique) fieldDesc += ' (unique)';
  if (f.isRelation) fieldDesc += ` → relation to ${f.relationTo}`;
  return fieldDesc;
}).join('\n')}

Requirements:
1. Form with all editable fields
2. Appropriate input types (text, number, date, select for relations)
3. Client-side validation with Zod
4. Server actions for create/update
5. Success/error notifications
6. Cancel button (go back to list)
7. Handle both create and edit modes
8. Use shadcn/ui Form components

Use:
- Next.js App Router (app/admin/${modelNamePlural}/[id]/page.tsx)
- Server Actions for mutations
- Zod for validation
- shadcn/ui Form + Input components
- Tailwind CSS

Output the complete file code.`,
        },
      ],
    });

    const response = message.content[0];
    if (response.type !== 'text') {
      throw new Error(`Failed to generate form page for ${model.name}`);
    }

    let content = response.text;
    const codeMatch = content.match(/```(?:typescript|tsx)?\n([\s\S]+?)\n```/);
    if (codeMatch) {
      content = codeMatch[1];
    }

    return {
      path: `app/admin/${modelNamePlural}/[id]/page.tsx`,
      content: content.trim(),
      language: 'typescript',
    };
  }

  /**
   * Generate API routes for CRUD operations
   */
  private async generateApiRoutes(model: PrismaModel): Promise<GeneratedFile[]> {
    const modelNamePlural = model.displayName.toLowerCase();
    const files: GeneratedFile[] = [];

    // GET (list) and POST (create) route
    const listCreateRoute = await this.generateApiRoute(
      model,
      'list-create',
      `app/api/admin/${modelNamePlural}/route.ts`
    );
    files.push(listCreateRoute);

    // GET (single), PATCH (update), DELETE route
    const singleRoute = await this.generateApiRoute(
      model,
      'single',
      `app/api/admin/${modelNamePlural}/[id]/route.ts`
    );
    files.push(singleRoute);

    return files;
  }

  /**
   * Generate a single API route file
   */
  private async generateApiRoute(
    model: PrismaModel,
    routeType: 'list-create' | 'single',
    path: string
  ): Promise<GeneratedFile> {
    const operations = routeType === 'list-create'
      ? 'GET (list with pagination/search) and POST (create new record)'
      : 'GET (single record), PATCH (update), DELETE (delete record)';

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6144,
      messages: [
        {
          role: 'user',
          content: `Generate API route for ${model.name} - ${operations}.

Model: ${model.name}
Fields:
${model.fields.map(f => `- ${f.name}: ${f.type}`).join('\n')}

Requirements:
1. Implement ${operations}
2. Use Prisma for database operations
3. Add authentication check (getServerSession)
4. Add error handling
5. Return proper HTTP status codes
6. Validate input data

Route type: ${routeType}
Path: ${path}

Output the complete file code.`,
        },
      ],
    });

    const response = message.content[0];
    if (response.type !== 'text') {
      throw new Error(`Failed to generate API route for ${model.name}`);
    }

    let content = response.text;
    const codeMatch = content.match(/```(?:typescript|ts)?\n([\s\S]+?)\n```/);
    if (codeMatch) {
      content = codeMatch[1];
    }

    return {
      path,
      content: content.trim(),
      language: 'typescript',
    };
  }

  /**
   * Generate admin layout with navigation
   */
  private async generateAdminLayout(config: AdminPanelConfig): Promise<GeneratedFile> {
    const content = `import { Inter } from 'next/font/google';
import { AdminNav } from '@/components/admin/AdminNav';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: '${config.appName} - Admin Panel',
  description: 'Manage your ${config.appName} data',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Require authentication
  if (!session) {
    redirect('/login?callbackUrl=/admin');
  }

  return (
    <div className={inter.className}>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar Navigation */}
        <AdminNav appName="${config.appName}" />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}`;

    return {
      path: 'app/admin/layout.tsx',
      content,
      language: 'typescript',
    };
  }

  /**
   * Generate navigation component
   */
  private async generateNavigation(config: AdminPanelConfig): Promise<GeneratedFile> {
    const navItems = [
      { name: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
      ...config.models.map(m => ({
        name: m.displayName,
        href: `/admin/${m.displayName.toLowerCase()}`,
        icon: m.icon,
      })),
      { name: 'Settings', href: '/admin/settings', icon: 'Settings' },
    ];

    const content = `'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ${Array.from(new Set(config.models.map(m => m.icon))).join(',\n  ')},
  Settings,
  LogOut,
} from 'lucide-react';

interface AdminNavProps {
  appName: string;
}

const navItems = ${JSON.stringify(navItems, null, 2)};

export function AdminNav({ appName }: AdminNavProps) {
  const pathname = usePathname();

  const iconMap: Record<string, any> = {
    LayoutDashboard,
    ${config.models.map(m => `${m.icon},`).join('\n    ')}
    Settings,
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">{appName}</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Menu */}
      <div className="p-4 border-t border-gray-200">
        <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
}`;

    return {
      path: 'components/admin/AdminNav.tsx',
      content,
      language: 'typescript',
    };
  }

  /**
   * Generate settings page
   */
  private async generateSettingsPage(config: AdminPanelConfig): Promise<GeneratedFile> {
    const content = `import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your ${config.appName} settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Update your application settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appName">Application Name</Label>
              <Input
                id="appName"
                defaultValue="${config.appName}"
                placeholder="Enter app name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                placeholder="support@example.com"
              />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>
              Manage your account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={session?.user?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input defaultValue={session?.user?.name || ''} />
            </div>
            <Button>Update Account</Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive">Delete Application Data</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}`;

    return {
      path: 'app/admin/settings/page.tsx',
      content,
      language: 'typescript',
    };
  }

  /**
   * Generate reusable components for admin panel
   */
  private async generateComponents(config: AdminPanelConfig): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Data Table component (reusable)
    files.push({
      path: 'components/admin/DataTable.tsx',
      content: this.getDataTableComponent(),
      language: 'typescript',
    });

    // Stats Card component
    files.push({
      path: 'components/admin/StatsCard.tsx',
      content: this.getStatsCardComponent(),
      language: 'typescript',
    });

    // Export Button component
    files.push({
      path: 'components/admin/ExportButton.tsx',
      content: this.getExportButtonComponent(),
      language: 'typescript',
    });

    return files;
  }

  private getDataTableComponent(): string {
    return `'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
}

export function DataTable({ columns, data, onEdit, onDelete }: DataTableProps) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.label}</TableHead>
            ))}
            {(onEdit || onDelete) && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                className="text-center text-gray-500 py-8"
              >
                No data available
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </TableCell>
                ))}
                {(onEdit || onDelete) && (
                  <TableCell>
                    <div className="flex gap-2">
                      {onEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(row)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDelete(row)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}`;
  }

  private getStatsCardComponent(): string {
    return `import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({ title, value, icon: Icon, description, trend }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center mt-2 text-xs">
            <span
              className={trend.isPositive ? 'text-green-600' : 'text-red-600'}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}`;
  }

  private getExportButtonComponent(): string {
    return `'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  data: any[];
  filename: string;
}

export function ExportButton({ data, filename }: ExportButtonProps) {
  const exportToCSV = () => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((header) => JSON.stringify(row[header])).join(',')
      ),
    ].join('\\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = \`\${filename}.csv\`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={exportToCSV}>
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
}`;
  }
}

// Export singleton instance
export const adminPanelGenerator = new AdminPanelGenerator();
