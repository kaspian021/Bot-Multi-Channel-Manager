// ==============================================================
// Single Draft API (GET, PUT)
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { DraftService } from '@/application/services/draft-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDatabaseClient();
  const res = await db.query('SELECT * FROM content_drafts WHERE id = $1', [params.id]);
  if (res.rowCount === 0) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  const r = res.rows[0];
  const draft = {
    ...r,
    whyItMatters: typeof r.why_it_matters === 'string' ? JSON.parse(r.why_it_matters) : r.why_it_matters,
    sources: typeof r.sources === 'string' ? JSON.parse(r.sources) : r.sources,
    factCheckItems: typeof r.fact_check_items === 'string' ? JSON.parse(r.fact_check_items) : r.fact_check_items,
    qualityEvaluation: typeof r.quality_evaluation === 'string' ? JSON.parse(r.quality_evaluation) : r.quality_evaluation,
  };

  return NextResponse.json(draft);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { instruction, headline, body: draftBody, explanation, suggestedPublishTime } = body;

    // If an instruction is provided, use the AI editor service (Section 25)
    if (instruction) {
      const draftService = new DraftService();
      const revised = await draftService.reviseDraft(params.id, instruction);
      return NextResponse.json(revised);
    }

    // Direct field update
    const db = getDatabaseClient();
    await db.query(
      `UPDATE content_drafts SET
        headline = COALESCE($1, headline),
        body = COALESCE($2, body),
        explanation = COALESCE($3, explanation),
        suggested_publish_time = COALESCE($4, suggested_publish_time),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [headline, draftBody, explanation, suggestedPublishTime, params.id]
    );

    const updatedRes = await db.query('SELECT * FROM content_drafts WHERE id = $1', [params.id]);
    return NextResponse.json(updatedRes.rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update draft' }, { status: 500 });
  }
}
