import { NextRequest, NextResponse } from 'next/server';
import { BrandService } from '@/application/services/brand-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { proposalId, ownerUserId } = body;

    if (!proposalId) return NextResponse.json({ error: 'proposalId is required' }, { status: 400 });

    const brandService = new BrandService();
    await brandService.applyBrandingProposal(proposalId, ownerUserId || '987654321');

    return NextResponse.json({ success: true, message: 'Brand changes applied to channel' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to apply branding' }, { status: 500 });
  }
}
