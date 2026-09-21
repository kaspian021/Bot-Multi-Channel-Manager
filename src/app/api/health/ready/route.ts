import { NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDatabaseClient();
    await db.query('SELECT 1');
    return NextResponse.json({ ready: true, status: 'READY' }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ready: false, error: err?.message || 'Database not ready' }, { status: 503 });
  }
}
