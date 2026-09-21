// ==============================================================
// Channel Language Settings API (GET, PUT)
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { ChannelBrainService } from '@/application/services/channel-brain-service';
import { seedDatabase } from '@/infrastructure/database/seed';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await seedDatabase(false);
  const brainService = new ChannelBrainService();
  const settings = await brainService.getLanguageSettings(params.id);
  if (!settings) {
    return NextResponse.json({ error: 'Language settings not found' }, { status: 404 });
  }
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const brainService = new ChannelBrainService();
    const body = await req.json();
    const saved = await brainService.updateLanguageSettings(params.id, body);
    return NextResponse.json(saved);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update Language Settings' }, { status: 500 });
  }
}
