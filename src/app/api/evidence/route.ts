// ==============================================================
// Evidence & Claims API (Section 17, 34, 77)
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDatabaseClient();
    const url = new URL(req.url);
    const draftId = url.searchParams.get('draftId');

    let claimsQuery = 'SELECT * FROM claims';
    let claimsParams: any[] = [];

    if (draftId) {
      claimsQuery += ' WHERE draft_id = $1';
      claimsParams.push(draftId);
    }

    claimsQuery += ' ORDER BY created_at DESC LIMIT 50';

    let claimsRes = await db.query(claimsQuery, claimsParams);

    if (claimsRes.rowCount === 0 && !draftId) {
      const { seedDatabase } = await import('@/infrastructure/database/seed');
      await seedDatabase(false);
      claimsRes = await db.query(claimsQuery, claimsParams);
    }

    const evidenceQuery = 'SELECT * FROM evidence_items ORDER BY created_at DESC LIMIT 50';
    const evidenceRes = await db.query(evidenceQuery);

    return NextResponse.json({
      success: true,
      claims: claimsRes.rows,
      evidenceItems: evidenceRes.rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch evidence' }, { status: 500 });
  }
}
