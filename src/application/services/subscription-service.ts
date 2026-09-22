// ==============================================================
// Phase 4 generic subscription lifecycle and entitlement snapshots
// ==============================================================

import crypto from 'crypto';
import { getDatabaseClient } from '../../infrastructure/database/db-client';
import { SubscriptionStatus, EntitlementFeatures, EntitlementLimits } from '../../domain/types';
import { AuditService } from './audit-service';
import { EntitlementService, IntegrationOutboxService } from './entitlement-service';

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const parsed = <T>(value: unknown, fallback: T): T => { try { return typeof value === 'string' ? JSON.parse(value) : (value as T) || fallback; } catch { return fallback; } };

const transitions: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  [SubscriptionStatus.TRIALING]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE, SubscriptionStatus.PAST_DUE, SubscriptionStatus.SUSPENDED, SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED],
  [SubscriptionStatus.ACTIVE]: [SubscriptionStatus.GRACE, SubscriptionStatus.PAST_DUE, SubscriptionStatus.SUSPENDED, SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED],
  [SubscriptionStatus.GRACE]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE, SubscriptionStatus.SUSPENDED, SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED],
  [SubscriptionStatus.PAST_DUE]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE, SubscriptionStatus.SUSPENDED, SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED],
  [SubscriptionStatus.SUSPENDED]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED],
  [SubscriptionStatus.CANCELLED]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRED],
  [SubscriptionStatus.EXPIRED]: [SubscriptionStatus.ACTIVE],
};

export interface SubscriptionChange {
  eventId: string;
  accountId: string;
  productKey: string;
  planCode: string;
  status: SubscriptionStatus;
  providerSubscriptionId?: string;
  startedAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  effectiveAt?: string;
  features: EntitlementFeatures;
  limits: EntitlementLimits;
  eventType: string;
}

/** Applies signed external events idempotently; it has no payment behavior. */
export class SubscriptionService {
  async apply(change: SubscriptionChange): Promise<void> {
    const db = getDatabaseClient();
    const seen = await db.query(
      `INSERT INTO integration_webhook_events (id, provider, event_id, event_type, payload_hash, status)
       VALUES ($1, 'integration-v1', $2, $3, $4, 'PROCESSING')
       ON CONFLICT (provider, event_id) DO NOTHING RETURNING id`,
      [id('webhook'), change.eventId, change.eventType, crypto.createHash('sha256').update(JSON.stringify(change)).digest('hex')]
    );
    if (!seen.rowCount) return;

    const current = await db.query(`SELECT * FROM subscriptions WHERE account_id = $1 AND product_key = $2 ORDER BY updated_at DESC LIMIT 1`, [change.accountId, change.productKey]);
    const existing = current.rows[0];
    if (existing && existing.status !== change.status && !transitions[existing.status as SubscriptionStatus].includes(change.status)) {
      await db.query("UPDATE integration_webhook_events SET status = 'REJECTED', processed_at = CURRENT_TIMESTAMP WHERE event_id = $1", [change.eventId]);
      throw new Error(`Invalid subscription transition ${existing.status} -> ${change.status}`);
    }

    // Downgrades supplied with an effectiveAt remain pending until the period
    // boundary. Immediate upgrades and all status changes apply now.
    const downgradeDeferred = existing && existing.plan_code !== change.planCode && change.effectiveAt && new Date(change.effectiveAt).getTime() > Date.now();
    const subscriptionId = existing?.id || id('sub');
    await db.query(
      `INSERT INTO subscriptions (id, account_id, product_key, plan_code, status, started_at, current_period_start, current_period_end, cancel_at_period_end, effective_at, provider_subscription_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         plan_code = CASE WHEN $12 THEN subscriptions.plan_code ELSE EXCLUDED.plan_code END,
         pending_plan_code = CASE WHEN $12 THEN EXCLUDED.plan_code ELSE NULL END,
         status = EXCLUDED.status, current_period_start = EXCLUDED.current_period_start, current_period_end = EXCLUDED.current_period_end,
         cancel_at_period_end = EXCLUDED.cancel_at_period_end, effective_at = EXCLUDED.effective_at,
         provider_subscription_id = COALESCE(EXCLUDED.provider_subscription_id, subscriptions.provider_subscription_id), updated_at = CURRENT_TIMESTAMP`,
      [subscriptionId, change.accountId, change.productKey, change.planCode, change.status, change.startedAt || new Date().toISOString(),
        change.currentPeriodStart || null, change.currentPeriodEnd || null, Boolean(change.cancelAtPeriodEnd), change.effectiveAt || null,
        change.providerSubscriptionId || null, downgradeDeferred]
    );

    const active = await db.query<{ version: number }>(
      `SELECT version FROM entitlement_snapshots WHERE account_id = $1 AND product_key = $2 AND is_active = TRUE ORDER BY version DESC LIMIT 1`,
      [change.accountId, change.productKey]
    );
    const version = Number(active.rows[0]?.version || 0) + 1;
    if (!downgradeDeferred) {
      await db.query('UPDATE entitlement_snapshots SET is_active = FALSE WHERE account_id = $1 AND product_key = $2 AND is_active = TRUE', [change.accountId, change.productKey]);
      await db.query(
        `INSERT INTO entitlement_snapshots (id, account_id, product_key, subscription_id, status, plan_code, valid_until, features_json, limits_json, version, source, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'REMOTE', TRUE)`,
        [id('ent'), change.accountId, change.productKey, subscriptionId, change.status, change.planCode,
          change.currentPeriodEnd || null, JSON.stringify(change.features), JSON.stringify(change.limits), version]
      );
    }
    await db.query("UPDATE integration_webhook_events SET status = 'COMPLETED', processed_at = CURRENT_TIMESTAMP WHERE event_id = $1", [change.eventId]);
    new EntitlementService().invalidate(change.accountId, change.productKey);
    await new IntegrationOutboxService().enqueue('subscription.changed', subscriptionId, { eventType: change.eventType, accountId: change.accountId, productKey: change.productKey, status: change.status }, `subscription:${change.eventId}`);
    await new IntegrationOutboxService().enqueue('entitlement.changed', `${change.accountId}:${change.productKey}`, { accountId: change.accountId, productKey: change.productKey, version }, `entitlement:${change.eventId}`);

    const workspaces = await db.query<{ id: string }>('SELECT id FROM workspaces WHERE account_id = $1', [change.accountId]);
    for (const workspace of workspaces.rows) {
      await AuditService.log(workspace.id, undefined, 'SYSTEM' as any, change.accountId,
        change.status === SubscriptionStatus.EXPIRED ? 'SUBSCRIPTION_EXPIRED' : existing ? 'SUBSCRIPTION_UPDATED' : 'SUBSCRIPTION_CREATED',
        'SUBSCRIPTION', subscriptionId, { status: change.status, planCode: change.planCode, eventType: change.eventType, downgradeDeferred });
    }
  }

  /** Applies pending downgraded plans at their explicit boundary. */
  async applyDueDowngrades(): Promise<number> {
    const db = getDatabaseClient();
    const due = await db.query('SELECT * FROM subscriptions WHERE effective_at IS NOT NULL AND effective_at <= CURRENT_TIMESTAMP');
    let applied = 0;
    for (const subscription of due.rows) {
      const duePlanCode = subscription.pending_plan_code || subscription.plan_code;
      const plan = await db.query('SELECT * FROM plans WHERE product_key = $1 AND plan_code = $2', [subscription.product_key, duePlanCode]);
      if (!plan.rowCount) continue;
      const current = await db.query<{ version: number }>('SELECT version FROM entitlement_snapshots WHERE account_id = $1 AND product_key = $2 AND is_active = TRUE ORDER BY version DESC LIMIT 1', [subscription.account_id, subscription.product_key]);
      await db.query('UPDATE entitlement_snapshots SET is_active = FALSE WHERE account_id = $1 AND product_key = $2 AND is_active = TRUE', [subscription.account_id, subscription.product_key]);
      await db.query(
        `INSERT INTO entitlement_snapshots (id, account_id, product_key, subscription_id, status, plan_code, valid_until, features_json, limits_json, version, source, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'REMOTE', TRUE)`,
        [id('ent'), subscription.account_id, subscription.product_key, subscription.id, subscription.status, duePlanCode,
          subscription.current_period_end, plan.rows[0].feature_defaults, plan.rows[0].limit_defaults, Number(current.rows[0]?.version || 0) + 1]
      );
      await db.query('UPDATE subscriptions SET plan_code = COALESCE(pending_plan_code, plan_code), pending_plan_code = NULL, effective_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [subscription.id]);
      new EntitlementService().invalidate(subscription.account_id, subscription.product_key);
      applied++;
    }
    return applied;
  }
}
