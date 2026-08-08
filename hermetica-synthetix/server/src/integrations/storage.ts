import fs from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { env } from '../lib/env.js';
import { invokeLLM } from './llm.js';

export type UploadFileArgs = { file: Blob | Buffer; filename?: string };

/** Replaces base44.integrations.Core.UploadFile. Returns { file_url }. */
export async function uploadFile(args: UploadFileArgs): Promise<{ file_url: string }> {
  const buffer = Buffer.isBuffer(args.file) ? args.file : Buffer.from(await (args.file as Blob).arrayBuffer());
  const ext = args.filename ? path.extname(args.filename) : '';
  const key = `${nanoid()}${ext}`;

  if (env.STORAGE_DRIVER === 's3') {
    return uploadToS3(key, buffer);
  }
  return uploadToLocalDisk(key, buffer);
}

async function uploadToLocalDisk(key: string, buffer: Buffer): Promise<{ file_url: string }> {
  await fs.mkdir(env.STORAGE_LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(env.STORAGE_LOCAL_DIR, key), buffer);
  return { file_url: `${env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}` };
}

async function uploadToS3(key: string, buffer: Buffer): Promise<{ file_url: string }> {
  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error('S3 storage is not configured: set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION');
  }
  // Minimal dependency-free S3-compatible PUT using SigV4 is non-trivial by hand;
  // pull the AWS SDK v3 lazily so it's only required when S3 mode is actually used.
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: env.S3_REGION || 'auto',
    endpoint: env.S3_ENDPOINT || undefined,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
  });
  await client.send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: buffer }));
  const base = env.STORAGE_PUBLIC_BASE_URL !== '/uploads' ? env.STORAGE_PUBLIC_BASE_URL : `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com`;
  return { file_url: `${base.replace(/\/$/, '')}/${key}` };
}

export type ExtractDataArgs = { file_url: string; json_schema: Record<string, any> };

/**
 * Replaces base44.integrations.Core.ExtractDataFromUploadedFile. Base44's
 * version does OCR/parsing server-side; here we fetch the file's text content
 * and ask the LLM to extract structured data matching the schema, which
 * covers the same use case (structured extraction from an uploaded document)
 * without needing a dedicated OCR pipeline.
 */
export async function extractDataFromUploadedFile(args: ExtractDataArgs): Promise<any> {
  const res = await fetch(args.file_url);
  if (!res.ok) throw new Error(`ExtractDataFromUploadedFile: could not fetch file_url (${res.status})`);
  const text = await res.text();
  return invokeLLM({
    prompt: `Extract structured data from the following document content:\n\n${text.slice(0, 20000)}`,
    response_json_schema: args.json_schema,
  });
}
