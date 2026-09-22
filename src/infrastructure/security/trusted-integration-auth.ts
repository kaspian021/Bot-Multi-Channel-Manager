// ==============================================================
// Trusted product-to-product request authentication
// ==============================================================
// This is deliberately separate from human/browser authentication. It proves
// that a configured integration service, not an arbitrary browser, asserted
// the account/external-identity headers used at the tenant boundary.

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { getDatabaseClient } from '../database/db-client';

export class IntegrationAuthenticationError extends Error {
  constructor(message: string, public readonly statusCode = 401) { super(message); this.name = 'IntegrationAuthenticationError'; }
}

const equal = (left: string, right: string): boolean => {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/**
 * Validates X-Integration-Key/Timestamp/Signature/Request-Id over
 * `${timestamp}.${method}.${path}.${rawBody}`. A durable nonce table turns a
 * valid signed request into a one-time message; business idempotency remains
 * the responsibility of the receiving operation's own idempotency key.
 */
export async function authenticateTrustedIntegrationRequest(request: NextRequest): Promise<{ keyId: string; requestId: string }> {
  const configuredKey = process.env.INTEGRATION_AUTH_KEY;
  const secret = process.env.INTEGRATION_REQUEST_SECRET;
  const keyId = request.headers.get('x-integration-key') || '';
  const timestamp = request.headers.get('x-integration-timestamp') || '';
  const signature = (request.headers.get('x-integration-signature') || '').replace(/^sha256=/i, '');
  const requestId = request.headers.get('x-integration-request-id') || '';
  if (!configuredKey || !secret) throw new IntegrationAuthenticationError('Trusted integration authentication is not configured', 503);
  if (!keyId || !timestamp || !signature || !requestId) throw new IntegrationAuthenticationError('Missing integration authentication headers');
  if (!equal(configuredKey, keyId)) throw new IntegrationAuthenticationError('Integration key is invalid');
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() - seconds * 1000) > Math.max(1, Number(process.env.INTEGRATION_REQUEST_MAX_AGE_SECONDS || 300)) * 1000) {
    throw new IntegrationAuthenticationError('Integration timestamp is expired or invalid');
  }
  const rawBody = await request.clone().text();
  const path = request.nextUrl.pathname;
  const signed = `${timestamp}.${request.method.toUpperCase()}.${path}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex');
  if (!equal(expected, signature)) throw new IntegrationAuthenticationError('Integration signature is invalid');

  const requestHash = crypto.createHash('sha256').update(signed).digest('hex');
  const inserted = await getDatabaseClient().query(
    `INSERT INTO integration_request_nonces (integration_key, request_id, request_hash)
     VALUES ($1, $2, $3) ON CONFLICT (integration_key, request_id) DO NOTHING
     RETURNING request_id`, [keyId, requestId, requestHash]
  );
  if (!inserted.rowCount) throw new IntegrationAuthenticationError('Integration request has already been processed', 409);
  return { keyId, requestId };
}
