import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { UsageMeter } from '@/application/services/entitlement-service';
import { UsageMetric } from '@/domain/types';
import { authenticateTrustedIntegrationRequest, IntegrationAuthenticationError } from '@/infrastructure/security/trusted-integration-auth';
export const dynamic = 'force-dynamic';
const metrics = new Set<UsageMetric>(['AI_REQUEST', 'CONTENT_GENERATION', 'RESEARCH_RUN', 'POST_PUBLISHED', 'CHANNEL_CREATED']);
export async function POST(req: NextRequest) {
  try {
    await authenticateTrustedIntegrationRequest(req);
    const body = await req.json();
    if (!body.accountId || !body.idempotencyKey || !metrics.has(body.metric)) return NextResponse.json({ error: 'accountId, idempotencyKey, and a valid metric are required' }, { status: 400 });
    const account = await getDatabaseClient().query('SELECT id FROM accounts WHERE id = $1', [body.accountId]);
    if (!account.rowCount) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    const recorded = await new UsageMeter().record({ accountId: body.accountId, workspaceId: body.workspaceId, channelId: body.channelId, productKey: body.productKey, metric: body.metric, quantity: Number(body.quantity || 1), source: body.source || 'integration-v1', idempotencyKey: body.idempotencyKey, metadata: body.metadata || {} });
    return NextResponse.json({ accepted: true, duplicate: !recorded }, { status: recorded ? 201 : 200 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Usage event rejected' }, { status: error instanceof IntegrationAuthenticationError ? error.statusCode : 400 }); }
}
