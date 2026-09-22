import { NextRequest, NextResponse } from 'next/server';
import { ChannelBrainService } from '@/application/services/channel-brain-service';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireChannelAccess } from '@/application/services/tenant-context-service';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest,{params}:{params:{id:string}}){try{const ctx=await tenantFor(req);await requireChannelAccess(ctx,params.id);return NextResponse.json(await new ChannelBrainService().getVersions(params.id));}catch(e){return apiError(e);}}
