import { NextRequest, NextResponse } from 'next/server';
import { verifyIntegrationWebhook, WebhookVerificationError } from '@/infrastructure/security/integration-webhook-verifier';
import { SubscriptionService } from '@/application/services/subscription-service';
import { SubscriptionStatus } from '@/domain/types';
export const dynamic = 'force-dynamic';
const allowedEvents = new Set(['subscription.created', 'subscription.trialing', 'subscription.activated', 'subscription.renewed', 'subscription.upgraded', 'subscription.downgraded', 'subscription.past_due', 'subscription.suspended', 'subscription.cancelled', 'subscription.expired']);
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  try {
    const verified = verifyIntegrationWebhook({ rawBody, signature: req.headers.get('x-integration-signature'), timestamp: req.headers.get('x-integration-timestamp'), eventId: req.headers.get('x-integration-event-id') });
    const body = JSON.parse(rawBody);
    if (!allowedEvents.has(body.eventType) || !body.accountId || !body.productKey || !body.planCode || !Object.values(SubscriptionStatus).includes(body.status)) {
      return NextResponse.json({ error: 'Invalid subscription event contract' }, { status: 400 });
    }
    await new SubscriptionService().apply({ ...body, eventId: verified.eventId });
    return NextResponse.json({ accepted: true }, { status: 202 });
  } catch (error) {
    const status = error instanceof WebhookVerificationError ? 401 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook rejected' }, { status });
  }
}
