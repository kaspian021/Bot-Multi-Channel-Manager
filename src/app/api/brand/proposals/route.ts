import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { apiError, tenantFor } from '@/app/api/api-helpers';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){try{const ctx=await tenantFor(req);const rows=await getDatabaseClient().query(`SELECT p.* FROM channel_brand_proposals p JOIN channels c ON c.id=p.channel_id WHERE c.workspace_id=$1 ORDER BY p.created_at DESC`,[ctx.workspaceId]);return NextResponse.json(rows.rows);}catch(e){return apiError(e);}}
