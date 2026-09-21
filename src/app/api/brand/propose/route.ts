import { NextRequest, NextResponse } from 'next/server';
import { BrandService } from '@/application/services/brand-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const channelId = body.channelId || 'ch-futurestack-001';

    const brandService = new BrandService();
    const proposal = await brandService.createBrandingProposal(channelId);

    return NextResponse.json(proposal);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Brand proposal failed' }, { status: 500 });
  }
}
