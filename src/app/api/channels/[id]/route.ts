// ==============================================================
// Tenant-scoped channel item API
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireChannelAccess, requireWorkspaceRole } from '@/application/services/tenant-context-service';
import { AuditService } from '@/application/services/audit-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await tenantFor(req);
    const channel = await requireChannelAccess(context, params.id);
    const db = getDatabaseClient();
    const [strat, topics, sources] = await Promise.all([
      db.query('SELECT * FROM channel_strategies WHERE channel_id = $1', [params.id]),
      db.query('SELECT * FROM topics WHERE channel_id = $1', [params.id]),
      db.query('SELECT * FROM content_sources WHERE channel_id = $1', [params.id]),
    ]);
    return NextResponse.json({ channel, strategy: strat.rows[0] || null, topics: topics.rows, sources: sources.rows });
  } catch (error) { return apiError(error, 'Failed to load channel'); }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await tenantFor(req);
    requireWorkspaceRole(context, 'EDITOR');
    await requireChannelAccess(context, params.id, 'EDITOR');
    const body = await req.json();
    const { name, description, bio, status, postingFrequency, timezone, language } = body;
    const db = getDatabaseClient();
    await db.query(
      `UPDATE channels SET name = COALESCE($1, name), description = COALESCE($2, description), bio = COALESCE($3, bio),
       status = COALESCE($4, status), posting_frequency = COALESCE($5, posting_frequency), timezone = COALESCE($6, timezone),
       language = COALESCE($7, language), updated_at = CURRENT_TIMESTAMP WHERE id = $8 AND workspace_id = $9`,
      [name, description, bio, status, postingFrequency, timezone, language, params.id, context.workspaceId]
    );
    const updated = await db.query('SELECT * FROM channels WHERE id = $1 AND workspace_id = $2', [params.id, context.workspaceId]);
    return NextResponse.json(updated.rows[0]);
  } catch (error) { return apiError(error, 'Update failed'); }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await tenantFor(req);
    requireWorkspaceRole(context, 'OWNER');
    await requireChannelAccess(context, params.id, 'OWNER');
    const db = getDatabaseClient();
    await db.query('UPDATE channels SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND workspace_id = $3', ['ARCHIVED', params.id, context.workspaceId]);
    await AuditService.log(context.workspaceId, params.id, 'OWNER' as any, context.accountId, 'CHANNEL_UNLINKED', 'CHANNEL', params.id);
    return NextResponse.json({ message: 'Channel archived' });
  } catch (error) { return apiError(error, 'Delete failed'); }
}
