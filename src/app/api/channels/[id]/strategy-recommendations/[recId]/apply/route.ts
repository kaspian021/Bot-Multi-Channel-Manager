// ==============================================================
// Apply Strategy Recommendation API (POST)
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { ChannelBrainService } from '@/application/services/channel-brain-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string; recId: string } }) {
  try {
    const brainService = new ChannelBrainService();
    await brainService.applyStrategyRecommendation(params.recId, params.id);
    const updatedBrain = await brainService.getBrain(params.id);
    return NextResponse.json({ success: true, brain: updatedBrain });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to apply recommendation' }, { status: 400 });
  }
}
