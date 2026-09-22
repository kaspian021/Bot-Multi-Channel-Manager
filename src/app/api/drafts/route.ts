import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireChannelAccess } from '@/application/services/tenant-context-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const context = await tenantFor(req);
    const db = getDatabaseClient();
    const status = req.nextUrl.searchParams.get('status');
    const channelId = req.nextUrl.searchParams.get('channelId');
    if (channelId) await requireChannelAccess(context, channelId);
    const params: string[] = [context.workspaceId];
    let sql = 'SELECT * FROM content_drafts WHERE workspace_id = $1';
    if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
    if (channelId) { params.push(channelId); sql += ` AND channel_id = $${params.length}`; }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const res = await db.query(sql, params);
    return NextResponse.json(res.rows.map((r: any) => ({
      ...r,
      whyItMatters: typeof r.why_it_matters === 'string' ? JSON.parse(r.why_it_matters) : r.why_it_matters,
      sources: typeof r.sources === 'string' ? JSON.parse(r.sources) : r.sources,
      factCheckItems: typeof r.fact_check_items === 'string' ? JSON.parse(r.fact_check_items) : r.fact_check_items,
      qualityEvaluation: typeof r.quality_evaluation === 'string' ? JSON.parse(r.quality_evaluation) : r.quality_evaluation,
    })));
  } catch (error) { return apiError(error, 'Failed to list drafts'); }
}
