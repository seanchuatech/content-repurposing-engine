import path from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface StorageAdapter {
  save(relativePath: string, file: File): Promise<void>;
}

export class LocalStorageAdapter implements StorageAdapter {
  async save(relativePath: string, file: File): Promise<void> {
    const absolutePath = path.resolve(process.cwd(), '..', relativePath);
    // Ensure directory exists
    const dir = path.dirname(absolutePath);
    await Bun.write(absolutePath, file);
  }
}

export class S3StorageAdapter implements StorageAdapter {
  private s3: S3Client;
  private bucket: string;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION || 'ap-southeast-1',
    });
    this.bucket = process.env.S3_MEDIA_BUCKET || 'content-engine-media';
  }

  async save(relativePath: string, file: File): Promise<void> {
    const buffer = await file.arrayBuffer();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: relativePath,
      Body: new Uint8Array(buffer),
      ContentType: file.type,
    });
    await this.s3.send(command);
  }
}

let storage: StorageAdapter;

export function getStorage(): StorageAdapter {
  if (storage) return storage;

  if (process.env.STORAGE_BACKEND === 's3') {
    storage = new S3StorageAdapter();
  } else {
    storage = new LocalStorageAdapter();
  }

  return storage;
}
