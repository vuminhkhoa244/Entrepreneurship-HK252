import multer from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logging.js';

const ALLOWED_TYPES = ['.epub', '.pdf'];
const ALLOWED_MIMES = ['application/epub+zip', 'application/pdf'];
const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '100') * 1024 * 1024;

// Magic numbers for file type validation
const MAGIC_NUMBERS = {
  pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
  epub: Buffer.from([0x50, 0x4B, 0x03, 0x04])  // ZIP header
};

// Create uploads dir
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    // Use UUID to prevent directory traversal and filename attacks
    const safeName = `${uuidv4()}-${Date.now()}${ext}`;
    cb(null, safeName);
  }
});

/**
 * Validate file against magic numbers
 * Prevents uploading malicious files with wrong extensions
 */
function validateFileMagic(buffer, ext) {
  if (ext === '.pdf') {
    return buffer.slice(0, 4).equals(MAGIC_NUMBERS.pdf);
  } else if (ext === '.epub') {
    return buffer.slice(0, 4).equals(MAGIC_NUMBERS.epub);
  }
  return false;
}

/**
 * File filter to validate file type
 */
const fileFilter = (req, file, cb) => {
  try {
    const ext = extname(file.originalname).toLowerCase();
    
    // Validate extension
    if (!ALLOWED_TYPES.includes(ext)) {
      logger.warn('File upload rejected: invalid extension', {
        userId: req.user?.id,
        extension: ext,
        originalName: file.originalname
      });
      cb(new Error(`Only EPUB and PDF files allowed. Got: ${ext}`));
      return;
    }

    // Validate MIME type
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      logger.warn('File upload rejected: invalid MIME type', {
        userId: req.user?.id,
        mimeType: file.mimetype,
        originalName: file.originalname
      });
      cb(new Error(`Invalid file type: ${file.mimetype}`));
      return;
    }

    // Prevent directory traversal
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      logger.warn('File upload rejected: path traversal attempt', {
        userId: req.user?.id,
        originalName: file.originalname
      });
      cb(new Error('Invalid filename'));
      return;
    }

    cb(null, true);
  } catch (err) {
    logger.error('File filter error', { error: err.message, userId: req.user?.id });
    cb(err);
  }
};

/**
 * Validate file magic numbers after upload
 */
export function validateUploadedFile(req, res, next) {
  if (!req.file) {
    return next();
  }

  try {
    const ext = extname(req.file.filename).toLowerCase();
    const buffer = readFileSync(req.file.path);
    
    if (!validateFileMagic(buffer, ext)) {
      logger.warn('File upload rejected: magic number mismatch', {
        userId: req.user?.id,
        extension: ext
      });
      // Delete the file
      import('fs').then(fs => fs.promises.unlink(req.file.path)).catch(() => {});
      return res.status(400).json({ error: 'Invalid file format. File content does not match extension.' });
    }

    next();
  } catch (err) {
    logger.error('File validation error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'File validation failed' });
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE,
    files: 1 // Only one file per request
  }
});

