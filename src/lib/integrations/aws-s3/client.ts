/**
 * AWS S3 Integration Client
 *
 * API key-based integration for AWS S3 storage
 */

import { APIKeyClient } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class AWSS3Client extends APIKeyClient {
  private client?: S3Client;
  private bucketName?: string;

  constructor(options: { userId?: string }) {
    super('aws-s3', options);
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
    if (this.apiKey && this.apiSecret && !this.isDemoMode) {
      this.client = new S3Client({
        region: this.credentials?.accountInfo?.region || 'us-east-1',
        credentials: {
          accessKeyId: this.apiKey,
          secretAccessKey: this.apiSecret,
        },
      });
      this.bucketName = this.credentials?.accountInfo?.bucketName;
    }
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(key: string, body: Buffer | string, contentType?: string, bucket?: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const command = new PutObjectCommand({
          Bucket: bucket || this.bucketName,
          Key: key,
          Body: body,
          ContentType: contentType,
        });

        await this.client!.send(command);

        return {
          success: true,
          key,
          bucket: bucket || this.bucketName,
          url: `https://${bucket || this.bucketName}.s3.amazonaws.com/${key}`,
        };
      },
      async () => IntegrationsDemoMode.awsS3_uploadFile(key, contentType),
      'upload_file'
    );
  }

  /**
   * Download a file from S3
   */
  async downloadFile(key: string, bucket?: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const command = new GetObjectCommand({
          Bucket: bucket || this.bucketName,
          Key: key,
        });

        const response = await this.client!.send(command);
        const body = await response.Body?.transformToByteArray();

        return {
          success: true,
          key,
          contentType: response.ContentType,
          body,
          size: response.ContentLength,
        };
      },
      async () => IntegrationsDemoMode.awsS3_downloadFile(key),
      'download_file'
    );
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string, bucket?: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const command = new DeleteObjectCommand({
          Bucket: bucket || this.bucketName,
          Key: key,
        });

        await this.client!.send(command);

        return {
          success: true,
          key,
          deleted: true,
        };
      },
      async () => IntegrationsDemoMode.awsS3_deleteFile(key),
      'delete_file'
    );
  }

  /**
   * List files in a bucket
   */
  async listFiles(prefix?: string, bucket?: string, maxKeys: number = 1000): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const command = new ListObjectsV2Command({
          Bucket: bucket || this.bucketName,
          Prefix: prefix,
          MaxKeys: maxKeys,
        });

        const response = await this.client!.send(command);

        return {
          files: response.Contents?.map((obj) => ({
            key: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified,
            etag: obj.ETag,
          })) || [],
          count: response.KeyCount || 0,
          isTruncated: response.IsTruncated,
        };
      },
      async () => IntegrationsDemoMode.awsS3_listFiles(prefix),
      'list_files'
    );
  }

  /**
   * Get a presigned URL for file access
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600, bucket?: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const command = new GetObjectCommand({
          Bucket: bucket || this.bucketName,
          Key: key,
        });

        const url = await getSignedUrl(this.client!, command, { expiresIn });

        return {
          success: true,
          key,
          url,
          expiresIn,
          expiresAt: new Date(Date.now() + expiresIn * 1000),
        };
      },
      async () => IntegrationsDemoMode.awsS3_getPresignedUrl(key, expiresIn),
      'get_presigned_url'
    );
  }

  /**
   * Copy a file within S3
   */
  async copyFile(sourceKey: string, destinationKey: string, sourceBucket?: string, destBucket?: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const { CopyObjectCommand } = await import('@aws-sdk/client-s3');
        const command = new CopyObjectCommand({
          Bucket: destBucket || this.bucketName,
          CopySource: `${sourceBucket || this.bucketName}/${sourceKey}`,
          Key: destinationKey,
        });

        await this.client!.send(command);

        return {
          success: true,
          sourceKey,
          destinationKey,
          copied: true,
        };
      },
      async () => IntegrationsDemoMode.awsS3_copyFile(sourceKey, destinationKey),
      'copy_file'
    );
  }
}
