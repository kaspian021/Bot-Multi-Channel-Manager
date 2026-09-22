import { NextRequest, NextResponse } from 'next/server';
import { ChannelBrainService } from '@/application/services/channel-brain-service';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireChannelAccess, requireWorkspaceRole } from '@/application/services/tenant-context-service';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest,{params}:{params:{id:string}}){try{const ctx=await tenantFor(req);await requireChannelAccess(ctx,params.id);return NextResponse.json(await new ChannelBrainService().getPreferences(params.id));}catch(e){return apiError(e);}}
export async function POST(req:NextRequest,{params}:{params:{id:string}}){try{const ctx=await tenantFor(req);requireWorkspaceRole(ctx,'EDITOR');await requireChannelAccess(ctx,params.id,'EDITOR');const body=await req.json();const explicit=body.type==='EXPLICIT'||body.source==='EXPLICIT';const created=await new ChannelBrainService().addPreference(params.id,{channelId:params.id,type:explicit?'EXPLICIT':'INFERRED',category:body.category||'STYLE',rule:body.rule||body.value||body.key,confidence:body.confidence ?? (explicit?1:0.7),source:body.source||'MANUAL',status:'ACTIVE'});return NextResponse.json(created,{status:201});}catch(e){return apiError(e);}}
