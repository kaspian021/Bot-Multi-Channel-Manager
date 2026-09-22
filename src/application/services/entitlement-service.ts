// ==============================================================
// Phase 4 Entitlements, atomic usage metering and integration outbox
// ==============================================================

import crypto from 'crypto';
import { EntitlementProvider } from '../interfaces/entitlement-provider';
import { MockEntitlementProvider } from '../../infrastructure/entitlements/mock-entitlement-provider';
import { RemoteEntitlementProvider } from '../../infrastructure/entitlements/remote-entitlement-provider';
import { getDatabaseClient, IDatabaseClient } from '../../infrastructure/database/db-client';
import { AuditService } from './audit-service';
import { AuditActorType, Entitlement, SubscriptionStatus, UsageMetric } from '../../domain/types';

const productKey = () => process.env.PRODUCT_KEY || 'ai-channel-manager';
const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export class EntitlementDeniedError extends Error {
  constructor(message: string, public readonly code: 'ENTITLEMENT_DENIED' | 'QUOTA_EXCEEDED' | 'GENERATION_INTERVAL_BLOCKED' = 'ENTITLEMENT_DENIED') {
    super(message);
    this.name = 'EntitlementDeniedError';
  }
}

interface CachedEntitlement { value: Entitlement | null; expiresAt: number; }
const cache = new Map<string, CachedEntitlement>();

export function getEntitlementProvider(): EntitlementProvider {
  return process.env.ENTITLEMENT_PROVIDER === 'remote' ? new RemoteEntitlementProvider() : new MockEntitlementProvider();
}

export class EntitlementService {
  constructor(private readonly provider: EntitlementProvider = getEntitlementProvider()) {}

  async resolve(accountId: string, requestedProductKey = productKey(), options: { forceRefresh?: boolean } = {}): Promise<Entitlement | null> {
    const cacheKey = `${accountId}:${requestedProductKey}`;
    const ttl = Math.max(1, Number(process.env.ENTITLEMENT_CACHE_TTL_SECONDS || 60)) * 1000;
    const existing = cache.get(cacheKey);
    if (!options.forceRefresh && existing && existing.expiresAt > Date.now()) {
      console.info(`[entitlements] cache hit account=${accountId} product=${requestedProductKey}`);
      return existing.value;
    }
    console.info(`[entitlements] cache miss account=${accountId} product=${requestedProductKey}`);
    try {
      const entitlement = await this.provider.getEntitlement(accountId, requestedProductKey);
      cache.set(cacheKey, { value: entitlement, expiresAt: Date.now() + ttl });
      return entitlement;
    } catch (error) {
      console.error(`[entitlements] resolve failure account=${accountId} product=${requestedProductKey}`, error);
      // Never retain a stale positive response after an authoritative failure.
      cache.delete(cacheKey);
      throw error;
    }
  }

  invalidate(accountId: string, requestedProductKey = productKey()): void {
    cache.delete(`${accountId}:${requestedProductKey}`);
  }

  static clearCacheForTesting(): void { cache.clear(); }
}

export class UsageMeter {
  /** Immutable usage event with an idempotency key. Returns false on replay. */
  async record(input: {
    accountId: string; workspaceId?: string; channelId?: string; productKey?: string;
    metric: UsageMetric; quantity?: number; source: string; idempotencyKey: string; metadata?: Record<string, unknown>;
  }): Promise<boolean> {
    const db = getDatabaseClient();
    const now = new Date();
    const inserted = await db.query<{ id: string }>(
      `INSERT INTO usage_events (id, account_id, workspace_id, channel_id, product_key, metric, quantity, source, idempotency_key, metadata, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`,
      [newId('usage'), input.accountId, input.workspaceId || null, input.channelId || null, input.productKey || productKey(), input.metric,
        input.quantity || 1, input.source, input.idempotencyKey, JSON.stringify(input.metadata || {}), now.toISOString()]
    );
    if (!inserted.rowCount) return false;
    await db.query(
      `INSERT INTO usage_daily_counters (account_id, workspace_id, channel_id, product_key, metric, period_start, quantity, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (account_id, workspace_id, channel_id, product_key, metric, period_start)
       DO UPDATE SET quantity = usage_daily_counters.quantity + EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP`,
      [input.accountId, input.workspaceId || '', input.channelId || '', input.productKey || productKey(), input.metric, input.quantity || 1]
    );
    await new IntegrationOutboxService().enqueue('usage.recorded', inserted.rows[0].id, { ...input, occurredAt: now.toISOString() }, `usage:${input.idempotencyKey}`);
    return true;
  }

  async usageToday(input: { accountId: string; workspaceId?: string; channelId?: string; productKey?: string; metric: UsageMetric }): Promise<number> {
    const db = getDatabaseClient();
    const result = await db.query<{ quantity: number }>(
      `SELECT quantity FROM usage_daily_counters
       WHERE account_id = $1 AND workspace_id = $2 AND channel_id = $3 AND product_key = $4 AND metric = $5 AND period_start = CURRENT_DATE`,
      [input.accountId, input.workspaceId || '', input.channelId || '', input.productKey || productKey(), input.metric]
    );
    return Number(result.rows[0]?.quantity || 0);
  }

  /** Atomic counter reservation used before an externally-visible operation. */
  async reserve(input: {
    accountId: string; workspaceId?: string; channelId?: string; productKey?: string; metric: UsageMetric;
    maximum: number; quantity?: number; source: string; idempotencyKey: string; metadata?: Record<string, unknown>;
  }): Promise<boolean> {
    const db = getDatabaseClient(); const quantity = input.quantity || 1;
    // Keep event insertion, quota increment/rejection, and outbox creation in
    // one transaction. Concurrent equal idempotency keys observe the final
    // reservation state rather than an in-progress insert.
    return db.transaction(async (tx) => {
      const event = await tx.query<{ id: string }>(
        `INSERT INTO usage_events (id,account_id,workspace_id,channel_id,product_key,metric,quantity,source,idempotency_key,metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`,
        [newId('usage'), input.accountId, input.workspaceId || null, input.channelId || null, input.productKey || productKey(), input.metric, quantity, input.source, input.idempotencyKey, JSON.stringify({ ...input.metadata, reservationState: 'RESERVED' })]
      );
      if (!event.rowCount) {
        const existing = await tx.query<{ metadata: string }>('SELECT metadata FROM usage_events WHERE idempotency_key=$1', [input.idempotencyKey]);
        let metadata: Record<string, unknown> = {}; try { metadata = typeof existing.rows[0]?.metadata === 'string' ? JSON.parse(existing.rows[0].metadata || '{}') : existing.rows[0]?.metadata || {}; } catch { /* legacy malformed metadata is safely treated as charged */ }
        return !metadata.quotaRejected;
      }
      const counter = await tx.query<{ quantity: number }>(
        `INSERT INTO usage_daily_counters (account_id,workspace_id,channel_id,product_key,metric,period_start,quantity,updated_at)
         VALUES ($1,$2,$3,$4,$5,CURRENT_DATE,$6,CURRENT_TIMESTAMP)
         ON CONFLICT (account_id,workspace_id,channel_id,product_key,metric,period_start)
         DO UPDATE SET quantity=usage_daily_counters.quantity+EXCLUDED.quantity,updated_at=CURRENT_TIMESTAMP
         WHERE usage_daily_counters.quantity+EXCLUDED.quantity <= $7 RETURNING quantity`,
        [input.accountId, input.workspaceId || '', input.channelId || '', input.productKey || productKey(), input.metric, quantity, input.maximum]
      );
      if (!counter.rowCount) {
        await tx.query('UPDATE usage_events SET metadata=$1 WHERE id=$2', [JSON.stringify({ ...input.metadata, reservationState: 'REJECTED', quotaRejected: true }), event.rows[0].id]);
        return false;
      }
      await new IntegrationOutboxService().enqueue('usage.recorded', event.rows[0].id, { ...input, occurredAt: new Date().toISOString(), reservationState: 'RESERVED' }, `usage:${input.idempotencyKey}`, tx);
      return true;
    });
  }

  /** Reservations are charged on attempt, not AI success. Retried operation keys reuse the reservation. */
  async markReservationOutcome(idempotencyKey: string, outcome: 'SUCCESSFUL' | 'FAILED', error?: string): Promise<void> {
    const db = getDatabaseClient();
    const event = await db.query<{ metadata: string }>('SELECT metadata FROM usage_events WHERE idempotency_key = $1', [idempotencyKey]);
    if (!event.rowCount) return;
    let metadata: Record<string, unknown> = {};
    try { metadata = typeof event.rows[0].metadata === 'string' ? JSON.parse(event.rows[0].metadata || '{}') : event.rows[0].metadata || {}; } catch { /* preserve deterministic outcome even for legacy metadata */ }
    await db.query('UPDATE usage_events SET metadata = $1 WHERE idempotency_key = $2', [JSON.stringify({ ...metadata, reservationState: outcome, failureReason: error?.slice(0, 200) }), idempotencyKey]);
  }
}

export class IntegrationOutboxService {
  async enqueue(eventType: string, aggregateId: string, payload: Record<string, unknown>, idempotencyKey: string, db: IDatabaseClient = getDatabaseClient()): Promise<void> {
    await db.query(
      `INSERT INTO integration_outbox (id, event_type, aggregate_id, payload, idempotency_key, status, next_attempt_at)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', CURRENT_TIMESTAMP)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [newId('outbox'), eventType, aggregateId, JSON.stringify(payload), idempotencyKey]
    );
  }

  /** Atomically changes and returns only rows exclusively owned by this worker. */
  async claimPending(limit = 20): Promise<Array<Record<string, unknown>>> {
    const db = getDatabaseClient();
    return db.transaction(async (tx) => {
      const pglite = tx.getProviderName().includes('PGlite');
      // PGlite serializes transaction callbacks but does not expose SKIP LOCKED
      // on all supported versions. The update predicate still makes ownership
      // atomic there; external PostgreSQL gets row-level SKIP LOCKED.
      const lock = pglite ? '' : 'FOR UPDATE SKIP LOCKED';
      const claimed = await tx.query(
        `WITH candidates AS (
           SELECT id FROM integration_outbox
           WHERE status IN ('PENDING', 'FAILED')
             AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
           ORDER BY created_at ASC ${lock} LIMIT $1
         )
         UPDATE integration_outbox o SET status = 'PROCESSING', updated_at = CURRENT_TIMESTAMP
         FROM candidates c WHERE o.id = c.id AND o.status IN ('PENDING', 'FAILED') RETURNING o.*`, [limit]
      );
      return claimed.rows;
    });
  }

  async markDelivered(id: string): Promise<void> {
    await getDatabaseClient().query("UPDATE integration_outbox SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
  }

  async markFailed(id: string, error: string): Promise<void> {
    await getDatabaseClient().query(
      `UPDATE integration_outbox SET status = 'FAILED', retry_count = retry_count + 1, last_error = $1,
       next_attempt_at = CURRENT_TIMESTAMP + (retry_count + 1) * INTERVAL '1 minute', updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [error.slice(0, 500), id]
    );
  }
}

function entitlementAllows(entitlement: Entitlement): boolean {
  if ([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.GRACE].includes(entitlement.status)) return !entitlement.validUntil || new Date(entitlement.validUntil).getTime() > Date.now();
  if (entitlement.status === SubscriptionStatus.CANCELLED) return Boolean(entitlement.validUntil && new Date(entitlement.validUntil).getTime() > Date.now());
  return false;
}

export type PremiumOperation = 'CREATE_CHANNEL' | 'RESEARCH' | 'GENERATE' | 'AI_EDIT' | 'SCHEDULE' | 'PUBLISH' | 'STRATEGY';

export class EntitlementGuard {
  private meter = new UsageMeter();
  constructor(private readonly entitlements = new EntitlementService()) {}

  async getActive(accountId: string): Promise<Entitlement> {
    let entitlement: Entitlement | null;
    try { entitlement = await this.entitlements.resolve(accountId); }
    catch { throw new EntitlementDeniedError('Entitlement could not be resolved; premium operation is fail-closed'); }
    if (!entitlement || !entitlementAllows(entitlement)) {
      throw new EntitlementDeniedError('Subscription is not entitled for this operation');
    }
    return entitlement;
  }

  async assert(input: { accountId: string; workspaceId?: string; channelId?: string; operation: PremiumOperation; idempotencyKey?: string; source: string }): Promise<Entitlement> {
    const entitlement = await this.getActive(input.accountId);
    const feature = (() => {
      switch (input.operation) {
        case 'RESEARCH': return entitlement.features.webResearch;
        case 'GENERATE': case 'AI_EDIT': return entitlement.features.autonomousGeneration;
        case 'STRATEGY': return entitlement.features.strategyRecommendations;
        default: return true;
      }
    })();
    if (!feature) throw new EntitlementDeniedError(`Plan does not enable ${input.operation.toLowerCase()}`);

    const metricAndLimit: Partial<Record<PremiumOperation, [UsageMetric, number]>> = {
      CREATE_CHANNEL: ['CHANNEL_CREATED', entitlement.limits.maxChannels],
      RESEARCH: ['RESEARCH_RUN', entitlement.limits.researchRunsPerDay],
      GENERATE: ['CONTENT_GENERATION', entitlement.limits.aiRequestsPerDay],
      AI_EDIT: ['AI_REQUEST', entitlement.limits.aiRequestsPerDay],
      PUBLISH: ['POST_PUBLISHED', entitlement.limits.postsPerDay],
    };
    const quota = metricAndLimit[input.operation];
    if (quota && input.idempotencyKey) {
      const [metric, maximum] = quota;
      if (!Number.isFinite(maximum) || maximum < 1 || !(await this.meter.reserve({
        accountId: input.accountId, workspaceId: input.workspaceId, channelId: input.channelId, metric, maximum,
        source: input.source, idempotencyKey: input.idempotencyKey,
      }))) {
        await this.audit(input, 'QUOTA_EXCEEDED', { metric, maximum });
        throw new EntitlementDeniedError(`Daily ${metric} quota exceeded`, 'QUOTA_EXCEEDED');
      }
      // A content cycle consumes one content-generation unit and one AI request
      // unit. They stay separate metrics for future plans and reporting.
      if (input.operation === 'GENERATE' && !(await this.meter.reserve({
        accountId: input.accountId, workspaceId: input.workspaceId, channelId: input.channelId,
        metric: 'AI_REQUEST', maximum: entitlement.limits.aiRequestsPerDay, source: input.source,
        idempotencyKey: `${input.idempotencyKey}:ai-request`,
      }))) {
        await this.audit(input, 'QUOTA_EXCEEDED', { metric: 'AI_REQUEST', maximum: entitlement.limits.aiRequestsPerDay });
        throw new EntitlementDeniedError('Daily AI_REQUEST quota exceeded', 'QUOTA_EXCEEDED');
      }
    }
    await this.audit(input, 'ENTITLEMENT_RESOLVED', { planCode: entitlement.planCode, version: entitlement.version });
    return entitlement;
  }

  /** Mark a metered AI operation's terminal attempt state without releasing quota. */
  async markAttemptOutcome(operation: 'GENERATE' | 'AI_EDIT', idempotencyKey: string, outcome: 'SUCCESSFUL' | 'FAILED', error?: string): Promise<void> {
    const keys = operation === 'GENERATE' ? [idempotencyKey, `${idempotencyKey}:ai-request`] : [idempotencyKey];
    await Promise.all(keys.map((key) => this.meter.markReservationOutcome(key, outcome, error)));
  }

  async assertGenerationInterval(input: { accountId: string; workspaceId: string; channelId: string }): Promise<Entitlement> {
    const entitlement = await this.getActive(input.accountId);
    const floor = Math.max(1, Number(process.env.PLATFORM_MIN_GENERATION_INTERVAL_SECONDS || 300));
    const effectiveSeconds = Math.max(floor, Number(entitlement.limits.generationIntervalSeconds || 0));
    const db = getDatabaseClient();
    const state = await db.query<{ last_generated_at: string | null }>('SELECT last_generated_at FROM editorial_runtime_state WHERE channel_id = $1', [input.channelId]);
    const lastGenerated = state.rows[0]?.last_generated_at ? new Date(state.rows[0].last_generated_at).getTime() : 0;
    if (lastGenerated && Date.now() - lastGenerated < effectiveSeconds * 1000) {
      await this.audit({ ...input, operation: 'GENERATE', source: 'generation-gate' }, 'GENERATION_INTERVAL_BLOCKED', { effectiveSeconds });
      throw new EntitlementDeniedError(`Generation interval gate is active (${effectiveSeconds}s)`, 'GENERATION_INTERVAL_BLOCKED');
    }
    return entitlement;
  }

  async markGenerated(channelId: string): Promise<void> {
    await getDatabaseClient().query(
      `INSERT INTO editorial_runtime_state (channel_id, last_generated_at, updated_at)
       VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (channel_id) DO UPDATE SET last_generated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`, [channelId]
    );
  }

  private async audit(input: { workspaceId?: string; channelId?: string; accountId: string; operation: PremiumOperation; source: string }, action: string, metadata: Record<string, unknown>): Promise<void> {
    if (!input.workspaceId) return;
    await AuditService.log(input.workspaceId, input.channelId, AuditActorType.SYSTEM, input.accountId, action, 'ENTITLEMENT', input.operation, metadata);
  }
}
