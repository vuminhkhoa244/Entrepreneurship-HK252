import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';
import { getDb } from './db/index.js';
import authRoutes from './routes/auth.js';
import libraryRoutes from './routes/library.js';
import readerRoutes from './routes/reader.js';
import aiRoutes from './routes/ai.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(resolve(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/reader', readerRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({ error: err.message || 'Internal server error' });
});

async function start() {
  getDb(); // triggers DB initialization
  app.listen(PORT, () => console.log(`Server running on :${PORT}`));
}

start();
