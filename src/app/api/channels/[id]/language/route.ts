import { NextRequest, NextResponse } from 'next/server';
import { ChannelBrainService } from '@/application/services/channel-brain-service';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireChannelAccess, requireWorkspaceRole } from '@/application/services/tenant-context-service';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest,{params}:{params:{id:string}}){try{const ctx=await tenantFor(req);await requireChannelAccess(ctx,params.id);return NextResponse.json(await new ChannelBrainService().getLanguageSettings(params.id));}catch(e){return apiError(e);}}
export async function PUT(req:NextRequest,{params}:{params:{id:string}}){try{const ctx=await tenantFor(req);requireWorkspaceRole(ctx,'EDITOR');await requireChannelAccess(ctx,params.id,'EDITOR');return NextResponse.json(await new ChannelBrainService().updateLanguageSettings(params.id,await req.json()));}catch(e){return apiError(e);}}
