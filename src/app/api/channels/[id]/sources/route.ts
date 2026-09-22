import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireChannelAccess, requireWorkspaceRole } from '@/application/services/tenant-context-service';
export const dynamic = 'force-dynamic';
export async function GET(req:NextRequest,{params}:{params:{id:string}}){try{const ctx=await tenantFor(req);await requireChannelAccess(ctx,params.id);return NextResponse.json((await getDatabaseClient().query('SELECT * FROM content_sources WHERE channel_id=$1 ORDER BY priority DESC',[params.id])).rows);}catch(e){return apiError(e);}}
export async function POST(req:NextRequest,{params}:{params:{id:string}}){try{const ctx=await tenantFor(req);requireWorkspaceRole(ctx,'EDITOR');await requireChannelAccess(ctx,params.id,'EDITOR');const body=await req.json();const id=`src-${crypto.randomUUID()}`;const db=getDatabaseClient();await db.query(`INSERT INTO content_sources (id,channel_id,name,type,url,priority,trust_score) VALUES($1,$2,$3,$4,$5,$6,$7)`,[id,params.id,body.name,body.type||'WEB',body.url,body.priority||5,body.trustScore||80]);return NextResponse.json((await db.query('SELECT * FROM content_sources WHERE id=$1',[id])).rows[0],{status:201});}catch(e){return apiError(e);}}
