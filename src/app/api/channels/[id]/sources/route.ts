// ==============================================================
// Channel Sources API
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDatabaseClient();
  const res = await db.query('SELECT * FROM content_sources WHERE channel_id = $1 ORDER BY priority DESC', [params.id]);
  return NextResponse.json(res.rows);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDatabaseClient();
    const body = await req.json();
    const { name, type, url, priority, trustScore } = body;

    const id = `src-${Date.now()}`;
    await db.query(
      `INSERT INTO content_sources (id, channel_id, name, type, url, priority, trust_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, params.id, name, type || 'WEB', url, priority || 5, trustScore || 80]
    );

    const created = await db.query('SELECT * FROM content_sources WHERE id = $1', [id]);
    return NextResponse.json(created.rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to add source' }, { status: 500 });
  }
}
