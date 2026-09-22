import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ChannelBrainService } from '@/application/services/channel-brain-service';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireChannelAccess, requireWorkspaceRole } from '@/application/services/tenant-context-service';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest,{params}:{params:{id:string}}){try{const ctx=await tenantFor(req);await requireChannelAccess(ctx,params.id);return NextResponse.json(await new ChannelBrainService().getStrategyRecommendations(params.id));}catch(e){return apiError(e);}}
export async function POST(req:NextRequest,{params}:{params:{id:string}}){try{const ctx=await tenantFor(req);requireWorkspaceRole(ctx,'EDITOR');await requireChannelAccess(ctx,params.id,'EDITOR');const body=await req.json();const id=`rec-${crypto.randomUUID()}`;await getDatabaseClient().query(`INSERT INTO strategy_recommendations(id,channel_id,title,category,current_value,recommended_value,reason,status) VALUES($1,$2,$3,$4,$5,$6,$7,'PENDING')`,[id,params.id,body.title||'Editorial strategy recommendation',body.category||'CONTENT_MIX',JSON.stringify(body.currentValue||{}),JSON.stringify(body.recommendedValue||{}),body.reason||'Owner approval required']);return NextResponse.json({id,status:'PENDING'},{status:201});}catch(e){return apiError(e);}}
