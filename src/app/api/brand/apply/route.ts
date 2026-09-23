import { NextRequest, NextResponse } from 'next/server';
import { BrandService } from '@/application/services/brand-service';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { apiError, tenantFor } from '@/app/api/api-helpers';
import { requireChannelAccess, requireWorkspaceRole } from '@/application/services/tenant-context-service';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest){try{const ctx=await tenantFor(req);requireWorkspaceRole(ctx,'APPROVER');const body=await req.json();if(!body.proposalId)return NextResponse.json({error:'proposalId is required'},{status:400});const proposal=await getDatabaseClient().query('SELECT channel_id FROM channel_brand_proposals WHERE id=$1',[body.proposalId]);if(!proposal.rowCount)return NextResponse.json({error:'Proposal not found'},{status:404});await requireChannelAccess(ctx,proposal.rows[0].channel_id,'APPROVER');await new BrandService().applyBrandingProposal(body.proposalId,ctx.accountId);return NextResponse.json({success:true,message:'Brand changes applied to channel'});}catch(e){return apiError(e);}}
