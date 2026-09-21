// ==============================================================
// Channels Collection API — Section 41 Specification
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { seedDatabase } from '@/infrastructure/database/seed';

export const dynamic = 'force-dynamic';

export async function GET() {
  await seedDatabase(false);
  const db = getDatabaseClient();
  const res = await db.query('SELECT * FROM channels ORDER BY created_at DESC');
  return NextResponse.json(res.rows);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, telegramChatId, language, postingFrequency, timezone, description, bio } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
    }

    const db = getDatabaseClient();
    const id = `ch-${Date.now()}`;
    const workspaceId = 'ws-demo-001';

    await db.query(
      `INSERT INTO channels (
        id, workspace_id, name, telegram_chat_id, telegram_channel_username,
        language, status, description, bio, posting_frequency, timezone
      ) VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, $8, $9, $10)`,
      [
        id,
        workspaceId,
        name.trim(),
        telegramChatId || `@${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        telegramChatId || `@${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        language || 'en',
        description || '',
        bio || '',
        postingFrequency || 3,
        timezone || 'UTC',
      ]
    );

    // Default strategy
    await db.query(
      `INSERT INTO channel_strategies (channel_id, language, posting_frequency, preferred_posting_windows)
       VALUES ($1, $2, $3, $4)`,
      [id, language || 'en', postingFrequency || 3, JSON.stringify(['09:00', '14:00', '20:00'])]
    );

    const created = await db.query('SELECT * FROM channels WHERE id = $1', [id]);
    return NextResponse.json(created.rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create channel' }, { status: 500 });
  }
}
