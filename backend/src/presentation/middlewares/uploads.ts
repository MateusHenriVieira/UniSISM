import multer from 'multer';
import { env } from '../../shared/env';

export const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 12,
  },
});
