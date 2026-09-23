import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { apiError, tenantFor } from '@/app/api/api-helpers';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) { try { const ctx=await tenantFor(req); return NextResponse.json((await getDatabaseClient().query('SELECT * FROM research_runs WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 50',[ctx.workspaceId])).rows); }catch(e){return apiError(e);} }
