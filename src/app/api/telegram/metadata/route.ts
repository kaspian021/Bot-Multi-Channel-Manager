import { NextRequest, NextResponse } from 'next/server';
import { getTelegramBotService } from '@/infrastructure/telegram/telegram-bot-service';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireChannelAccess, requireWorkspaceRole, TenantAccessError } from '@/application/services/tenant-context-service';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  try {
    const ctx = await tenantFor(req); requireWorkspaceRole(ctx, 'ADMIN'); const body = await req.json();
    const channelId = body.channelId || ctx.activeChannelId;
    let channel: any;
    if (channelId) channel = await requireChannelAccess(ctx, channelId, 'ADMIN');
    else if (body.channelChatId) {
      const found = await getDatabaseClient().query('SELECT id FROM channels WHERE workspace_id=$1 AND telegram_chat_id=$2', [ctx.workspaceId, body.channelChatId]);
      if (!found.rowCount) throw new TenantAccessError('Channel not found in active workspace', 404);
      channel = await requireChannelAccess(ctx, found.rows[0].id, 'ADMIN');
    } else return NextResponse.json({ error: 'channelId or channelChatId is required' }, { status: 400 });
    if (!channel.telegram_chat_id) return NextResponse.json({ error: 'Channel has no linked Telegram chat' }, { status: 400 });
    const result = await getTelegramBotService().updateChannelMetadata(channel.telegram_chat_id, { title: body.title, description: body.description });
    return NextResponse.json({ success: result.success, updated: { title: body.title, description: body.description } });
  } catch (error) { return apiError(error, 'Metadata update failed'); }
}
