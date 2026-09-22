import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { UsageMeter } from '@/application/services/entitlement-service';
import { UsageMetric } from '@/domain/types';
export const dynamic = 'force-dynamic';
function authorized(req: NextRequest): boolean { const key = process.env.INTEGRATION_API_KEY; if (!key) return process.env.DEMO_MODE === 'true'; const value = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''; const a = Buffer.from(key), b = Buffer.from(value); return a.length === b.length && crypto.timingSafeEqual(a, b); }
const metrics = new Set<UsageMetric>(['AI_REQUEST', 'CONTENT_GENERATION', 'RESEARCH_RUN', 'POST_PUBLISHED', 'CHANNEL_CREATED']);
export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized integration caller' }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.accountId || !body.idempotencyKey || !metrics.has(body.metric)) return NextResponse.json({ error: 'accountId, idempotencyKey, and a valid metric are required' }, { status: 400 });
    const account = await getDatabaseClient().query('SELECT id FROM accounts WHERE id = $1', [body.accountId]);
    if (!account.rowCount) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    const recorded = await new UsageMeter().record({ accountId: body.accountId, workspaceId: body.workspaceId, channelId: body.channelId, productKey: body.productKey, metric: body.metric, quantity: Number(body.quantity || 1), source: body.source || 'integration-v1', idempotencyKey: body.idempotencyKey, metadata: body.metadata || {} });
    return NextResponse.json({ accepted: true, duplicate: !recorded }, { status: recorded ? 201 : 200 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Usage event rejected' }, { status: 400 }); }
}
