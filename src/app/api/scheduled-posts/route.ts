import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { apiError, tenantFor } from '@/app/api/api-helpers';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const context = await tenantFor(req); const db = getDatabaseClient();
    const res = await db.query(`SELECT sp.*, cd.title, cd.headline, cd.topic, cd.content_type, ch.name as channel_name FROM scheduled_posts sp LEFT JOIN content_drafts cd ON sp.draft_id = cd.id LEFT JOIN channels ch ON sp.channel_id = ch.id WHERE sp.workspace_id = $1 ORDER BY sp.scheduled_for ASC`, [context.workspaceId]);
    return NextResponse.json(res.rows);
  } catch (error) { return apiError(error, 'Failed to list scheduled posts'); }
}
