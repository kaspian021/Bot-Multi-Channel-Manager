// ==============================================================
// Channel Brain Restore API (POST)
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { ChannelBrainService } from '@/application/services/channel-brain-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string; versionId: string } }) {
  try {
    const brainService = new ChannelBrainService();
    const versionNum = parseInt(params.versionId, 10);
    const restored = await brainService.restoreVersion(params.id, versionNum, 'owner');
    return NextResponse.json(restored);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to restore Channel Brain version' }, { status: 400 });
  }
}
