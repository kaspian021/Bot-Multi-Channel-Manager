// ==============================================================
// Content Drafts API
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { seedDatabase } from '@/infrastructure/database/seed';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await seedDatabase(false);
  const db = getDatabaseClient();
  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get('status');
  const channelId = searchParams.get('channelId');

  let sql = 'SELECT * FROM content_drafts WHERE 1=1';
  const params: any[] = [];
  let pIdx = 1;

  if (status) {
    sql += ` AND status = $${pIdx++}`;
    params.push(status);
  }
  if (channelId) {
    sql += ` AND channel_id = $${pIdx++}`;
    params.push(channelId);
  }
  sql += ' ORDER BY created_at DESC LIMIT 100';

  const res = await db.query(sql, params);
  const drafts = res.rows.map((r: any) => ({
    ...r,
    whyItMatters: typeof r.why_it_matters === 'string' ? JSON.parse(r.why_it_matters) : r.why_it_matters,
    sources: typeof r.sources === 'string' ? JSON.parse(r.sources) : r.sources,
    factCheckItems: typeof r.fact_check_items === 'string' ? JSON.parse(r.fact_check_items) : r.fact_check_items,
    qualityEvaluation: typeof r.quality_evaluation === 'string' ? JSON.parse(r.quality_evaluation) : r.quality_evaluation,
  }));

  return NextResponse.json(drafts);
}
