/**
 * File Storage Module Templates
 *
 * Code templates for file storage integration (Supabase Storage, S3, Cloudflare R2)
 */

export const storageTemplate = {
  // Storage client abstraction layer
  client: `export type StorageProvider = 'supabase' | 's3' | 'cloudflare-r2';

export interface StorageClient {
  uploadFile(file: File | Buffer, path: string, options?: UploadOptions): Promise<string>;
  downloadFile(path: string): Promise<Blob>;
  deleteFile(path: string): Promise<void>;
  listFiles(prefix: string): Promise<string[]>;
  getSignedUrl(path: string, expiresIn: number): Promise<string>;
}

export interface UploadOptions {
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
}

export function getStorageClient(provider: StorageProvider = 'supabase'): StorageClient {
  switch (provider) {
    case 'supabase':
      return require('./providers/supabase').supabaseStorage;
    case 's3':
      return require('./providers/s3').s3Storage;
    case 'cloudflare-r2':
      return require('./providers/r2').r2Storage;
    default:
      throw new Error(\`Unknown storage provider: \${provider}\`);
  }
}
`,

  // Supabase Storage implementation
  supabaseProvider: `import { createClient } from '@supabase/storage-js';
import type { StorageClient, UploadOptions } from '../client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const bucketName = process.env.SUPABASE_BUCKET_NAME || 'uploads';

const storage = createClient(\`\${supabaseUrl}/storage/v1\`, {
  apikey: supabaseKey,
  Authorization: \`Bearer \${supabaseKey}\`,
});

export const supabaseStorage: StorageClient = {
  async uploadFile(file: File | Buffer, path: string, options?: UploadOptions): Promise<string> {
    try {
      const fileBuffer = file instanceof File ? await file.arrayBuffer() : file;

      const { data, error } = await storage
        .from(bucketName)
        .upload(path, fileBuffer, {
          contentType: options?.contentType,
          cacheControl: options?.cacheControl || '3600',
          upsert: true,
          ...(options?.metadata && { metadata: options.metadata }),
        });

      if (error) throw error;

      // Return public URL
      const { data: urlData } = storage.from(bucketName).getPublicUrl(path);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading file to Supabase:', error);
      throw error;
    }
  },

  async downloadFile(path: string): Promise<Blob> {
    try {
      const { data, error } = await storage.from(bucketName).download(path);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error downloading file from Supabase:', error);
      throw error;
    }
  },

  async deleteFile(path: string): Promise<void> {
    try {
      const { error } = await storage.from(bucketName).remove([path]);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting file from Supabase:', error);
      throw error;
    }
  },

  async listFiles(prefix: string): Promise<string[]> {
    try {
      const { data, error } = await storage.from(bucketName).list(prefix);

      if (error) throw error;
      return data?.map(file => file.name) || [];
    } catch (error) {
      console.error('Error listing files from Supabase:', error);
      throw error;
    }
  },

  async getSignedUrl(path: string, expiresIn: number): Promise<string> {
    try {
      const { data, error } = await storage
        .from(bucketName)
        .createSignedUrl(path, expiresIn);

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
  },
};
`,

  // S3 Storage implementation
  s3Provider: `import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageClient, UploadOptions } from '../client';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const bucketName = process.env.AWS_S3_BUCKET_NAME!;

export const s3Storage: StorageClient = {
  async uploadFile(file: File | Buffer, path: string, options?: UploadOptions): Promise<string> {
    try {
      const fileBuffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: path,
        Body: fileBuffer,
        ContentType: options?.contentType,
        CacheControl: options?.cacheControl,
        Metadata: options?.metadata,
      });

      await s3Client.send(command);

      // Return public URL (or use CloudFront if configured)
      const region = process.env.AWS_REGION || 'us-east-1';
      return \`https://\${bucketName}.s3.\${region}.amazonaws.com/\${path}\`;
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw error;
    }
  },

  async downloadFile(path: string): Promise<Blob> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: path,
      });

      const response = await s3Client.send(command);
      const bytes = await response.Body?.transformToByteArray();

      if (!bytes) throw new Error('No file data returned');

      return new Blob([bytes]);
    } catch (error) {
      console.error('Error downloading file from S3:', error);
      throw error;
    }
  },

  async deleteFile(path: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: path,
      });

      await s3Client.send(command);
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw error;
    }
  },

  async listFiles(prefix: string): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
      });

      const response = await s3Client.send(command);
      return response.Contents?.map(item => item.Key || '') || [];
    } catch (error) {
      console.error('Error listing files from S3:', error);
      throw error;
    }
  },

  async getSignedUrl(path: string, expiresIn: number): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: path,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
  },
};
`,

  // File upload API route
  uploadApiRoute: `import { NextRequest, NextResponse } from 'next/server';
import { getStorageClient } from '@/lib/storage/client';
import { nanoid } from 'nanoid';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const filename = \`\${nanoid()}\${ext ? '.' + ext : ''}\`;
    const path = \`uploads/\${filename}\`;

    // Upload to storage
    const storage = getStorageClient();
    const url = await storage.uploadFile(file, path, {
      contentType: file.type,
      cacheControl: '3600',
    });

    return NextResponse.json({
      success: true,
      url,
      filename,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'No path provided' }, { status: 400 });
    }

    const storage = getStorageClient();
    await storage.deleteFile(path);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
`,

  // File upload React component
  uploadComponent: `'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, CheckCircle2, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onUploadComplete?: (url: string, filename: string) => void;
  maxSize?: number;
  accept?: string[];
  multiple?: boolean;
}

export function FileUpload({
  onUploadComplete,
  maxSize = 10 * 1024 * 1024,
  accept = ['image/*', 'application/pdf', 'text/plain'],
  multiple = false
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    setUploading(true);

    try {
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const data = await response.json();

        setUploadedFiles(prev => [...prev, { name: data.filename, url: data.url }]);
        onUploadComplete?.(data.url, data.filename);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize,
    accept: accept.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    multiple,
  });

  const removeFile = async (url: string, filename: string) => {
    try {
      const path = \`uploads/\${filename}\`;
      await fetch(\`/api/upload?path=\${encodeURIComponent(path)}\`, {
        method: 'DELETE',
      });

      setUploadedFiles(prev => prev.filter(f => f.url !== url));
    } catch (err) {
      console.error('Error deleting file:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={\`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors \${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }\`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to select'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Max size: {(maxSize / 1024 / 1024).toFixed(0)}MB
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
          Uploading...
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Uploaded Files</h3>
          {uploadedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <File className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-700">{file.name}</span>
              </div>
              <button
                onClick={() => removeFile(file.url, file.name)}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
`,

  // Environment variables template
  envTemplate: `# Storage Configuration
STORAGE_PROVIDER=supabase  # or 's3' or 'cloudflare-r2'

# Supabase Storage (if using Supabase)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_BUCKET_NAME=uploads

# AWS S3 (if using S3)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=your_bucket_name

# Cloudflare R2 (if using R2)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
`,

  // TypeScript types
  types: `export interface UploadedFile {
  url: string;
  filename: string;
  size: number;
  type: string;
  uploadedAt: Date;
}

export interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'completed' | 'failed';
  error?: string;
}
`,
};
