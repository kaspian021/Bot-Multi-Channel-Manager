import { NextRequest, NextResponse } from 'next/server';
import { PublishingService } from '@/application/services/publishing-service';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireDraftAccess, requireWorkspaceRole } from '@/application/services/tenant-context-service';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await tenantFor(req); requireWorkspaceRole(context, 'APPROVER');
    await requireDraftAccess(context, params.id, 'APPROVER');
    const result = await new PublishingService().publishDraft(params.id, { actorType: 'OWNER' as any, actorId: context.accountId, idempotencyKey: `manual-publish:${params.id}` });
    if (!result.success) return NextResponse.json({ error: result.error || 'Publish failed' }, { status: 403 });
    return NextResponse.json({ success: true, status: 'PUBLISHED', telegramMessageId: result.telegramMessageId });
  } catch (error) { return apiError(error, 'Publishing failed'); }
}
