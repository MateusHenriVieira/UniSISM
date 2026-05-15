/**
 * Factory de storage. Resolve via env STORAGE_PROVIDER=disk|s3.
 */
import type { IFileStorage } from '../../domain/services/IFileStorage';
import { DiskFileStorage } from './DiskFileStorage';
import { S3FileStorage } from './S3FileStorage';
import { logger } from '../logger';

export function buildFileStorage(): IFileStorage {
  const provider = (process.env['STORAGE_PROVIDER'] ?? 'disk').toLowerCase();

  if (provider === 's3') {
    const endpoint = process.env['S3_ENDPOINT'];
    const region = process.env['S3_REGION'] ?? 'us-east-1';
    const bucket = process.env['S3_BUCKET'];
    const accessKey = process.env['S3_ACCESS_KEY'];
    const secretKey = process.env['S3_SECRET_KEY'];
    const forcePathStyle = (process.env['S3_FORCE_PATH_STYLE'] ?? 'true') === 'true';

    if (!bucket || !accessKey || !secretKey) {
      logger.error('STORAGE_PROVIDER=s3 mas S3_BUCKET/S3_ACCESS_KEY/S3_SECRET_KEY não definidos');
      throw new Error('S3 config incompleta');
    }

    logger.info({ endpoint, bucket, region, forcePathStyle }, 'storage: S3');
    return new S3FileStorage({
      region,
      bucket,
      accessKey,
      secretKey,
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle,
    });
  }

  logger.info('storage: disk local');
  return new DiskFileStorage();
}
