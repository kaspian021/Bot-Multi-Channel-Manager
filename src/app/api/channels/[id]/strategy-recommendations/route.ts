// ==============================================================
// Strategy Recommendations API (GET, POST)
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { ChannelBrainService } from '@/application/services/channel-brain-service';
import { getDatabaseClient } from '@/infrastructure/database/db-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const brainService = new ChannelBrainService();
  const recs = await brainService.getStrategyRecommendations(params.id);
  return NextResponse.json(recs);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDatabaseClient();
    const body = await req.json();
    const id = `rec-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    await db.query(
      `INSERT INTO strategy_recommendations (
        id, channel_id, title, category, current_value, recommended_value, reason, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')`,
      [
        id,
        params.id,
        body.title || 'Audience Preference Strategy',
        body.category || 'CONTENT_MIX',
        JSON.stringify(body.currentValue || {}),
        JSON.stringify(body.recommendedValue || {}),
        body.reason || 'AI autonomous strategy analysis',
      ]
    );

    return NextResponse.json({ id, status: 'PENDING' }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create recommendation' }, { status: 500 });
  }
}
