// ==============================================================
// Phase 4 Tenant Context & Authorization Boundary
// ==============================================================
// HTTP authentication is intentionally external to this application. A future
// account provider/website is expected to inject the authenticated external
// identity headers at its trusted boundary. This service only resolves that
// identity to local operational membership and never treats a resource ID as
// authorization.

import { NextRequest } from 'next/server';
import { getDatabaseClient } from '../../infrastructure/database/db-client';
import { WorkspaceRole } from '../../domain/types';

export class TenantAccessError extends Error {
  constructor(message: string, public readonly statusCode = 403) {
    super(message);
    this.name = 'TenantAccessError';
  }
}

export interface TenantContext {
  accountId: string;
  workspaceId: string;
  role: WorkspaceRole;
  telegramUserId?: string;
  activeChannelId?: string;
  isDemo: boolean;
}

const roleRank: Record<WorkspaceRole, number> = {
  VIEWER: 1,
  APPROVER: 2,
  EDITOR: 3,
  ADMIN: 4,
  OWNER: 5,
};

function header(request: NextRequest, name: string): string | undefined {
  return request.headers.get(name) || undefined;
}

/**
 * Resolves an externally-authenticated account to a selected workspace. In
 * DEMO_MODE an explicit database demo fixture is used, never a production
 * fallback. In production missing identity is rejected closed.
 */
export async function resolveTenantContext(request: NextRequest): Promise<TenantContext> {
  const db = getDatabaseClient();
  const demoMode = process.env.DEMO_MODE === 'true';
  let accountId: string | undefined;

  if (demoMode && !header(request, 'x-external-user-id') && !header(request, 'x-account-id')) {
    accountId = process.env.DEMO_ACCOUNT_ID || 'acc-demo-001';
  } else {
    // x-account-id is reserved for a trusted gateway/service-to-service
    // caller. Browser-facing integrations should use external identity.
    accountId = header(request, 'x-account-id');
    if (!accountId) {
      const provider = header(request, 'x-external-provider') || 'digistore';
      const externalUserId = header(request, 'x-external-user-id');
      if (!externalUserId) {
        throw new TenantAccessError('Missing authenticated account context', 401);
      }
      const account = await db.query<{ id: string }>(
        'SELECT id FROM accounts WHERE external_provider = $1 AND external_user_id = $2 AND status = $3',
        [provider, externalUserId, 'ACTIVE']
      );
      if (account.rowCount === 0) throw new TenantAccessError('Unknown or inactive account', 401);
      accountId = account.rows[0].id;
    }
  }

  const requestedWorkspace = header(request, 'x-workspace-id') || undefined;
  const memberships = await db.query<{ workspace_id: string; role: WorkspaceRole; status: string }>(
    `SELECT workspace_id, role, status FROM workspace_members
     WHERE account_id = $1 AND status = 'ACTIVE'
     ORDER BY created_at ASC`,
    [accountId]
  );
  const membership = requestedWorkspace
    ? memberships.rows.find((row) => row.workspace_id === requestedWorkspace)
    : memberships.rows[0];

  if (!membership) {
    throw new TenantAccessError('No active membership for the requested workspace', 403);
  }

  return {
    accountId,
    workspaceId: membership.workspace_id,
    role: membership.role,
    activeChannelId: header(request, 'x-channel-id') || undefined,
    isDemo: demoMode && accountId === (process.env.DEMO_ACCOUNT_ID || 'acc-demo-001'),
  };
}

export function requireWorkspaceRole(context: TenantContext, minimum: WorkspaceRole): void {
  if (roleRank[context.role] < roleRank[minimum]) {
    throw new TenantAccessError(`Workspace role ${minimum} is required`, 403);
  }
}

export async function requireWorkspaceMember(accountId: string, workspaceId: string): Promise<WorkspaceRole> {
  const db = getDatabaseClient();
  const membership = await db.query<{ role: WorkspaceRole }>(
    `SELECT role FROM workspace_members
     WHERE account_id = $1 AND workspace_id = $2 AND status = 'ACTIVE'`,
    [accountId, workspaceId]
  );
  if (membership.rowCount === 0) throw new TenantAccessError('Account is not a workspace member', 403);
  return membership.rows[0].role;
}

export async function requireChannelAccess(context: TenantContext, channelId: string, minimum: WorkspaceRole = 'VIEWER') {
  requireWorkspaceRole(context, minimum);
  const db = getDatabaseClient();
  const channel = await db.query(
    'SELECT * FROM channels WHERE id = $1 AND workspace_id = $2',
    [channelId, context.workspaceId]
  );
  if (channel.rowCount === 0) throw new TenantAccessError('Channel not found in active workspace', 404);
  return channel.rows[0];
}

export async function requireDraftAccess(context: TenantContext, draftId: string, minimum: WorkspaceRole = 'VIEWER') {
  requireWorkspaceRole(context, minimum);
  const db = getDatabaseClient();
  const draft = await db.query(
    'SELECT * FROM content_drafts WHERE id = $1 AND workspace_id = $2',
    [draftId, context.workspaceId]
  );
  if (draft.rowCount === 0) throw new TenantAccessError('Draft not found in active workspace', 404);
  return draft.rows[0];
}

/** Resolve Telegram numeric identity to the exact workspace membership. */
export async function resolveTelegramTenantContext(telegramUserId: number | string, workspaceId?: string): Promise<TenantContext | null> {
  const db = getDatabaseClient();
  const identity = await db.query<{ account_id: string }>(
    `SELECT account_id FROM telegram_identities
     WHERE telegram_user_id = $1 AND status = 'ACTIVE'`,
    [String(telegramUserId)]
  );
  if (identity.rowCount === 0) return null;

  const contextRow = await db.query<{ active_workspace_id: string | null; active_channel_id: string | null }>(
    'SELECT active_workspace_id, active_channel_id FROM telegram_user_context WHERE telegram_user_id = $1',
    [String(telegramUserId)]
  );
  const targetWorkspace = workspaceId || contextRow.rows[0]?.active_workspace_id || undefined;
  const memberships = await db.query<{ workspace_id: string; role: WorkspaceRole }>(
    `SELECT workspace_id, role FROM workspace_members
     WHERE account_id = $1 AND status = 'ACTIVE' ORDER BY created_at ASC`,
    [identity.rows[0].account_id]
  );
  const membership = targetWorkspace
    ? memberships.rows.find((m) => m.workspace_id === targetWorkspace)
    : memberships.rows[0];
  if (!membership) return null;

  return {
    accountId: identity.rows[0].account_id,
    workspaceId: membership.workspace_id,
    role: membership.role,
    telegramUserId: String(telegramUserId),
    activeChannelId: contextRow.rows[0]?.active_channel_id || undefined,
    isDemo: process.env.DEMO_MODE === 'true' && identity.rows[0].account_id === (process.env.DEMO_ACCOUNT_ID || 'acc-demo-001'),
  };
}

export async function selectTelegramWorkspace(telegramUserId: number | string, workspaceId: string): Promise<TenantContext> {
  const context = await resolveTelegramTenantContext(telegramUserId, workspaceId);
  if (!context) throw new TenantAccessError('Telegram account is not a member of this workspace', 403);
  const db = getDatabaseClient();
  await db.query(
    `INSERT INTO telegram_user_context (telegram_user_id, account_id, active_workspace_id, active_channel_id, updated_at)
     VALUES ($1, $2, $3, NULL, CURRENT_TIMESTAMP)
     ON CONFLICT (telegram_user_id) DO UPDATE SET account_id = EXCLUDED.account_id,
       active_workspace_id = EXCLUDED.active_workspace_id, active_channel_id = NULL, updated_at = CURRENT_TIMESTAMP`,
    [String(telegramUserId), context.accountId, workspaceId]
  );
  return context;
}

export async function selectTelegramChannel(telegramUserId: number | string, channelId: string): Promise<TenantContext> {
  const context = await resolveTelegramTenantContext(telegramUserId);
  if (!context) throw new TenantAccessError('Telegram account is not linked', 401);
  await requireChannelAccess(context, channelId, 'VIEWER');
  const db = getDatabaseClient();
  await db.query(
    `INSERT INTO telegram_user_context (telegram_user_id, account_id, active_workspace_id, active_channel_id, updated_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     ON CONFLICT (telegram_user_id) DO UPDATE SET account_id = EXCLUDED.account_id,
       active_workspace_id = EXCLUDED.active_workspace_id, active_channel_id = EXCLUDED.active_channel_id, updated_at = CURRENT_TIMESTAMP`,
    [String(telegramUserId), context.accountId, context.workspaceId, channelId]
  );
  return { ...context, activeChannelId: channelId };
}
