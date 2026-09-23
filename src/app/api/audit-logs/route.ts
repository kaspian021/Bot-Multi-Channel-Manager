import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { apiError, tenantFor } from '@/app/api/api-helpers';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const context = await tenantFor(req); const db = getDatabaseClient();
    const res = await db.query('SELECT * FROM audit_logs WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 100', [context.workspaceId]);
    return NextResponse.json(res.rows.map((r: any) => ({ ...r, metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata })));
  } catch (error) { return apiError(error, 'Failed to load audit logs'); }
}
