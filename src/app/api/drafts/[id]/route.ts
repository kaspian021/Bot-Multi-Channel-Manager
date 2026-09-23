import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { DraftService } from '@/application/services/draft-service';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireDraftAccess, requireWorkspaceRole } from '@/application/services/tenant-context-service';
import { EditorialPlanningService } from '@/application/services/editorial-planning-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await tenantFor(req);
    const r = await requireDraftAccess(context, params.id);
    return NextResponse.json({
      ...r,
      whyItMatters: typeof r.why_it_matters === 'string' ? JSON.parse(r.why_it_matters) : r.why_it_matters,
      sources: typeof r.sources === 'string' ? JSON.parse(r.sources) : r.sources,
      factCheckItems: typeof r.fact_check_items === 'string' ? JSON.parse(r.fact_check_items) : r.fact_check_items,
      qualityEvaluation: typeof r.quality_evaluation === 'string' ? JSON.parse(r.quality_evaluation) : r.quality_evaluation,
    });
  } catch (error) { return apiError(error, 'Failed to load draft'); }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await tenantFor(req);
    requireWorkspaceRole(context, 'EDITOR');
    const existing = await requireDraftAccess(context, params.id, 'EDITOR');
    const body = await req.json();
    const { instruction, headline, body: draftBody, explanation, suggestedPublishTime } = body;
    if (instruction) {
      const revised = await new DraftService().reviseDraft(params.id, instruction, context.accountId);
      return NextResponse.json(revised);
    }
    const db = getDatabaseClient();
    await db.query(
      `UPDATE content_drafts SET headline = COALESCE($1, headline), body = COALESCE($2, body), explanation = COALESCE($3, explanation),
       suggested_publish_time = COALESCE($4, suggested_publish_time), updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND workspace_id = $6`,
      [headline, draftBody, explanation, suggestedPublishTime, params.id, context.workspaceId]
    );
    await new EditorialPlanningService().recordLearning({ workspaceId: context.workspaceId, channelId: existing.channel_id, draftId: params.id, action: 'EDIT', signalKey: 'manual_edit', signalValue: 'Direct dashboard edit', confidence: 1 });
    const updated = await requireDraftAccess(context, params.id, 'EDITOR');
    return NextResponse.json(updated);
  } catch (error) { return apiError(error, 'Failed to update draft'); }
}
