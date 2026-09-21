// ==============================================================
// Topics API
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { seedDatabase } from '@/infrastructure/database/seed';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await seedDatabase(false);
  const db = getDatabaseClient();
  const res = await db.query('SELECT * FROM topics ORDER BY importance DESC, name ASC');
  return NextResponse.json(res.rows);
}

export async function POST(req: NextRequest) {
  try {
    const db = getDatabaseClient();
    const body = await req.json();
    const { channelId, name, description, keywords, importance } = body;

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const id = `top-${slug}-${Date.now()}`;

    await db.query(
      `INSERT INTO topics (id, channel_id, slug, name, description, keywords, importance, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [
        id,
        channelId || 'ch-futurestack-001',
        slug,
        name,
        description || '',
        JSON.stringify(keywords || []),
        importance || 8,
      ]
    );

    const created = await db.query('SELECT * FROM topics WHERE id = $1', [id]);
    return NextResponse.json(created.rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create topic' }, { status: 500 });
  }
}
