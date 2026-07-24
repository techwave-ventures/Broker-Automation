import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';
import { jsonError } from './http.js';
import { randomUUID } from 'crypto';
import path from 'path';

// Allowed content types for upload
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

// Max file size in bytes (10 MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getS3Client(): S3Client {
  const { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = env;
  if (!AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS S3 credentials are not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.');
  }
  return new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * POST /api/upload/presign
 * Body: { filename: string, contentType: string, fileSize: number }
 * Returns: { uploadUrl: string, publicUrl: string, key: string }
 */
export async function presignUpload(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Unauthorized');
    }

    const { filename, contentType, fileSize } = req.body as {
      filename?: string;
      contentType?: string;
      fileSize?: number;
    };

    // Validate inputs
    if (!filename || typeof filename !== 'string') {
      return jsonError(res, 400, 'filename is required');
    }
    if (!contentType || typeof contentType !== 'string') {
      return jsonError(res, 400, 'contentType is required');
    }
    if (!ALLOWED_TYPES.has(contentType)) {
      return jsonError(res, 400, `File type "${contentType}" is not allowed. Use JPEG, PNG, WebP or HEIC.`);
    }
    if (fileSize !== undefined && fileSize > MAX_FILE_SIZE) {
      return jsonError(res, 400, `File size exceeds the 10 MB limit.`);
    }

    const { AWS_S3_BUCKET, AWS_S3_PUBLIC_URL } = env;
    if (!AWS_S3_BUCKET || !AWS_S3_PUBLIC_URL) {
      return jsonError(res, 500, 'S3 storage is not configured on this server.');
    }

    // Build a namespaced, collision-free S3 key
    const ext = path.extname(filename).toLowerCase() || '.jpg';
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const key = `properties/${safeUserId}/${randomUUID()}${ext}`;

    const s3 = getS3Client();
    const command = new PutObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    // Pre-signed URL expires in 5 minutes (300 s) — gives enough time for
    // large files and slower connections before the signature expires.
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    // Derive the public URL from the configured base URL
    const publicUrl = `${AWS_S3_PUBLIC_URL.replace(/\/$/, '')}/${key}`;

    return res.json({ uploadUrl, publicUrl, key });
  } catch (error) {
    console.error('Failed to generate pre-signed upload URL:', error);
    return jsonError(res, 500, 'Failed to generate upload URL');
  }
}

/**
 * Utility: delete multiple S3 objects by their public URLs.
 * Fire-and-forget — call without awaiting to avoid blocking the response.
 */
export async function deleteS3Objects(publicUrls: string[]): Promise<void> {
  try {
    const { AWS_S3_BUCKET, AWS_S3_PUBLIC_URL } = env;
    if (!AWS_S3_BUCKET || !AWS_S3_PUBLIC_URL) return;

    const baseUrl = AWS_S3_PUBLIC_URL.replace(/\/$/, '');
    const objects = publicUrls
      .filter(Boolean)
      .map((url) => {
        if (!url.startsWith(baseUrl)) return null;
        const key = url.slice(baseUrl.length).replace(/^\//, '');
        return key ? { Key: key } : null;
      })
      .filter((o): o is { Key: string } => o !== null);

    if (objects.length === 0) return;

    const s3 = getS3Client();
    await s3.send(new DeleteObjectsCommand({
      Bucket: AWS_S3_BUCKET,
      Delete: { Objects: objects, Quiet: true },
    }));
  } catch (err) {
    console.error('Failed to delete S3 objects:', err);
  }
}
