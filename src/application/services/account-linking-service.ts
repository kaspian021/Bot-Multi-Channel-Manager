// ==============================================================
// Phase 4 Account Identity, Workspace Membership & Telegram Linking
// ==============================================================

import crypto from 'crypto';
import { getDatabaseClient } from '../../infrastructure/database/db-client';
import { AuditService } from './audit-service';
import { AuditActorType, WorkspaceRole } from '../../domain/types';
import { TenantAccessError, requireWorkspaceMember } from './tenant-context-service';

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export class AccountLinkingService {
  async createAccount(input: { externalProvider: string; externalUserId: string; displayName?: string }): Promise<string> {
    const db = getDatabaseClient();
    const existing = await db.query<{ id: string }>(
      'SELECT id FROM accounts WHERE external_provider = $1 AND external_user_id = $2',
      [input.externalProvider, input.externalUserId]
    );
    if (existing.rowCount) return existing.rows[0].id;
    const accountId = id('acc');
    await db.query(
      `INSERT INTO accounts (id, external_provider, external_user_id, status, display_name)
       VALUES ($1, $2, $3, 'ACTIVE', $4)`,
      [accountId, input.externalProvider, input.externalUserId, input.displayName || null]
    );
    return accountId;
  }

  async createWorkspace(accountId: string, input: { name: string; slug: string; role?: WorkspaceRole }): Promise<string> {
    const db = getDatabaseClient();
    const workspaceId = id('ws');
    await db.query(
      `INSERT INTO workspaces (id, name, slug, owner_user_id, account_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [workspaceId, input.name, input.slug, accountId, accountId]
    );
    await this.addWorkspaceMember(workspaceId, accountId, input.role || 'OWNER');
    return workspaceId;
  }

  async addWorkspaceMember(workspaceId: string, accountId: string, role: WorkspaceRole): Promise<void> {
    const db = getDatabaseClient();
    await db.query(
      `INSERT INTO workspace_members (workspace_id, account_id, role, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       ON CONFLICT (workspace_id, account_id) DO UPDATE SET role = EXCLUDED.role, status = 'ACTIVE'`,
      [workspaceId, accountId, role]
    );
  }

  /** Returns the raw opaque token once. Only a SHA-256 digest is persisted. */
  async createLinkChallenge(accountId: string, workspaceId?: string, ttlSeconds = Number(process.env.ACCOUNT_LINK_TOKEN_TTL_SECONDS || 600)): Promise<{ token: string; expiresAt: string }> {
    const db = getDatabaseClient();
    if (workspaceId) await requireWorkspaceMember(accountId, workspaceId);
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + Math.max(60, ttlSeconds) * 1000).toISOString();
    await db.query(
      `INSERT INTO account_link_tokens (id, token_hash, account_id, workspace_id, expires_at, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING')`,
      [id('link'), hashToken(token), accountId, workspaceId || null, expiresAt]
    );
    return { token, expiresAt };
  }

  /**
   * Atomically consumes a link token and binds exactly one Telegram numeric ID.
   * A Telegram identity may be retried for the same account, but is never
   * silently reassigned across accounts.
   */
  async consumeLinkChallenge(input: { token: string; telegramUserId: number | string; username?: string }): Promise<{ accountId: string; workspaceId?: string }> {
    const db = getDatabaseClient();
    const telegramUserId = String(input.telegramUserId);
    const tokenRow = await db.query<{ id: string; account_id: string; workspace_id: string | null }>(
      `UPDATE account_link_tokens
       SET consumed_at = CURRENT_TIMESTAMP, status = 'CONSUMED', telegram_user_id = $1
       WHERE token_hash = $2 AND status = 'PENDING' AND consumed_at IS NULL AND expires_at > CURRENT_TIMESTAMP
       RETURNING id, account_id, workspace_id`,
      [telegramUserId, hashToken(input.token)]
    );
    if (tokenRow.rowCount === 0) {
      await this.auditLinkFailure(telegramUserId, 'TOKEN_INVALID_EXPIRED_OR_REPLAYED', undefined, hashToken(input.token));
      throw new TenantAccessError('Account link token is invalid, expired, or already consumed', 400);
    }

    const token = tokenRow.rows[0];
    const existing = await db.query<{ account_id: string }>(
      'SELECT account_id FROM telegram_identities WHERE telegram_user_id = $1',
      [telegramUserId]
    );
    if (existing.rowCount && existing.rows[0].account_id !== token.account_id) {
      // The token was consumed, so mark the failed attempted binding. It cannot
      // be replayed and no account ownership is changed.
      await db.query("UPDATE account_link_tokens SET status = 'REJECTED' WHERE id = $1", [token.id]);
      await this.auditLinkFailure(telegramUserId, 'TELEGRAM_IDENTITY_ALREADY_BOUND', token.workspace_id || undefined, hashToken(input.token));
      throw new TenantAccessError('This Telegram identity is already linked to another account', 409);
    }

    await db.query(
      `INSERT INTO telegram_identities (id, account_id, telegram_user_id, telegram_username_snapshot, verified_at, status)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'ACTIVE')
       ON CONFLICT (telegram_user_id) DO UPDATE SET telegram_username_snapshot = EXCLUDED.telegram_username_snapshot,
         verified_at = CURRENT_TIMESTAMP, status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP`,
      [id('tgid'), token.account_id, telegramUserId, input.username || null]
    );

    const workspaceId = token.workspace_id || (await db.query<{ workspace_id: string }>(
      `SELECT workspace_id FROM workspace_members WHERE account_id = $1 AND status = 'ACTIVE' ORDER BY created_at ASC LIMIT 1`,
      [token.account_id]
    )).rows[0]?.workspace_id;
    if (workspaceId) {
      await db.query(
        `INSERT INTO telegram_user_context (telegram_user_id, account_id, active_workspace_id, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (telegram_user_id) DO UPDATE SET account_id = EXCLUDED.account_id,
           active_workspace_id = EXCLUDED.active_workspace_id, updated_at = CURRENT_TIMESTAMP`,
        [telegramUserId, token.account_id, workspaceId]
      );
      await AuditService.log(workspaceId, undefined, AuditActorType.OWNER, telegramUserId, 'ACCOUNT_LINKED', 'TELEGRAM_IDENTITY', telegramUserId, {
        accountId: token.account_id,
      });
    }

    return { accountId: token.account_id, workspaceId };
  }

  private async auditLinkFailure(telegramUserId: string, reason: string, workspaceId?: string, tokenHash?: string): Promise<void> {
    const db = getDatabaseClient();
    await db.query(
      `INSERT INTO account_link_attempts (id, token_hash, telegram_user_id, workspace_id, outcome, reason)
       VALUES ($1, $2, $3, $4, 'FAILED', $5)`,
      [id('link-attempt'), tokenHash || null, telegramUserId, workspaceId || null, reason]
    );
    if (workspaceId) await AuditService.log(workspaceId, undefined, AuditActorType.SYSTEM, telegramUserId, 'ACCOUNT_LINK_FAILED', 'TELEGRAM_IDENTITY', telegramUserId, { reason });
  }
}
