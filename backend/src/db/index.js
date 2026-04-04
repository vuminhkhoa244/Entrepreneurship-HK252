import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db;

export function getDb() {
  if (!db) {
    const dir = join(__dirname, '..', 'data');
    mkdirSync(dir, { recursive: true });

    db = new Database(join(dir, 'library.db'));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initDb(db);
  }
  return db;
}

function initDb(d) {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  d.exec(sql);
  console.log('Database initialized');
}

export { db };
