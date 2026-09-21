// ==============================================================
// Published Posts API
// ==============================================================

import { NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { seedDatabase } from '@/infrastructure/database/seed';

export const dynamic = 'force-dynamic';

export async function GET() {
  await seedDatabase(false);
  const db = getDatabaseClient();
  const res = await db.query(`
    SELECT pp.*, cd.topic, cd.headline, ch.name as channel_name
    FROM published_posts pp
    LEFT JOIN content_drafts cd ON pp.draft_id = cd.id
    LEFT JOIN channels ch ON pp.channel_id = ch.id
    ORDER BY pp.published_at DESC
    LIMIT 100
  `);
  return NextResponse.json(res.rows);
}
