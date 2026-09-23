import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireChannelAccess } from '@/application/services/tenant-context-service';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) { try { const ctx=await tenantFor(req); const channelId=req.nextUrl.searchParams.get('channelId'); if(channelId) await requireChannelAccess(ctx,channelId); const params=[ctx.workspaceId]; let sql='SELECT * FROM content_candidates WHERE workspace_id=$1'; if(channelId){params.push(channelId);sql+=' AND channel_id=$2';} sql+=' ORDER BY created_at DESC LIMIT 100'; const res=await getDatabaseClient().query(sql,params); return NextResponse.json(res.rows.map((r:any)=>({...r,score:typeof r.score_json==='string'?JSON.parse(r.score_json):r.score_json,extractedClaims:typeof r.extracted_claims==='string'?JSON.parse(r.extracted_claims):r.extracted_claims}))); }catch(e){return apiError(e);} }
