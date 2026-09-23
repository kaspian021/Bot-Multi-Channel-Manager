import { NextRequest, NextResponse } from 'next/server';
import { OnboardingService } from '@/application/services/onboarding-service';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireChannelAccess, requireWorkspaceRole } from '@/application/services/tenant-context-service';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest,{params}:{params:{id:string}}){try{const ctx=await tenantFor(req);requireWorkspaceRole(ctx,'EDITOR');await requireChannelAccess(ctx,params.id,'EDITOR');const body=await req.json();return NextResponse.json(await new OnboardingService().processUserMessage(params.id,ctx.accountId,body.message||''));}catch(e){return apiError(e);}}
