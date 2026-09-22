import { NextRequest, NextResponse } from 'next/server';
import { getTelegramBotService } from '@/infrastructure/telegram/telegram-bot-service';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireChannelAccess, requireWorkspaceRole } from '@/application/services/tenant-context-service';
export const dynamic = 'force-dynamic';
/** Checks a prospective Telegram target; no linking/mutation occurs here. */
export async function POST(req: NextRequest) {
  try {
    const ctx = await tenantFor(req); requireWorkspaceRole(ctx, 'EDITOR'); const body = await req.json();
    if (!body.channelChatId || typeof body.channelChatId !== 'string') return NextResponse.json({ error: 'channelChatId is required' }, { status: 400 });
    if (body.channelId) await requireChannelAccess(ctx, body.channelId, 'EDITOR');
    const verification = await getTelegramBotService().verifyChannel(body.channelChatId);
    return NextResponse.json({ success: verification.isValid, verification });
  } catch (error) { return apiError(error, 'Verification failed'); }
}
