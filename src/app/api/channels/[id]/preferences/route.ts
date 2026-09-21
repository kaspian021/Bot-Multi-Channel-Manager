// ==============================================================
// Owner Preferences API (GET, POST)
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { ChannelBrainService } from '@/application/services/channel-brain-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const brainService = new ChannelBrainService();
  const prefs = await brainService.getPreferences(params.id);
  return NextResponse.json(prefs);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const brainService = new ChannelBrainService();
    const body = await req.json();

    const created = await brainService.addPreference(params.id, {
      channelId: params.id,
      type: body.type || body.source === 'EXPLICIT' ? 'EXPLICIT' : 'INFERRED',
      category: body.category || 'STYLE',
      rule: body.rule || body.value || body.key,
      confidence: body.confidence !== undefined ? body.confidence : 1.0,
      source: body.source || 'MANUAL',
      status: 'ACTIVE',
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to save preference' }, { status: 500 });
  }
}
