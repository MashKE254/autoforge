/**
 * File Storage Module
 *
 * Provides file upload, download, and management capabilities
 * with support for Supabase Storage, AWS S3, and Cloudflare R2
 */

import { storageTemplate } from './template';

export type StorageProvider = 'supabase' | 's3' | 'cloudflare-r2';

export interface StorageModuleConfig {
  provider: StorageProvider;
  maxFileSize?: string; // e.g., '10MB'
  allowedTypes?: string[]; // MIME types
  features?: Array<'upload' | 'download' | 'delete' | 'signed-urls'>;
}

export interface StorageModuleOutput {
  files: Array<{
    path: string;
    content: string;
  }>;
  envVars: string[];
  dependencies: string[];
  instructions: string[];
}

/**
 * Generate file storage integration files
 */
export function generateStorageModule(config: StorageModuleConfig): StorageModuleOutput {
  const files: Array<{ path: string; content: string }> = [];
  const envVars: string[] = ['STORAGE_PROVIDER'];
  const dependencies: string[] = ['react-dropzone', 'file-type', 'nanoid'];
  const instructions: string[] = [];

  // Base client abstraction
  files.push({
    path: 'lib/storage/client.ts',
    content: storageTemplate.client,
  });

  files.push({
    path: 'lib/storage/types.ts',
    content: storageTemplate.types,
  });

  // Provider-specific implementation
  switch (config.provider) {
    case 'supabase':
      files.push({
        path: 'lib/storage/providers/supabase.ts',
        content: storageTemplate.supabaseProvider,
      });
      dependencies.push('@supabase/storage-js');
      envVars.push(
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SUPABASE_BUCKET_NAME'
      );
      instructions.push('Create a Supabase storage bucket named "uploads" in your Supabase dashboard');
      instructions.push('Enable public access if you want files to be publicly accessible');
      break;

    case 's3':
      files.push({
        path: 'lib/storage/providers/s3.ts',
        content: storageTemplate.s3Provider,
      });
      dependencies.push('@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner');
      envVars.push(
        'AWS_REGION',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_S3_BUCKET_NAME'
      );
      instructions.push('Create an S3 bucket in your AWS console');
      instructions.push('Create an IAM user with S3 access and generate access keys');
      instructions.push('Configure bucket CORS settings to allow uploads from your domain');
      break;

    case 'cloudflare-r2':
      envVars.push(
        'R2_ACCOUNT_ID',
        'R2_ACCESS_KEY_ID',
        'R2_SECRET_ACCESS_KEY',
        'R2_BUCKET_NAME'
      );
      instructions.push('Create a Cloudflare R2 bucket in your Cloudflare dashboard');
      instructions.push('Generate R2 API tokens with read/write permissions');
      break;
  }

  // Upload API route
  if (config.features?.includes('upload')) {
    files.push({
      path: 'app/api/upload/route.ts',
      content: storageTemplate.uploadApiRoute,
    });

    // Upload component
    files.push({
      path: 'components/file-upload.tsx',
      content: storageTemplate.uploadComponent,
    });
  }

  return {
    files,
    envVars,
    dependencies,
    instructions,
  };
}

/**
 * Get storage module prompt for AI generation
 */
export function getStorageModulePrompt(config: StorageModuleConfig): string {
  return `
## File Storage Module

Include file storage integration using ${config.provider.toUpperCase()} with the following:

### Storage Provider: ${config.provider}
- Max file size: ${config.maxFileSize || '10MB'}
- Allowed types: ${config.allowedTypes?.join(', ') || 'images, PDFs, text files'}

### Required Files:
1. lib/storage/client.ts - Storage abstraction layer
2. lib/storage/types.ts - TypeScript types
3. lib/storage/providers/${config.provider}.ts - ${config.provider} implementation
4. app/api/upload/route.ts - File upload API endpoint with validation
5. components/file-upload.tsx - Drag-and-drop upload component with React

### Storage Client Functions:
- uploadFile(file, path, options) - Upload file to storage
- downloadFile(path) - Download file from storage
- deleteFile(path) - Delete file from storage
- listFiles(prefix) - List files in directory
- getSignedUrl(path, expiresIn) - Generate temporary signed URL

### Upload Component Features:
- Drag and drop file upload
- File type validation
- File size validation
- Upload progress indicator
- Multiple file support
- Preview uploaded files
- Delete uploaded files

### API Endpoint Features:
- File validation (size, type)
- Unique filename generation
- Error handling
- Success response with file URL

### Environment Variables:
${envVars.join('\n')}

### Setup Instructions:
${instructions.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}
`;
}

export { storageTemplate };
