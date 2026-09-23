import { NextRequest, NextResponse } from 'next/server';
import { ChannelBrainService } from '@/application/services/channel-brain-service';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireChannelAccess, requireWorkspaceRole } from '@/application/services/tenant-context-service';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest,{params}:{params:{id:string;versionId:string}}){try{const ctx=await tenantFor(req);requireWorkspaceRole(ctx,'APPROVER');await requireChannelAccess(ctx,params.id,'APPROVER');return NextResponse.json(await new ChannelBrainService().restoreVersion(params.id,Number(params.versionId),ctx.accountId));}catch(e){return apiError(e);}}
