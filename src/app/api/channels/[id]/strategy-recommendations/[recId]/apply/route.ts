import { NextRequest, NextResponse } from 'next/server';
import { ChannelBrainService } from '@/application/services/channel-brain-service';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireChannelAccess, requireWorkspaceRole } from '@/application/services/tenant-context-service';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest,{params}:{params:{id:string;recId:string}}){try{const ctx=await tenantFor(req);requireWorkspaceRole(ctx,'APPROVER');await requireChannelAccess(ctx,params.id,'APPROVER');const service=new ChannelBrainService();await service.applyStrategyRecommendation(params.recId,params.id);return NextResponse.json({success:true,brain:await service.getBrain(params.id)});}catch(e){return apiError(e);}}
