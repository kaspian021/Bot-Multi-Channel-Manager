// ==============================================================
// Audit Logs API
// ==============================================================

import { NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { seedDatabase } from '@/infrastructure/database/seed';

export const dynamic = 'force-dynamic';

export async function GET() {
  await seedDatabase(false);
  const db = getDatabaseClient();
  const res = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
  const formatted = res.rows.map((r: any) => ({
    ...r,
    metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
  }));
  return NextResponse.json(formatted);
}
