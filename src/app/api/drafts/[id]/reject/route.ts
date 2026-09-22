import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { AuditService } from '@/application/services/audit-service';
import { DraftStatus } from '@/domain/types';
import { validateTransition } from '@/domain/state-machine';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireDraftAccess, requireWorkspaceRole } from '@/application/services/tenant-context-service';
import { EditorialPlanningService } from '@/application/services/editorial-planning-service';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await tenantFor(req); requireWorkspaceRole(context, 'APPROVER');
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'Rejected by owner';
    const draft = await requireDraftAccess(context, params.id, 'APPROVER');
    validateTransition(draft.status as DraftStatus, DraftStatus.REJECTED);
    await getDatabaseClient().query("UPDATE content_drafts SET status = 'REJECTED', rejection_reason = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND workspace_id = $3", [reason, params.id, context.workspaceId]);
    await AuditService.log(context.workspaceId, draft.channel_id, 'OWNER' as any, context.accountId, 'DRAFT_REJECTED', 'DRAFT', params.id, { reason });
    await new EditorialPlanningService().recordLearning({ workspaceId: context.workspaceId, channelId: draft.channel_id, draftId: params.id, action: 'REJECT', signalKey: 'rejected_topic', signalValue: draft.topic, confidence: 0.9, metadata: { reason } });
    return NextResponse.json({ success: true, status: 'REJECTED', reason });
  } catch (error) { return apiError(error, 'Rejection failed'); }
}
