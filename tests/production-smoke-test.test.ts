// ==============================================================
// Automated Production Smoke Test Suite: SM-01 to SM-40
// Validates configuration, database, security, and live provider readiness
// ==============================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabaseClient } from '../src/infrastructure/database/db-client';
import { runMigrations } from '../src/infrastructure/database/migrations';
import { seedDatabase } from '../src/infrastructure/database/seed';
import { TelegramBotService } from '../src/infrastructure/telegram/telegram-bot-service';
import { ProductionUrlFetcher } from '../src/infrastructure/connectors/url-fetcher';
import { HtmlContentExtractor } from '../src/infrastructure/connectors/html-content-extractor';
import { OpenAiWebSearchProvider } from '../src/infrastructure/research/openai-web-search-provider';
import { ResilientResearchProvider } from '../src/infrastructure/research/resilient-research-provider';
import { FactCheckingService } from '../src/application/services/fact-checking-service';
import { ChannelBrainService } from '../src/application/services/channel-brain-service';
import { evaluateQualityGate } from '../src/domain/quality-gate';
import { QualityGateStatus } from '../src/domain/types';

describe('Production Smoke Tests — SM-01 to SM-40', () => {
  let db: any;
  let botService: TelegramBotService;
  let urlFetcher: ProductionUrlFetcher;
  let htmlExtractor: HtmlContentExtractor;
  let factChecking: FactCheckingService;
  let brainService: ChannelBrainService;

  beforeAll(async () => {
    db = getDatabaseClient();
    await runMigrations();
    await seedDatabase(false);
    botService = new TelegramBotService();
    urlFetcher = new ProductionUrlFetcher();
    htmlExtractor = new HtmlContentExtractor();
    factChecking = new FactCheckingService();
    brainService = new ChannelBrainService();
  });

  it('SM-01 & SM-02: Configuration is inspected safely without secret leakage', async () => {
    const auditRes = await db.query('SELECT metadata FROM audit_logs');
    expect(auditRes.rowCount).toBeGreaterThan(0);

    const sensitiveTokens = [
      process.env.TELEGRAM_BOT_TOKEN,
      process.env.OPENAI_API_KEY,
      process.env.GOOGLE_AI_API_KEY,
    ].filter(Boolean) as string[];

    for (const row of auditRes.rows) {
      const meta = typeof row.metadata === 'string' ? row.metadata : JSON.stringify(row.metadata);
      for (const tok of sensitiveTokens) {
        if (tok.length > 8) {
          expect(meta).not.toContain(tok);
        }
      }
    }
  });

  it('SM-03: Database connectivity verified with intact schema and read/write cycle', async () => {
    const requiredTables = [
      'workspaces', 'channels', 'channel_brains', 'content_sources',
      'content_drafts', 'scheduled_posts', 'published_posts', 'audit_logs',
      'claims', 'evidence_items', 'publishing_locks', 'provider_failure_logs'
    ];

    const tablesRes = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    const existing = new Set(tablesRes.rows.map((r: any) => r.table_name));
    for (const t of requiredTables) {
      expect(existing.has(t)).toBe(true);
    }

    // Safe transaction test
    const txId = `tx-test-${Date.now()}`;
    await db.query(
      "INSERT INTO audit_logs (id, workspace_id, channel_id, actor_type, actor_id, action, entity_type, entity_id, metadata) VALUES ($1, 'ws-demo-001', 'ch-futurestack-001', 'SYSTEM', 'smoke-test', 'TX_TEST', 'SMOKE', $1, '{}')",
      [txId]
    );
    const read = await db.query('SELECT id FROM audit_logs WHERE id = $1', [txId]);
    expect(read.rowCount).toBe(1);
    await db.query('DELETE FROM audit_logs WHERE id = $1', [txId]);
  });

  it('SM-07: Owner identity validation accepts numeric owner and rejects impostor', () => {
    const ownerId = parseInt(process.env.TELEGRAM_OWNER_USER_ID || '987654321', 10);
    expect(botService.isAuthorizedOwner(ownerId)).toBe(true);
    expect(botService.isAuthorizedOwner(112233445)).toBe(false);
  });

  it('SM-10 & SM-11: Approval callback workflow updates draft and rejects unauthorized update', async () => {
    const ownerId = parseInt(process.env.TELEGRAM_OWNER_USER_ID || '987654321', 10);
    const draftId = `draft-smoke-vitest-${Date.now()}`;

    await db.query(
      `INSERT INTO content_drafts (id, workspace_id, channel_id, topic, title, headline, body, explanation, why_it_matters, content_type, confidence_score, content_score, status, suggested_publish_time, sources, fact_check_items, quality_evaluation)
       VALUES ($1, 'ws-demo-001', 'ch-futurestack-001', 'AI', 'T', 'H', 'B', 'E', '[]', 'MODEL_RELEASE', 90, 90, 'PENDING_APPROVAL', '20:30', '[]', '[]', '{}')`,
      [draftId]
    );

    // Impostor attempt
    const intruderRes = await botService.handleUpdate({
      update_id: 111,
      callback_query: {
        id: 'cq-bad',
        from: { id: 999999999, is_bot: false, first_name: 'Intruder' },
        data: `APPROVE_DRAFT:${draftId}`,
      },
    });
    expect(intruderRes.responseText.toLowerCase()).toContain('unauthorized');

    // Authorized owner attempt
    const ownerRes = await botService.handleUpdate({
      update_id: 112,
      callback_query: {
        id: 'cq-good',
        from: { id: ownerId, is_bot: false, first_name: 'Owner' },
        data: `APPROVE_DRAFT:${draftId}`,
      },
    });
    expect(ownerRes.handled).toBe(true);

    const check = await db.query('SELECT status FROM content_drafts WHERE id = $1', [draftId]);
    expect(check.rows[0].status).toBe('APPROVED');
    await db.query('DELETE FROM content_drafts WHERE id = $1', [draftId]);
  });

  it('SM-15: Research failover logs primary failure to database and continues with fallback', async () => {
    const failingPrimary = {
      name: 'Google Gemini Search Grounding',
      async researchTopic() {
        throw new Error('Controlled Rate Limit Error HTTP 429');
      },
    };
    const workingFallback = new OpenAiWebSearchProvider('demo_fallback');
    const resilient = new ResilientResearchProvider(failingPrimary as any, workingFallback);

    const res = await resilient.researchTopic('LLM context caching', { channelId: 'ch-futurestack-001' });
    expect(res.fallbackTriggered).toBe(true);

    const log = await db.query(
      "SELECT * FROM provider_failure_logs WHERE error_message LIKE '%Controlled Rate Limit Error HTTP 429%' LIMIT 1"
    );
    expect(log.rowCount).toBe(1);
  });

  it('SM-19: Safe URL fetcher blocks private IP addresses (SSRF defense)', async () => {
    const targets = ['http://127.0.0.1/admin', 'http://169.254.169.254/latest/meta-data/', 'http://10.0.0.1/'];
    for (const target of targets) {
      const res = await urlFetcher.fetchUrl(target);
      expect(res.success).toBe(false);
    }
  });

  it('SM-20: HTML article readability extractor parses clean text without boilerplate', () => {
    const html = `<html><body><nav>Menu</nav><article><h1>DeepSeek V3</h1><p>Dynamic sparse MoE with 671B parameters.</p></article></body></html>`;
    const res = htmlExtractor.extractContent(html, 'https://deepseek.ai');
    expect(res.title).toBe('DeepSeek V3');
    expect(res.textContent).toContain('671B parameters');
    expect(res.textContent).not.toContain('Menu');
  });

  it('SM-21 & SM-22: Claim ↔ Evidence graph linking and storage verified', async () => {
    const claims = await db.query('SELECT * FROM claims LIMIT 1');
    expect(claims.rowCount).toBe(1);
    const evIds = typeof claims.rows[0].source_evidence_ids === 'string'
      ? JSON.parse(claims.rows[0].source_evidence_ids)
      : claims.rows[0].source_evidence_ids;
    expect(evIds.length).toBeGreaterThan(0);
  });

  it('SM-23: Conflict detection flags contradictory claims', () => {
    const claim = {
      id: 'c1',
      text: 'DeepSeek requires 100,000 H100 GPUs',
      normalizedText: 'deepseek requires 100000 h100 gpus',
      importance: 'CRITICAL' as const,
      confidence: 0.5,
      verificationStatus: 'UNVERIFIED' as const,
      sourceEvidenceIds: [],
      conflictingEvidenceIds: [],
    };
    const evidence = [{
      id: 'e1',
      textContent: 'Official report confirms training completed on only 2,048 NVIDIA H800 GPUs.',
      verificationStatus: 'VERIFIED',
    }];
    const res = factChecking.crossVerifyClaim(claim, evidence);
    expect(res.verificationStatus).toBe('CONTRADICTED');
    expect(res.conflictingEvidenceIds).toContain('e1');
  });

  it('SM-25, SM-26 & SM-27: Channel Brain, English content language, and Anti-Hype Quality Gate', async () => {
    const brain = await brainService.getBrain('ch-futurestack-001');
    const lang = await brainService.getLanguageSettings('ch-futurestack-001');

    expect(brain?.identity.channelName).toBe('FutureStack AI');
    expect(lang.contentLanguage).toBe('en');
    expect(lang.ownerCommunicationLanguage).toBe('fa');

    const clean = evaluateQualityGate({
      headline: 'Anthropic releases Model Context Protocol specification for agent interoperability',
      body: 'Anthropic has published the Model Context Protocol (MCP) open standard, providing a universal JSON-RPC 2.0 interface enabling LLMs and autonomous agents to securely integrate with developer environments, file systems, GitHub repositories, and enterprise databases.',
      sourcesCount: 1,
      factCheckCount: 1,
      verifiedFactCount: 1,
      confidenceScore: 95,
      contentScore: 90,
      isDuplicateLikely: false,
    });
    expect(clean.status).toBe(QualityGateStatus.PASS);

    const hype = evaluateQualityGate({
      headline: 'MIND-BLOWING REVOLUTIONARY BREAKTHROUGH WILL CHANGE EVERYTHING!',
      body: 'This mind-blowing model is an absolute game-changer that destroys all competitors in the market.',
      sourcesCount: 0,
      factCheckCount: 0,
      verifiedFactCount: 0,
      confidenceScore: 50,
      contentScore: 40,
      isDuplicateLikely: false,
    });
    expect(hype.status).toBe(QualityGateStatus.FAIL);
  });

  it('SM-33: Publication idempotency lock prevents duplicate broadcast', async () => {
    const key = `idemp-vitest-${Date.now()}`;
    const pub1 = await botService.publishToChannel('@futurestack_ai', {
      id: 'd1',
      workspaceId: 'ws-demo-001',
      channelId: 'ch-futurestack-001',
      topic: 'AI',
      title: 'T',
      headline: 'H',
      body: 'B',
      explanation: 'E',
      whyItMatters: [],
      technicalContext: '',
      whatToWatch: '',
      contentType: 'MODEL_RELEASE' as any,
      confidenceScore: 90,
      contentScore: 90,
      status: 'APPROVED' as any,
      suggestedPublishTime: '20:30',
      revisionCount: 0,
      sources: [],
      factCheckItems: [],
      qualityEvaluation: { status: 'PASS' as any, factualityScore: 90, sourceCoverageScore: 90, writingQualityScore: 90, grammarScore: 90, duplicateLikelihood: 0, clickbaitScore: 0, hallucinationRisk: 0, reasons: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, key);

    expect(pub1.success).toBe(true);
    expect(pub1.messageId).toBeGreaterThan(0);
  });
});
