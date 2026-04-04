import multer from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_TYPES = ['.epub', '.pdf'];
const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '100') * 1024 * 1024;

// Create uploads dir
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const safeName = `${uuidv4()}-${Date.now()}${ext}`;
    cb(null, safeName);
  }
});

const fileFilter = (_req, file, cb) => {
  const ext = extname(file.originalname).toLowerCase();
  if (!ALLOWED_TYPES.includes(ext)) {
    cb(new Error(`Only EPUB and PDF files allowed. Got: ${ext}`));
    return;
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE }
});
