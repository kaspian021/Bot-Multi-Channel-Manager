import { Entitlement, SubscriptionStatus } from '../../domain/types';
import { EntitlementProvider } from '../../application/interfaces/entitlement-provider';
import { getDatabaseClient } from '../database/db-client';

function parse<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return (value as T) || fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

/** Reads versioned local snapshots; used in demo and offline installations. */
export class MockEntitlementProvider implements EntitlementProvider {
  async getEntitlement(accountId: string, productKey: string): Promise<Entitlement | null> {
    const db = getDatabaseClient();
    const row = await db.query(
      `SELECT * FROM entitlement_snapshots
       WHERE account_id = $1 AND product_key = $2 AND is_active = TRUE
       ORDER BY version DESC, created_at DESC LIMIT 1`,
      [accountId, productKey]
    );
    if (!row.rowCount) return null;
    const item = row.rows[0];
    return {
      id: item.id,
      accountId: item.account_id,
      productKey: item.product_key,
      status: item.status as SubscriptionStatus,
      planCode: item.plan_code,
      validUntil: item.valid_until ? new Date(item.valid_until).toISOString() : undefined,
      features: parse(item.features_json, {}),
      limits: parse(item.limits_json, {}),
      version: item.version,
      source: 'MOCK',
      resolvedAt: new Date().toISOString(),
    } as Entitlement;
  }
}
