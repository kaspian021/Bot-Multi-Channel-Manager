import { NextRequest, NextResponse } from 'next/server';
import { ResearchService } from '@/application/services/research-service';
import { DraftService } from '@/application/services/draft-service';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireChannelAccess, requireWorkspaceRole } from '@/application/services/tenant-context-service';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const context = await tenantFor(req); requireWorkspaceRole(context, 'EDITOR');
    const body = await req.json().catch(() => ({}));
    const channelId = body.channelId || context.activeChannelId;
    if (!channelId) return NextResponse.json({ error: 'channelId is required' }, { status: 400 });
    await requireChannelAccess(context, channelId, 'EDITOR');
    const result = await new ResearchService().executeResearchRun(channelId);
    let draft = null;
    if (body.autoDraft ?? true) {
      const candidate = result.candidates.find((item) => !item.isDuplicate);
      if (candidate) draft = await new DraftService().generateDraftFromCandidate(candidate.id);
    }
    return NextResponse.json({ success: true, runId: result.runId, candidatesFound: result.candidatesFound, candidates: result.candidates, draftCreated: draft });
  } catch (error) { return apiError(error, 'Research run failed'); }
}
