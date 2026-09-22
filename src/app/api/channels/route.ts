// ==============================================================
// Tenant-scoped channel collection and Telegram channel linking
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { EntitlementGuard } from '@/application/services/entitlement-service';
import { getTelegramBotService } from '@/infrastructure/telegram/telegram-bot-service';
import { requireWorkspaceRole } from '@/application/services/tenant-context-service';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { AuditService } from '@/application/services/audit-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const context = await tenantFor(req);
    const db = getDatabaseClient();
    const res = await db.query('SELECT * FROM channels WHERE workspace_id = $1 ORDER BY created_at DESC', [context.workspaceId]);
    return NextResponse.json(res.rows);
  } catch (error) { return apiError(error, 'Failed to list channels'); }
}

export async function POST(req: NextRequest) {
  try {
    const context = await tenantFor(req);
    requireWorkspaceRole(context, 'ADMIN');
    const body = await req.json();
    const { name, telegramChatId, language, postingFrequency, timezone, description, bio } = body;
    if (!name || !String(name).trim()) return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
    if (!telegramChatId || typeof telegramChatId !== 'string') return NextResponse.json({ error: 'telegramChatId is required for secure channel linking' }, { status: 400 });

    const guard = new EntitlementGuard();
    const entitlement = await guard.assert({ accountId: context.accountId, workspaceId: context.workspaceId, operation: 'CREATE_CHANNEL', source: 'channels-api' });
    const db = getDatabaseClient();
    const count = await db.query<{ count: string }>(
      `SELECT count(*) AS count FROM channels c
       JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
       WHERE wm.account_id = $1 AND wm.status = 'ACTIVE' AND c.status <> 'ARCHIVED'`, [context.accountId]
    );
    if (Number(count.rows[0]?.count || 0) >= entitlement.limits.maxChannels) {
      return NextResponse.json({ error: `Channel limit reached (${entitlement.limits.maxChannels})` }, { status: 403 });
    }
    const existing = await db.query('SELECT workspace_id FROM channels WHERE telegram_chat_id = $1', [telegramChatId]);
    if (existing.rowCount && existing.rows[0].workspace_id !== context.workspaceId) {
      return NextResponse.json({ error: 'Telegram channel is already assigned to another workspace' }, { status: 409 });
    }

    const verification = await getTelegramBotService().verifyChannel(telegramChatId);
    if (!verification.isValid || !verification.isAdministrator || !verification.canPostMessages) {
      return NextResponse.json({ error: 'Bot must be an administrator with can_post_messages in the target channel', verification }, { status: 400 });
    }

    const channelId = `ch-${crypto.randomUUID()}`;
    await db.query(
      `INSERT INTO channels (id, workspace_id, name, telegram_chat_id, telegram_channel_username, language, status, description, bio, posting_frequency, timezone)
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, $8, $9, $10)`,
      [channelId, context.workspaceId, String(name).trim(), telegramChatId, verification.username || telegramChatId, language || 'en', description || '', bio || '', postingFrequency || 3, timezone || 'UTC']
    );
    await db.query(
      `INSERT INTO channel_strategies (channel_id, language, posting_frequency, preferred_posting_windows)
       VALUES ($1, $2, $3, $4)`, [channelId, language || 'en', postingFrequency || 3, JSON.stringify(['09:00', '14:00', '20:00'])]
    );
    await AuditService.log(context.workspaceId, channelId, 'OWNER' as any, context.accountId, 'CHANNEL_LINKED', 'CHANNEL', channelId, { telegramChatId });
    const created = await db.query('SELECT * FROM channels WHERE id = $1 AND workspace_id = $2', [channelId, context.workspaceId]);
    return NextResponse.json(created.rows[0], { status: 201 });
  } catch (error) { return apiError(error, 'Failed to create channel'); }
}
