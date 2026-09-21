import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { AuditService } from '@/application/services/audit-service';
import { AuditActorType, DraftStatus } from '@/domain/types';
import { validateTransition } from '@/domain/state-machine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDatabaseClient();
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'Rejected by owner';

    const draftRes = await db.query('SELECT * FROM content_drafts WHERE id = $1', [params.id]);
    if (draftRes.rowCount === 0) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    const draft = draftRes.rows[0];

    validateTransition(draft.status as DraftStatus, DraftStatus.REJECTED);

    await db.query(
      "UPDATE content_drafts SET status = 'REJECTED', rejection_reason = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [reason, params.id]
    );

    await AuditService.log(
      draft.workspace_id,
      draft.channel_id,
      AuditActorType.OWNER,
      'admin-ui',
      'DRAFT_REJECTED',
      'DRAFT',
      params.id,
      { reason }
    );

    return NextResponse.json({ success: true, status: 'REJECTED', reason });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Rejection failed' }, { status: 400 });
  }
}
