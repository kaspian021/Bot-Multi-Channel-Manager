// ==============================================================
// Channel Item API (GET, PUT, DELETE)
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDatabaseClient();
  const res = await db.query('SELECT * FROM channels WHERE id = $1', [params.id]);
  if (res.rowCount === 0) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
  }

  const strat = await db.query('SELECT * FROM channel_strategies WHERE channel_id = $1', [params.id]);
  const topics = await db.query('SELECT * FROM topics WHERE channel_id = $1', [params.id]);
  const sources = await db.query('SELECT * FROM content_sources WHERE channel_id = $1', [params.id]);

  return NextResponse.json({
    channel: res.rows[0],
    strategy: strat.rows[0] || null,
    topics: topics.rows,
    sources: sources.rows,
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDatabaseClient();
    const body = await req.json();
    const { name, description, bio, status, postingFrequency, timezone, language } = body;

    await db.query(
      `UPDATE channels SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        bio = COALESCE($3, bio),
        status = COALESCE($4, status),
        posting_frequency = COALESCE($5, posting_frequency),
        timezone = COALESCE($6, timezone),
        language = COALESCE($7, language),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [name, description, bio, status, postingFrequency, timezone, language, params.id]
    );

    const updated = await db.query('SELECT * FROM channels WHERE id = $1', [params.id]);
    return NextResponse.json(updated.rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDatabaseClient();
  await db.query('DELETE FROM channels WHERE id = $1', [params.id]);
  return NextResponse.json({ message: 'Channel deleted' });
}
