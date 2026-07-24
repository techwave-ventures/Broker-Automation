import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { presignUpload } from '../controllers/uploadController.js';

export const uploadRouter = Router();

// Generate a pre-signed S3 PUT URL for direct browser-to-S3 upload
uploadRouter.post('/presign', requireAuth, presignUpload);
