// ==============================================================
// Database Migrations Runner
// ==============================================================

import fs from 'fs';
import path from 'path';
import { getDatabaseClient } from './db-client';

export async function runMigrations(): Promise<void> {
  const db = getDatabaseClient();
  let schemaPath = path.resolve(process.cwd(), 'src/infrastructure/database/schema.sql');
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(__dirname, 'schema.sql');
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');
  await db.exec(sql);
}
