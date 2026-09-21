// ==============================================================
// Scheduled Posts API
// ==============================================================

import { NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { seedDatabase } from '@/infrastructure/database/seed';

export const dynamic = 'force-dynamic';

export async function GET() {
  await seedDatabase(false);
  const db = getDatabaseClient();
  const res = await db.query(`
    SELECT sp.*, cd.title, cd.headline, cd.topic, cd.content_type, ch.name as channel_name
    FROM scheduled_posts sp
    LEFT JOIN content_drafts cd ON sp.draft_id = cd.id
    LEFT JOIN channels ch ON sp.channel_id = ch.id
    ORDER BY sp.scheduled_for ASC
  `);
  return NextResponse.json(res.rows);
}
