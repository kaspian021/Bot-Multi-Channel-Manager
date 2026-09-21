// ==============================================================
// Sources API
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { seedDatabase } from '@/infrastructure/database/seed';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await seedDatabase(false);
  const db = getDatabaseClient();
  const res = await db.query('SELECT * FROM content_sources ORDER BY priority DESC, created_at DESC');
  return NextResponse.json(res.rows);
}

export async function POST(req: NextRequest) {
  try {
    const db = getDatabaseClient();
    const body = await req.json();
    const { channelId, name, type, url, priority, trustScore } = body;

    const id = `src-${Date.now()}`;
    await db.query(
      `INSERT INTO content_sources (id, channel_id, name, type, url, priority, trust_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, channelId || 'ch-futurestack-001', name, type || 'WEB', url, priority || 5, trustScore || 80]
    );

    const created = await db.query('SELECT * FROM content_sources WHERE id = $1', [id]);
    return NextResponse.json(created.rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create source' }, { status: 500 });
  }
}
