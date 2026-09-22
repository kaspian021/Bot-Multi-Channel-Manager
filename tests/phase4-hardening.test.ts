// Phase 4 hardening: authentication, atomicity, concurrency, and boundary ordering
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { runMigrations } from '../src/infrastructure/database/migrations';
import { seedDatabase } from '../src/infrastructure/database/seed';
import { getDatabaseClient, IDatabaseClient, resetDatabaseClientForTesting } from '../src/infrastructure/database/db-client';
import { AccountLinkingService } from '../src/application/services/account-linking-service';
import { resolveTenantContext } from '../src/application/services/tenant-context-service';
import { IntegrationAuthenticationError } from '../src/infrastructure/security/trusted-integration-auth';
import { IntegrationOutboxService, UsageMeter } from '../src/application/services/entitlement-service';
import { SubscriptionService } from '../src/application/services/subscription-service';
import { SubscriptionStatus } from '../src/domain/types';
import { EditorialPlanningService } from '../src/application/services/editorial-planning-service';
import { BackgroundJobOrchestrator } from '../src/infrastructure/background/job-orchestrator';
import { POST as createChannel } from '../src/app/api/channels/route';
import { GET as getChannelSources } from '../src/app/api/channels/[id]/sources/route';
import { GET as getChannelBrain } from '../src/app/api/channels/[id]/brain/route';
import { GET as getDraft } from '../src/app/api/drafts/[id]/route';

const product = 'ai-channel-manager';
const features = { autonomousGeneration: true, webResearch: true, socialResearch: false, strategyRecommendations: true, advancedEditorialPlanning: true };
const limits = { maxChannels: 10, postsPerDay: 2, aiRequestsPerDay: 10, researchRunsPerDay: 10, generationIntervalSeconds: 300, researchIntervalSeconds: 60 };
let db: IDatabaseClient; let accountId = ''; let workspaceId = '';

function signedRequest(path: string, requestId: string, body = '', extra: Record<string, string> = {}, timestamp = String(Math.floor(Date.now() / 1000)), signatureOverride?: string) {
  const method = body ? 'POST' : 'GET';
  const signature = signatureOverride || crypto.createHmac('sha256', process.env.INTEGRATION_REQUEST_SECRET!).update(`${timestamp}.${method}.${path}.${body}`).digest('hex');
  return new NextRequest(`http://localhost${path}`, { method, body: body || undefined, headers: { 'x-integration-key': process.env.INTEGRATION_AUTH_KEY!, 'x-integration-timestamp': timestamp, 'x-integration-signature': signature, 'x-integration-request-id': requestId, ...extra } });
}

describe.sequential('Phase 4 production hardening', () => {
  beforeAll(async () => {
    process.env.DEMO_MODE = 'true'; process.env.INTEGRATION_AUTH_KEY = 'hardening-key'; process.env.INTEGRATION_REQUEST_SECRET = 'hardening-secret';
    await runMigrations(); await seedDatabase(true); db = getDatabaseClient();
    const accounts = new AccountLinkingService(); accountId = await accounts.createAccount({ externalProvider: 'hardening', externalUserId: 'tenant-a' }); workspaceId = await accounts.createWorkspace(accountId, { name: 'Hardening', slug: `hardening-${Date.now()}` });
    await db.query(`INSERT INTO entitlement_snapshots(id,account_id,product_key,status,plan_code,features_json,limits_json,version,source,is_active) VALUES($1,$2,$3,'ACTIVE','hardening',$4,$5,1,'MOCK',TRUE)`, ['ent-hardening', accountId, product, JSON.stringify(features), JSON.stringify(limits)]);
  });
  afterAll(async () => { await resetDatabaseClientForTesting(); });

  it('rejects forged account and external identity headers, but accepts a signed caller', async () => {
    process.env.DEMO_MODE = 'false';
    await expect(resolveTenantContext(new NextRequest('http://localhost/api/channels', { headers: { 'x-account-id': accountId, 'x-workspace-id': workspaceId } }))).rejects.toBeInstanceOf(IntegrationAuthenticationError);
    await expect(resolveTenantContext(new NextRequest('http://localhost/api/channels', { headers: { 'x-external-provider': 'hardening', 'x-external-user-id': 'tenant-a', 'x-workspace-id': workspaceId } }))).rejects.toBeInstanceOf(IntegrationAuthenticationError);
    const context = await resolveTenantContext(signedRequest('/api/channels', 'auth-ok-account', '', { 'x-account-id': accountId, 'x-workspace-id': workspaceId }));
    expect(context).toMatchObject({ accountId, workspaceId });
    const external = await resolveTenantContext(signedRequest('/api/channels', 'auth-ok-external', '', { 'x-external-provider': 'hardening', 'x-external-user-id': 'tenant-a', 'x-workspace-id': workspaceId }));
    expect(external.accountId).toBe(accountId);
    process.env.DEMO_MODE = 'true';
  });

  it('rejects stale, invalid, and replayed signed integration requests', async () => {
    const stale = signedRequest('/api/channels', 'auth-stale', '', { 'x-account-id': accountId }, String(Math.floor(Date.now() / 1000) - 1000));
    await expect(resolveTenantContext(stale)).rejects.toBeInstanceOf(IntegrationAuthenticationError);
    await expect(resolveTenantContext(signedRequest('/api/channels', 'auth-invalid', '', { 'x-account-id': accountId }, undefined, '00'))).rejects.toBeInstanceOf(IntegrationAuthenticationError);
    const replay = signedRequest('/api/channels', 'auth-replay', '', { 'x-account-id': accountId, 'x-workspace-id': workspaceId });
    await resolveTenantContext(replay);
    await expect(resolveTenantContext(replay)).rejects.toBeInstanceOf(IntegrationAuthenticationError);
  });

  it('does not authorize cross-workspace channels, brains, sources, or drafts by resource ID', async () => {
    const accounts = new AccountLinkingService(); const other = await accounts.createAccount({ externalProvider: 'hardening', externalUserId: `other-${Date.now()}` }); const otherWorkspace = await accounts.createWorkspace(other, { name: 'Other', slug: `other-${Date.now()}` }); const otherChannel = `ch-other-${Date.now()}`;
    await db.query(`INSERT INTO channels(id,workspace_id,name,language,status,posting_frequency,timezone) VALUES($1,$2,'Other','en','ACTIVE',1,'UTC')`, [otherChannel, otherWorkspace]);
    const otherDraft = `draft-other-${Date.now()}`; await db.query(`INSERT INTO content_drafts(id,workspace_id,channel_id,topic,title,headline,body,why_it_matters,content_type,confidence_score,content_score,status,suggested_publish_time,sources,fact_check_items) VALUES($1,$2,$3,'other','other','other','body','[]','NEWS',90,90,'PENDING_APPROVAL','now','[]','[]')`, [otherDraft, otherWorkspace, otherChannel]);
    const header = { 'x-account-id': accountId, 'x-workspace-id': workspaceId };
    expect((await getChannelSources(signedRequest(`/api/channels/${otherChannel}/sources`, 'cross-source', '', header), { params: { id: otherChannel } })).status).toBe(404);
    expect((await getChannelBrain(signedRequest(`/api/channels/${otherChannel}/brain`, 'cross-brain', '', header), { params: { id: otherChannel } })).status).toBe(404);
    expect((await getDraft(signedRequest(`/api/drafts/${otherDraft}`, 'cross-draft', '', header), { params: { id: otherDraft } })).status).toBe(404);
  });

  it('atomically claims an outbox row for exactly one concurrent worker', async () => {
    await db.query('DELETE FROM integration_outbox');
    await new IntegrationOutboxService().enqueue('usage.recorded', 'hardening-outbox', {}, 'hardening-outbox-key');
    const [a, b] = await Promise.all([new IntegrationOutboxService().claimPending(1), new IntegrationOutboxService().claimPending(1)]);
    expect(a.length + b.length).toBe(1);
    expect((await db.query("SELECT status FROM integration_outbox WHERE idempotency_key='hardening-outbox-key'" )).rows[0].status).toBe('PROCESSING');
  });

  it('enforces maxChannels atomically across concurrent channel creation requests', async () => {
    const accounts = new AccountLinkingService(); const account = await accounts.createAccount({ externalProvider: 'hardening', externalUserId: `channel-${Date.now()}` }); const workspace = await accounts.createWorkspace(account, { name: 'Channel quota', slug: `channel-quota-${Date.now()}` });
    await db.query(`INSERT INTO entitlement_snapshots(id,account_id,product_key,status,plan_code,features_json,limits_json,version,source,is_active) VALUES($1,$2,$3,'ACTIVE','one',$4,$5,1,'MOCK',TRUE)`, [`ent-channel-${Date.now()}`, account, product, JSON.stringify(features), JSON.stringify({ ...limits, maxChannels: 1 })]);
    const bodyA = JSON.stringify({ name: 'A', telegramChatId: `@quota_a_${Date.now()}` }); const bodyB = JSON.stringify({ name: 'B', telegramChatId: `@quota_b_${Date.now()}` });
    const [a, b] = await Promise.all([createChannel(signedRequest('/api/channels', 'channel-create-a', bodyA, { 'x-account-id': account, 'x-workspace-id': workspace })), createChannel(signedRequest('/api/channels', 'channel-create-b', bodyB, { 'x-account-id': account, 'x-workspace-id': workspace }))]);
    expect([a.status, b.status].filter((status) => status === 201)).toHaveLength(1);
    expect([a.status, b.status].filter((status) => status === 403)).toHaveLength(1);
    expect((await db.query(`SELECT * FROM channels WHERE workspace_id=$1 AND status='ACTIVE'`, [workspace])).rowCount).toBe(1);
  });

  it('rolls back subscription and webhook state when entitlement persistence fails mid-transition', async () => {
    const failing: IDatabaseClient = {
      query: (...args: any[]) => db.query(...args as [string, any[]]), exec: (sql) => db.exec(sql), close: async () => {}, getProviderName: () => db.getProviderName(),
      transaction: (callback) => db.transaction(async (tx) => callback({ ...tx, query: async (sql: string, params?: any[]) => { if (sql.includes('INSERT INTO entitlement_snapshots')) throw new Error('forced entitlement write failure'); return tx.query(sql, params); } } as IDatabaseClient)),
    };
    const event = 'hardening-rollback';
    await expect(new SubscriptionService(failing).apply({ eventId: event, accountId, productKey: product, planCode: 'hardening', status: SubscriptionStatus.ACTIVE, eventType: 'subscription.activated', features, limits })).rejects.toThrow('forced entitlement');
    expect((await db.query('SELECT * FROM subscriptions WHERE account_id=$1 AND product_key=$2', [accountId, product])).rowCount).toBe(0);
    expect((await db.query('SELECT * FROM integration_webhook_events WHERE event_id=$1', [event])).rowCount).toBe(0);
  });

  it('consumes a link token exactly once under concurrent requests', async () => {
    const service = new AccountLinkingService(); const link = await service.createLinkChallenge(accountId, workspaceId);
    const results = await Promise.allSettled([service.consumeLinkChallenge({ token: link.token, telegramUserId: 'hardening-telegram' }), service.consumeLinkChallenge({ token: link.token, telegramUserId: 'hardening-telegram' })]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  });

  it('does not double-charge a failed generation retry with the same operation key', async () => {
    const meter = new UsageMeter(); const key = 'hardening-generation-attempt';
    expect(await meter.reserve({ accountId, workspaceId, productKey: product, metric: 'CONTENT_GENERATION', maximum: 1, source: 'test', idempotencyKey: key })).toBe(true);
    await meter.markReservationOutcome(key, 'FAILED', 'provider unavailable');
    expect(await meter.reserve({ accountId, workspaceId, productKey: product, metric: 'CONTENT_GENERATION', maximum: 1, source: 'test', idempotencyKey: key })).toBe(true);
    expect(await meter.usageToday({ accountId, workspaceId, productKey: product, metric: 'CONTENT_GENERATION' })).toBe(1);
    expect(JSON.parse((await db.query('SELECT metadata FROM usage_events WHERE idempotency_key=$1', [key])).rows[0].metadata).reservationState).toBe('FAILED');
  });

  it('deduplicates equivalent pending strategy recommendations across repeated evaluations', async () => {
    const channel = 'ch-futurestack-001';
    for (let i = 0; i < 3; i++) {
      const draft = `hardening-trend-draft-${i}`;
      await db.query(`INSERT INTO content_drafts(id,workspace_id,channel_id,topic,title,headline,body,why_it_matters,content_type,confidence_score,content_score,status,suggested_publish_time,sources,fact_check_items) VALUES($1,'ws-demo-001',$2,'same-topic',$3,$3,'body','[]','NEWS',90,90,'PUBLISHED','now','[]','[]')`, [draft, channel, `Trend ${i}`]);
      await db.query(`INSERT INTO published_posts(id,workspace_id,channel_id,draft_id,telegram_message_id,telegram_chat_id,published_text,topic,published_at) VALUES($1,'ws-demo-001',$2,$3,$4,'@futurestack_ai','post','same-topic',CURRENT_TIMESTAMP)`, [`hardening-trend-post-${i}`, channel, draft, 7000 + i]);
    }
    const planner = new EditorialPlanningService(); const first = await planner.createStrategyRecommendation({ workspaceId: 'ws-demo-001', channelId: channel }); const second = await planner.createStrategyRecommendation({ workspaceId: 'ws-demo-001', channelId: channel });
    expect(first).toBeTruthy(); expect(second).toBeNull();
  });

  it('applies a due downgrade before evaluating a due scheduled publication', async () => {
    const accounts = new AccountLinkingService(); const account = await accounts.createAccount({ externalProvider: 'hardening', externalUserId: 'boundary' }); const workspace = await accounts.createWorkspace(account, { name: 'Boundary', slug: `boundary-${Date.now()}` }); const channel = `ch-boundary-${Date.now()}`;
    await db.query(`INSERT INTO channels(id,workspace_id,name,telegram_chat_id,language,status,posting_frequency,timezone) VALUES($1,$2,'Boundary','@boundary','en','ACTIVE',1,'UTC')`, [channel, workspace]);
    await db.query(`INSERT INTO plans(product_key,plan_code,name,feature_defaults,limit_defaults,status) VALUES($1,'boundary-pro','Pro',$2,$3,'ACTIVE'),($1,'boundary-none','None',$2,$4,'ACTIVE') ON CONFLICT(product_key,plan_code) DO UPDATE SET limit_defaults=EXCLUDED.limit_defaults`, [product, JSON.stringify(features), JSON.stringify({ ...limits, postsPerDay: 1 }), JSON.stringify({ ...limits, postsPerDay: 0 })]);
    await db.query(`INSERT INTO subscriptions(id,account_id,product_key,plan_code,pending_plan_code,status,started_at,effective_at) VALUES($1,$2,$3,'boundary-pro','boundary-none','ACTIVE',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP - INTERVAL '1 second')`, [`sub-boundary-${Date.now()}`, account, product]);
    await db.query(`INSERT INTO entitlement_snapshots(id,account_id,product_key,status,plan_code,features_json,limits_json,version,source,is_active) VALUES($1,$2,$3,'ACTIVE','boundary-pro',$4,$5,1,'MOCK',TRUE)`, [`ent-boundary-${Date.now()}`, account, product, JSON.stringify(features), JSON.stringify({ ...limits, postsPerDay: 1 })]);
    const draft = `draft-boundary-${Date.now()}`; await db.query(`INSERT INTO content_drafts(id,workspace_id,channel_id,topic,title,headline,body,why_it_matters,content_type,confidence_score,content_score,status,suggested_publish_time,sources,fact_check_items) VALUES($1,$2,$3,'boundary','boundary','boundary','body','[]','NEWS',90,90,'SCHEDULED','now','[]','[]')`, [draft, workspace, channel]);
    const schedule = `sched-boundary-${Date.now()}`; await db.query(`INSERT INTO scheduled_posts(id,workspace_id,channel_id,draft_id,scheduled_for,status,idempotency_key) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP - INTERVAL '1 second','PENDING',$5)`, [schedule, workspace, channel, draft, `idemp-${schedule}`]);
    await new BackgroundJobOrchestrator().runAutonomousCycle(0);
    expect((await db.query('SELECT status FROM scheduled_posts WHERE id=$1', [schedule])).rows[0].status).toBe('BLOCKED_ENTITLEMENT');
    expect((await db.query('SELECT * FROM published_posts WHERE draft_id=$1', [draft])).rowCount).toBe(0);
  });
});
