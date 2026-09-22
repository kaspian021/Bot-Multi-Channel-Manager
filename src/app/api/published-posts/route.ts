import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { apiError, tenantFor } from '@/app/api/api-helpers';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) { try { const ctx=await tenantFor(req); const res=await getDatabaseClient().query(`SELECT pp.*,cd.topic,cd.headline,ch.name as channel_name FROM published_posts pp LEFT JOIN content_drafts cd ON pp.draft_id=cd.id LEFT JOIN channels ch ON pp.channel_id=ch.id WHERE pp.workspace_id=$1 ORDER BY pp.published_at DESC LIMIT 100`,[ctx.workspaceId]); return NextResponse.json(res.rows); } catch(e){return apiError(e);} }
