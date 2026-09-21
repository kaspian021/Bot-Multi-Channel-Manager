// ==============================================================
// Research Candidates API
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { seedDatabase } from '@/infrastructure/database/seed';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await seedDatabase(false);
  const db = getDatabaseClient();
  const searchParams = req.nextUrl.searchParams;
  const channelId = searchParams.get('channelId');

  let sql = 'SELECT * FROM content_candidates';
  const params: any[] = [];
  if (channelId) {
    sql += ' WHERE channel_id = $1';
    params.push(channelId);
  }
  sql += ' ORDER BY created_at DESC LIMIT 100';

  const res = await db.query(sql, params);
  const formatted = res.rows.map((r: any) => ({
    ...r,
    score: typeof r.score_json === 'string' ? JSON.parse(r.score_json) : r.score_json,
    extractedClaims: typeof r.extracted_claims === 'string' ? JSON.parse(r.extracted_claims) : r.extracted_claims,
  }));

  return NextResponse.json(formatted);
}
