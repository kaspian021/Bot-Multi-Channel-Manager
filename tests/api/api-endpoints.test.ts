import { describe, it, expect, beforeAll } from 'vitest';
import { runMigrations } from '../../src/infrastructure/database/migrations';
import { seedDatabase } from '../../src/infrastructure/database/seed';
import { getDatabaseClient } from '../../src/infrastructure/database/db-client';

describe('API Route Integrations', () => {
  beforeAll(async () => {
    process.env.DEMO_MODE = 'true';
    await runMigrations();
    await seedDatabase(false);
  });

  it('queries health status and dependencies', async () => {
    const db = getDatabaseClient();
    const res = await db.query('SELECT 1');
    expect(res.rowCount).toBe(1);
  });

  it('verifies channels and strategies in database', async () => {
    const db = getDatabaseClient();
    const channels = await db.query('SELECT * FROM channels');
    expect(channels.rowCount).toBeGreaterThan(0);
    const strategy = await db.query('SELECT * FROM channel_strategies WHERE channel_id = $1', [channels.rows[0].id]);
    expect(strategy.rowCount).toBe(1);
  });

  it('verifies prompt templates', async () => {
    const db = getDatabaseClient();
    const prompts = await db.query('SELECT * FROM prompt_templates');
    expect(prompts.rowCount).toBeGreaterThanOrEqual(4);
  });

  it('verifies audit logs trail', async () => {
    const db = getDatabaseClient();
    const audit = await db.query('SELECT * FROM audit_logs');
    expect(audit.rowCount).toBeGreaterThan(0);
  });
});
