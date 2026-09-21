// ==============================================================
// Source Trust & Health API (Section 15, 71, 72)
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDatabaseClient();
    const result = await db.query(`
      SELECT 
        id, 
        channel_id, 
        name, 
        url, 
        type, 
        trust_tier, 
        trust_score, 
        health_status, 
        consecutive_failures, 
        last_failure_at, 
        last_error, 
        is_active,
        created_at
      FROM content_sources
      ORDER BY trust_tier ASC, trust_score DESC
    `);

    return NextResponse.json({
      success: true,
      sources: result.rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch source health' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDatabaseClient();
    const { sourceId, healthStatus, trustTier } = await req.json();

    if (!sourceId) {
      return NextResponse.json({ error: 'sourceId is required' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (healthStatus) {
      updates.push(`health_status = $${idx++}`);
      values.push(healthStatus);
    }

    if (trustTier) {
      updates.push(`trust_tier = $${idx++}`);
      values.push(trustTier);
    }

    values.push(sourceId);
    const query = `
      UPDATE content_sources 
      SET ${updates.join(', ')} 
      WHERE id = $${idx}
      RETURNING *
    `;

    const res = await db.query(query, values);

    return NextResponse.json({
      success: true,
      source: res.rows[0],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update source' }, { status: 500 });
  }
}
