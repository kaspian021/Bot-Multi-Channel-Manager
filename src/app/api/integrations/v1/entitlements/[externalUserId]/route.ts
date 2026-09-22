import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { EntitlementService } from '@/application/services/entitlement-service';

export const dynamic = 'force-dynamic';
function authorized(req: NextRequest): boolean {
  const key = process.env.INTEGRATION_API_KEY;
  if (!key) return process.env.DEMO_MODE === 'true';
  const given = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const a = Buffer.from(key); const b = Buffer.from(given);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export async function GET(req: NextRequest, { params }: { params: { externalUserId: string } }) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized integration caller' }, { status: 401 });
  const provider = req.nextUrl.searchParams.get('provider') || 'digistore';
  const account = await getDatabaseClient().query<{ id: string }>('SELECT id FROM accounts WHERE external_provider = $1 AND external_user_id = $2', [provider, params.externalUserId]);
  if (!account.rowCount) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  try {
    const entitlement = await new EntitlementService().resolve(account.rows[0].id);
    if (!entitlement) return NextResponse.json({ error: 'Entitlement not found' }, { status: 404 });
    return NextResponse.json(entitlement);
  } catch { return NextResponse.json({ error: 'Entitlement unavailable' }, { status: 503 }); }
}
