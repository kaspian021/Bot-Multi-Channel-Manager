import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireChannelAccess, requireWorkspaceRole } from '@/application/services/tenant-context-service';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) { try { const ctx = await tenantFor(req); const res = await getDatabaseClient().query(`SELECT s.* FROM content_sources s JOIN channels c ON c.id=s.channel_id WHERE c.workspace_id=$1 ORDER BY s.priority DESC,s.created_at DESC`,[ctx.workspaceId]); return NextResponse.json(res.rows); } catch(e){ return apiError(e); } }
export async function POST(req: NextRequest) { try { const ctx=await tenantFor(req); requireWorkspaceRole(ctx,'EDITOR'); const body=await req.json(); const channelId=body.channelId || ctx.activeChannelId; if(!channelId || !body.name || !body.url) return NextResponse.json({error:'channelId, name, and url are required'},{status:400}); await requireChannelAccess(ctx,channelId,'EDITOR'); const db=getDatabaseClient(); const id=`src-${crypto.randomUUID()}`; await db.query(`INSERT INTO content_sources (id,channel_id,name,type,url,priority,trust_score) VALUES ($1,$2,$3,$4,$5,$6,$7)`,[id,channelId,body.name,body.type || 'WEB',body.url,body.priority || 5,body.trustScore || 80]); return NextResponse.json((await db.query('SELECT * FROM content_sources WHERE id=$1',[id])).rows[0],{status:201}); }catch(e){return apiError(e);} }
