// ==============================================================
// Research Runs API
// ==============================================================

import { NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { seedDatabase } from '@/infrastructure/database/seed';

export const dynamic = 'force-dynamic';

export async function GET() {
  await seedDatabase(false);
  const db = getDatabaseClient();
  const res = await db.query('SELECT * FROM research_runs ORDER BY created_at DESC LIMIT 50');
  return NextResponse.json(res.rows);
}
