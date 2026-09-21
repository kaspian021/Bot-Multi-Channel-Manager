import { NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { seedDatabase } from '@/infrastructure/database/seed';

export const dynamic = 'force-dynamic';

export async function GET() {
  await seedDatabase(false);
  const db = getDatabaseClient();
  const res = await db.query('SELECT * FROM channel_brand_proposals ORDER BY created_at DESC');
  return NextResponse.json(res.rows);
}
