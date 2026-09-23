import { NextRequest, NextResponse } from 'next/server';
import { authenticateTrustedIntegrationRequest, IntegrationAuthenticationError } from '@/infrastructure/security/trusted-integration-auth';
import { SubscriptionService } from '@/application/services/subscription-service';
import { SubscriptionStatus } from '@/domain/types';
export const dynamic = 'force-dynamic';
const allowedEvents = new Set(['subscription.created', 'subscription.trialing', 'subscription.activated', 'subscription.renewed', 'subscription.upgraded', 'subscription.downgraded', 'subscription.past_due', 'subscription.suspended', 'subscription.cancelled', 'subscription.expired']);
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateTrustedIntegrationRequest(req);
    const body = await req.json();
    if (!allowedEvents.has(body.eventType) || !body.accountId || !body.productKey || !body.planCode || !Object.values(SubscriptionStatus).includes(body.status)) return NextResponse.json({ error: 'Invalid subscription event contract' }, { status: 400 });
    await new SubscriptionService().apply({ ...body, eventId: body.eventId || auth.requestId });
    return NextResponse.json({ accepted: true }, { status: 202 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook rejected' }, { status: error instanceof IntegrationAuthenticationError ? error.statusCode : 400 }); }
}
