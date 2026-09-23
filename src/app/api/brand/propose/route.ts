import { NextRequest, NextResponse } from 'next/server';
import { BrandService } from '@/application/services/brand-service';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireChannelAccess, requireWorkspaceRole } from '@/application/services/tenant-context-service';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest){try{const ctx=await tenantFor(req);requireWorkspaceRole(ctx,'EDITOR');const body=await req.json().catch(()=>({}));const channelId=body.channelId || ctx.activeChannelId;if(!channelId)return NextResponse.json({error:'channelId is required'},{status:400});await requireChannelAccess(ctx,channelId,'EDITOR');return NextResponse.json(await new BrandService().createBrandingProposal(channelId));}catch(e){return apiError(e,'Brand proposal failed');}}
