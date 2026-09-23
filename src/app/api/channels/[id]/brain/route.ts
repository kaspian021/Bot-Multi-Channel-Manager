import { NextRequest, NextResponse } from 'next/server';
import { ChannelBrainService } from '@/application/services/channel-brain-service';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireChannelAccess, requireWorkspaceRole } from '@/application/services/tenant-context-service';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest,{params}:{params:{id:string}}){try{const ctx=await tenantFor(req);await requireChannelAccess(ctx,params.id);const brain=await new ChannelBrainService().getBrain(params.id);return brain?NextResponse.json(brain):NextResponse.json({error:'Channel Brain not found'},{status:404});}catch(e){return apiError(e);}}
export async function PUT(req:NextRequest,{params}:{params:{id:string}}){try{const ctx=await tenantFor(req);requireWorkspaceRole(ctx,'EDITOR');await requireChannelAccess(ctx,params.id,'EDITOR');const body=await req.json();const saved=await new ChannelBrainService().saveBrain(params.id,body,ctx.accountId,body.reason || 'Manual workspace update');return NextResponse.json(saved);}catch(e){return apiError(e,'Failed to update Channel Brain');}}
