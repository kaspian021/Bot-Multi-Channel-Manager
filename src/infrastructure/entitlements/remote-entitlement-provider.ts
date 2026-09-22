import { Entitlement } from '../../domain/types';
import { EntitlementProvider } from '../../application/interfaces/entitlement-provider';
import { getDatabaseClient } from '../database/db-client';

/**
 * Optional future provider. No application service calls a DigiStore URL
 * directly; deployment selects this adapter through ENTITLEMENT_PROVIDER.
 */
export class RemoteEntitlementProvider implements EntitlementProvider {
  constructor(private readonly baseUrl = process.env.INTEGRATION_API_BASE_URL, private readonly apiKey = process.env.INTEGRATION_API_KEY) {}

  async getEntitlement(accountId: string, productKey: string): Promise<Entitlement | null> {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Remote entitlement provider is not configured');
    }
    const localAccount = await getDatabaseClient().query<{ external_user_id: string; external_provider: string }>(
      'SELECT external_user_id, external_provider FROM accounts WHERE id = $1', [accountId]
    );
    if (!localAccount.rowCount) throw new Error('Cannot resolve external identity for remote entitlement lookup');
    const external = localAccount.rows[0];
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/integrations/v1/entitlements/${encodeURIComponent(external.external_user_id)}?productKey=${encodeURIComponent(productKey)}&provider=${encodeURIComponent(external.external_provider)}`, {
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Remote entitlement lookup failed (${response.status})`);
    const result = await response.json() as Entitlement;
    if (!result || result.productKey !== productKey) {
      throw new Error('Remote entitlement response failed contract validation');
    }
    // Remote providers identify the account by their external reference; map it
    // back to the local operational account before application consumption.
    return { ...result, accountId, source: 'REMOTE', resolvedAt: new Date().toISOString() };
  }
}
