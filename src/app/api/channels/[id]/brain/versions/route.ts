// ==============================================================
// Channel Brain Versions API (GET)
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { ChannelBrainService } from '@/application/services/channel-brain-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const brainService = new ChannelBrainService();
  const versions = await brainService.getVersions(params.id);
  return NextResponse.json(versions);
}
