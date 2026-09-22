// ==============================================================
// Versioned integration webhook signature verifier (HMAC-SHA256)
// ==============================================================

import crypto from 'crypto';

export class WebhookVerificationError extends Error {
  constructor(message: string) { super(message); this.name = 'WebhookVerificationError'; }
}

export interface VerifiedWebhook {
  eventId: string;
  timestamp: number;
}

/**
 * Signature format: hex(HMAC_SHA256(`${timestamp}.${rawBody}`)). The verifier
 * compares fixed-length buffers with timingSafeEqual and accepts a 5-minute
 * clock skew by default. Replay event IDs are persisted by SubscriptionService.
 */
export function verifyIntegrationWebhook(input: {
  rawBody: string;
  signature?: string | null;
  timestamp?: string | null;
  eventId?: string | null;
  secret?: string;
  maxAgeSeconds?: number;
}): VerifiedWebhook {
  const secret = input.secret || process.env.INTEGRATION_WEBHOOK_SECRET;
  if (!secret) throw new WebhookVerificationError('Webhook verification is not configured');
  if (!input.signature || !input.timestamp || !input.eventId) throw new WebhookVerificationError('Missing webhook signature headers');
  const timestamp = Number(input.timestamp);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp * 1000) > (input.maxAgeSeconds || 300) * 1000) {
    throw new WebhookVerificationError('Webhook timestamp is expired or invalid');
  }
  const expected = crypto.createHmac('sha256', secret).update(`${input.timestamp}.${input.rawBody}`).digest('hex');
  const received = input.signature.replace(/^sha256=/i, '');
  const left = Buffer.from(expected, 'hex');
  const right = Buffer.from(received, 'hex');
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    throw new WebhookVerificationError('Webhook signature is invalid');
  }
  return { eventId: input.eventId, timestamp };
}
