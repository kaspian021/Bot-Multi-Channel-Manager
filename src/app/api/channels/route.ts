// ==============================================================
// Tenant-scoped channel collection and Telegram channel linking
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { EntitlementGuard } from '@/application/services/entitlement-service';
import { getTelegramBotService } from '@/infrastructure/telegram/telegram-bot-service';
import { requireWorkspaceRole, TenantAccessError } from '@/application/services/tenant-context-service';
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

    // Validate entitlement before contacting Telegram, then validate the
    // capacity again while holding the account transaction lock below.
    await new EntitlementGuard().assert({ accountId: context.accountId, workspaceId: context.workspaceId, operation: 'CREATE_CHANNEL', source: 'channels-api' });
    const verification = await getTelegramBotService().verifyChannel(telegramChatId);
    if (!verification.isValid || !verification.isAdministrator || !verification.canPostMessages) return NextResponse.json({ error: 'Bot must be an administrator with can_post_messages in the target channel', verification }, { status: 400 });
    const db = getDatabaseClient(); const channelId = `ch-${crypto.randomUUID()}`;
    const created = await db.transaction(async (tx) => {
      // One account row is a stable lock target across all its workspaces.
      const lock = tx.getProviderName().includes('PGlite') ? '' : ' FOR UPDATE';
      await tx.query(`SELECT id FROM accounts WHERE id = $1${lock}`, [context.accountId]);
      const snapshot = await tx.query<{ limits_json: string }>(`SELECT limits_json FROM entitlement_snapshots WHERE account_id=$1 AND product_key=$2 AND is_active=TRUE ORDER BY version DESC LIMIT 1${lock}`, [context.accountId, process.env.PRODUCT_KEY || 'ai-channel-manager']);
      const limits = snapshot.rows[0]?.limits_json ? JSON.parse(snapshot.rows[0].limits_json) : null;
      const maximum = Number(limits?.maxChannels);
      if (!Number.isFinite(maximum) || maximum < 1) throw new TenantAccessError('Channel limit is unavailable', 403);
      const count = await tx.query<{ count: string }>(`SELECT count(*) AS count FROM channels c JOIN workspace_members wm ON wm.workspace_id=c.workspace_id WHERE wm.account_id=$1 AND wm.status='ACTIVE' AND c.status <> 'ARCHIVED'`, [context.accountId]);
      if (Number(count.rows[0]?.count || 0) >= maximum) throw new TenantAccessError(`Channel limit reached (${maximum})`, 403);
      const existing = await tx.query('SELECT workspace_id FROM channels WHERE telegram_chat_id = $1', [telegramChatId]);
      if (existing.rowCount && existing.rows[0].workspace_id !== context.workspaceId) throw new TenantAccessError('Telegram channel is already assigned to another workspace', 409);
      await tx.query(`INSERT INTO channels (id,workspace_id,name,telegram_chat_id,telegram_channel_username,language,status,description,bio,posting_frequency,timezone) VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE',$7,$8,$9,$10)`, [channelId, context.workspaceId, String(name).trim(), telegramChatId, verification.username || telegramChatId, language || 'en', description || '', bio || '', postingFrequency || 3, timezone || 'UTC']);
      await tx.query(`INSERT INTO channel_strategies (channel_id,language,posting_frequency,preferred_posting_windows) VALUES ($1,$2,$3,$4)`, [channelId, language || 'en', postingFrequency || 3, JSON.stringify(['09:00', '14:00', '20:00'])]);
      await AuditService.log(context.workspaceId, channelId, 'OWNER' as any, context.accountId, 'CHANNEL_LINKED', 'CHANNEL', channelId, { telegramChatId }, tx);
      return (await tx.query('SELECT * FROM channels WHERE id=$1 AND workspace_id=$2', [channelId, context.workspaceId])).rows[0];
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) { return apiError(error, 'Failed to create channel'); }
}
