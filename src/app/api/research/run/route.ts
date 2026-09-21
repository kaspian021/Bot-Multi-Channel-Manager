// ==============================================================
// Research Execution API — Section 41 Specification
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { ResearchService } from '@/application/services/research-service';
import { DraftService } from '@/application/services/draft-service';
import { getDatabaseClient } from '@/infrastructure/database/db-client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const channelId = body.channelId || 'ch-futurestack-001';
    const autoDraft = body.autoDraft ?? true;

    const researchService = new ResearchService();
    const result = await researchService.executeResearchRun(channelId);

    let draft = null;
    if (autoDraft && result.candidates.length > 0) {
      const topCand = result.candidates.find((c) => !c.isDuplicate) || result.candidates[0];
      if (topCand) {
        const draftService = new DraftService();
        draft = await draftService.generateDraftFromCandidate(topCand.id);
      }
    }

    return NextResponse.json({
      success: true,
      runId: result.runId,
      candidatesFound: result.candidatesFound,
      candidates: result.candidates,
      draftCreated: draft,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Research run failed' }, { status: 500 });
  }
}
