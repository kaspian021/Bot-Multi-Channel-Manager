import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { getTelegramBotService } from '@/infrastructure/telegram/telegram-bot-service';
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
    const draft = await requireDraftAccess(context, params.id, 'APPROVER');
    validateTransition(draft.status as DraftStatus, DraftStatus.APPROVED);
    await getDatabaseClient().query("UPDATE content_drafts SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND workspace_id = $2", [params.id, context.workspaceId]);
    await AuditService.log(context.workspaceId, draft.channel_id, 'OWNER' as any, context.accountId, 'DRAFT_APPROVED', 'DRAFT', params.id, { via: 'api_approval' });
    await new EditorialPlanningService().recordLearning({ workspaceId: context.workspaceId, channelId: draft.channel_id, draftId: params.id, action: 'APPROVE', signalKey: 'approved_topic', signalValue: draft.topic, confidence: 0.8 });
    await getTelegramBotService().sendPublishChoicePrompt(params.id, draft.suggested_publish_time || '20:30 UTC', undefined, context.telegramUserId);
    return NextResponse.json({ success: true, status: 'APPROVED' });
  } catch (error) { return apiError(error, 'Approval failed'); }
}
