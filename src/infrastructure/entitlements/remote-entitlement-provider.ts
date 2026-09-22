import crypto from 'crypto';
import { Entitlement } from '../../domain/types';
import { EntitlementProvider } from '../../application/interfaces/entitlement-provider';
import { getDatabaseClient } from '../database/db-client';

/** Optional future provider using the same signed machine-to-machine contract. */
export class RemoteEntitlementProvider implements EntitlementProvider {
  constructor(private readonly baseUrl = process.env.INTEGRATION_API_BASE_URL, private readonly integrationKey = process.env.INTEGRATION_AUTH_KEY, private readonly requestSecret = process.env.INTEGRATION_REQUEST_SECRET) {}
  async getEntitlement(accountId: string, productKey: string): Promise<Entitlement | null> {
    if (!this.baseUrl || !this.integrationKey || !this.requestSecret) throw new Error('Remote entitlement provider is not configured for signed integration authentication');
    const localAccount = await getDatabaseClient().query<{ external_user_id: string; external_provider: string }>('SELECT external_user_id, external_provider FROM accounts WHERE id = $1', [accountId]);
    if (!localAccount.rowCount) throw new Error('Cannot resolve external identity for remote entitlement lookup');
    const external = localAccount.rows[0]; const path = `/api/integrations/v1/entitlements/${encodeURIComponent(external.external_user_id)}`;
    const url = `${this.baseUrl.replace(/\/$/, '')}${path}?productKey=${encodeURIComponent(productKey)}&provider=${encodeURIComponent(external.external_provider)}`;
    const timestamp = String(Math.floor(Date.now() / 1000)); const requestId = crypto.randomUUID();
    const signature = crypto.createHmac('sha256', this.requestSecret).update(`${timestamp}.GET.${path}.`).digest('hex');
    const response = await fetch(url, { headers: { Accept: 'application/json', 'X-Integration-Key': this.integrationKey, 'X-Integration-Timestamp': timestamp, 'X-Integration-Signature': signature, 'X-Integration-Request-Id': requestId }, signal: AbortSignal.timeout(5000) });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Remote entitlement lookup failed (${response.status})`);
    const result = await response.json() as Entitlement;
    if (!result || result.productKey !== productKey) throw new Error('Remote entitlement response failed contract validation');
    return { ...result, accountId, source: 'REMOTE', resolvedAt: new Date().toISOString() };
  }
}
