// ==============================================================
// Unified PostgreSQL Database Client (PostgreSQL / PGlite)
// ==============================================================

import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';

export interface DatabaseQueryResult<T = any> { rows: T[]; rowCount: number; }
export interface IDatabaseClient {
  query<T = any>(text: string, params?: any[]): Promise<DatabaseQueryResult<T>>;
  exec(sql: string): Promise<void>;
  /** Execute related writes on one database connection and atomically commit or roll them back. */
  transaction<T>(callback: (tx: IDatabaseClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  getProviderName(): string;
}

class QueryableTransactionClient implements IDatabaseClient {
  constructor(private readonly client: any, private readonly provider: string) {}
  async query<T = any>(text: string, params?: any[]): Promise<DatabaseQueryResult<T>> {
    const result = await this.client.query(text, params);
    return { rows: result.rows || [], rowCount: result.rowCount ?? result.rows?.length ?? 0 };
  }
  async exec(sql: string): Promise<void> { if (typeof this.client.exec === 'function') await this.client.exec(sql); else await this.client.query(sql); }
  async transaction<T>(_callback: (tx: IDatabaseClient) => Promise<T>): Promise<T> {
    throw new Error('Nested database transactions are not supported');
  }
  async close(): Promise<void> { /* Transaction lifetime belongs to its parent client. */ }
  getProviderName(): string { return this.provider; }
}

class PostgresDatabaseClient implements IDatabaseClient {
  private pool: any;
  constructor(connectionString: string) {
    let pgModule: any;
    try { pgModule = require('pg'); } catch { throw new Error('pg package is required when using external DATABASE_CONNECTION_STRING'); }
    this.pool = new pgModule.Pool({ connectionString });
  }
  async query<T = any>(text: string, params?: any[]): Promise<DatabaseQueryResult<T>> {
    const res = await this.pool.query(text, params);
    return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
  }
  async exec(sql: string): Promise<void> { await this.pool.query(sql); }
  async transaction<T>(callback: (tx: IDatabaseClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(new QueryableTransactionClient(client, this.getProviderName()));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* preserve original failure */ }
      throw error;
    } finally { client.release(); }
  }
  async close(): Promise<void> { await this.pool.end(); }
  getProviderName(): string { return 'PostgreSQL (External)'; }
}

class PGliteDatabaseClient implements IDatabaseClient {
  private client: PGlite | null = null;
  private dataDir: string;
  private initPromise: Promise<void> | null = null;
  constructor(dataDir?: string) { this.dataDir = dataDir || path.resolve(process.cwd(), 'data/pglite'); }
  private async ensureInitialized(): Promise<void> {
    if (this.client) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      try {
        if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
        this.client = new PGlite(this.dataDir); await this.client.waitReady;
      } catch (err) {
        console.warn('PGlite disk init failed, falling back to in-memory instance:', err);
        this.client = new PGlite(); await this.client.waitReady;
      }
    })();
    await this.initPromise;
  }
  async query<T = any>(text: string, params?: any[]): Promise<DatabaseQueryResult<T>> {
    await this.ensureInitialized(); if (!this.client) throw new Error('PGlite client is not initialized');
    const res = await this.client.query<T>(text, params);
    return { rows: res.rows || [], rowCount: res.rows ? res.rows.length : 0 };
  }
  async exec(sql: string): Promise<void> { await this.ensureInitialized(); if (!this.client) throw new Error('PGlite client is not initialized'); await this.client.exec(sql); }
  async transaction<T>(callback: (tx: IDatabaseClient) => Promise<T>): Promise<T> {
    await this.ensureInitialized(); if (!this.client) throw new Error('PGlite client is not initialized');
    // PGlite's transaction callback serializes access and supplies the same
    // PostgreSQL semantics used by the external client.
    return (this.client as any).transaction(async (client: any) => callback(new QueryableTransactionClient(client, this.getProviderName())));
  }
  async close(): Promise<void> { if (this.client) { await this.client.close(); this.client = null; this.initPromise = null; } }
  getProviderName(): string { return 'PostgreSQL (Embedded PGlite)'; }
}

let dbInstance: IDatabaseClient | null = null;
export function getDatabaseClient(): IDatabaseClient {
  if (dbInstance) return dbInstance;
  const connStr = process.env.DATABASE_CONNECTION_STRING?.trim();
  if (connStr && (connStr.startsWith('postgres://') || connStr.startsWith('postgresql://'))) dbInstance = new PostgresDatabaseClient(connStr);
  else {
    const dataDir = process.env.NODE_ENV === 'test' ? path.resolve(process.cwd(), 'data/pglite-test-' + Math.random().toString(36).substring(7)) : path.resolve(process.cwd(), 'data/pglite');
    dbInstance = new PGliteDatabaseClient(dataDir);
  }
  return dbInstance;
}
export async function resetDatabaseClientForTesting(client?: IDatabaseClient): Promise<void> { if (dbInstance) await dbInstance.close(); dbInstance = client || null; }
