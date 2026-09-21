import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { getTelegramBotService } from '@/infrastructure/telegram/telegram-bot-service';
import { AuditService } from '@/application/services/audit-service';
import { AuditActorType, DraftStatus } from '@/domain/types';
import { validateTransition } from '@/domain/state-machine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDatabaseClient();
    const bot = getTelegramBotService();

    const draftRes = await db.query('SELECT * FROM content_drafts WHERE id = $1', [params.id]);
    if (draftRes.rowCount === 0) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    const draft = draftRes.rows[0];

    validateTransition(draft.status as DraftStatus, DraftStatus.APPROVED);

    await db.query("UPDATE content_drafts SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [params.id]);

    await AuditService.log(
      draft.workspace_id,
      draft.channel_id,
      AuditActorType.OWNER,
      'admin-ui',
      'DRAFT_APPROVED',
      'DRAFT',
      params.id,
      { via: 'api_approval' }
    );

    // Send publish choice prompt
    await bot.sendPublishChoicePrompt(params.id, draft.suggested_publish_time || '20:30 UTC');

    return NextResponse.json({ success: true, status: 'APPROVED', message: 'Draft approved successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Approval failed' }, { status: 400 });
  }
}
