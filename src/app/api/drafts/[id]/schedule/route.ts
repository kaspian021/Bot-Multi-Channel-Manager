import { NextRequest, NextResponse } from 'next/server';
import { SchedulerService } from '@/application/services/scheduler-service';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireDraftAccess, requireWorkspaceRole } from '@/application/services/tenant-context-service';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await tenantFor(req); requireWorkspaceRole(context, 'APPROVER');
    await requireDraftAccess(context, params.id, 'APPROVER');
    const body = await req.json().catch(() => ({}));
    const scheduledFor = body.scheduledFor || new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    const scheduledPostId = await new SchedulerService().scheduleDraft(params.id, scheduledFor, context.accountId);
    return NextResponse.json({ success: true, status: 'SCHEDULED', scheduledPostId, scheduledFor });
  } catch (error) { return apiError(error, 'Scheduling failed'); }
}
