// ==============================================================
// Channel Brain API (GET, PUT) — Section 25 Specification
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { ChannelBrainService } from '@/application/services/channel-brain-service';
import { seedDatabase } from '@/infrastructure/database/seed';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await seedDatabase(false);
  const brainService = new ChannelBrainService();
  const brain = await brainService.getBrain(params.id);
  if (!brain) {
    return NextResponse.json({ error: 'Channel Brain not found' }, { status: 404 });
  }
  return NextResponse.json(brain);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const brainService = new ChannelBrainService();
    const body = await req.json();
    const changedBy = body.changedBy || 'owner';
    const reason = body.reason || 'Manual update via Admin Dashboard';

    const saved = await brainService.saveBrain(params.id, body, changedBy, reason);
    return NextResponse.json(saved);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update Channel Brain' }, { status: 500 });
  }
}
