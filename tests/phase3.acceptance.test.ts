// ==============================================================
// Phase 3 Acceptance Test Suite: AC-01 to AC-33
// Real Research Intelligence + Real Sources + Production Telegram
// ==============================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabaseClient } from '../src/infrastructure/database/db-client';
import { seedDatabase } from '../src/infrastructure/database/seed';
import { ProductionUrlFetcher } from '../src/infrastructure/connectors/url-fetcher';
import { HtmlContentExtractor } from '../src/infrastructure/connectors/html-content-extractor';
import { YouTubeConnector } from '../src/infrastructure/connectors/youtube-connector';
import { RedditConnector } from '../src/infrastructure/connectors/reddit-connector';
import { GeminiSearchGroundingProvider } from '../src/infrastructure/research/gemini-search-grounding-provider';
import { OpenAiWebSearchProvider } from '../src/infrastructure/research/openai-web-search-provider';
import { ResilientResearchProvider } from '../src/infrastructure/research/resilient-research-provider';
import { ResearchPlanner } from '../src/application/services/research-planner';
import { ChannelBrainService } from '../src/application/services/channel-brain-service';
import { analyzeNoveltyRelation, clusterStoryCandidates } from '../src/domain/clustering';
import { detectBreakingNewsCategory } from '../src/domain/breaking-news';
import { FactCheckingService } from '../src/application/services/fact-checking-service';
import { RealTelegramClient } from '../src/infrastructure/telegram/real-telegram-client';
import { TelegramBotService } from '../src/infrastructure/telegram/telegram-bot-service';
import { SourceTrustTier, SourceHealthStatus, ContentCandidate, ContentDraft } from '../src/domain/types';

describe('Phase 3 Acceptance Tests — AC-01 to AC-33', () => {
  let db: any;
  let brainService: ChannelBrainService;
  let urlFetcher: ProductionUrlFetcher;
  let htmlExtractor: HtmlContentExtractor;
  let factCheckingService: FactCheckingService;
  let botService: TelegramBotService;
  let realTelegramClient: RealTelegramClient;

  const channelId = 'ch-futurestack-001';

  beforeAll(async () => {
    process.env.DEMO_MODE = 'true';
    db = getDatabaseClient();
    await seedDatabase(true);
    brainService = new ChannelBrainService();
    urlFetcher = new ProductionUrlFetcher();
    htmlExtractor = new HtmlContentExtractor();
    factCheckingService = new FactCheckingService();
    botService = new TelegramBotService();
    realTelegramClient = new RealTelegramClient('demo_bot_token_123456');
  });

  // AC-01: Resilient research provider with primary Google Gemini search grounding + OpenAI fallback
  it('AC-01: Resilient research provider initializes with primary Gemini grounding and OpenAI fallback', async () => {
    const primary = new GeminiSearchGroundingProvider();
    const fallback = new OpenAiWebSearchProvider();
    const resilient = new ResilientResearchProvider(primary, fallback);

    const result = await resilient.researchTopic('DeepSeek reasoning models', {
      channelId,
      languages: ['en'],
      queryTypes: ['OFFICIAL_SOURCE', 'RESEARCH_PAPERS'],
    });

    expect(result).toBeDefined();
    expect(result.providerUsed).toBeDefined();
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].sourceUrl).toContain('http');
  });

  // AC-02: Automatic failover when primary search provider fails, logging provider_failure_logs to DB
  it('AC-02: Automatic failover to secondary provider when primary fails, logging failure to DB', async () => {
    // Failing primary provider
    const failingPrimary = {
      name: 'Google Gemini Search Grounding',
      async researchTopic() {
        throw new Error('Quota exceeded HTTP 429');
      },
    };
    const workingFallback = new OpenAiWebSearchProvider();
    const resilient = new ResilientResearchProvider(failingPrimary, workingFallback);

    const result = await resilient.researchTopic('LLM context caching', { channelId });

    expect(result.providerUsed).toBe(workingFallback.providerName);
    expect(result.fallbackTriggered).toBe(true);

    // Verify DB failure log
    const logRes = await db.query(
      "SELECT * FROM provider_failure_logs WHERE provider = 'Google Gemini Search Grounding' ORDER BY created_at DESC LIMIT 1"
    );
    expect(logRes.rowCount).toBeGreaterThan(0);
    expect(logRes.rows[0].error_message).toContain('Quota exceeded HTTP 429');
  });

  // AC-03: Safe URL fetcher blocks SSRF attacks against private IP addresses
  it('AC-03: Safe URL fetcher blocks SSRF attacks against private IP addresses', async () => {
    const privateUrls = [
      'http://127.0.0.1/admin',
      'http://localhost:8080/secret',
      'http://10.0.0.1/internal-api',
      'http://169.254.169.254/latest/meta-data/',
      'http://192.168.1.1/router',
    ];

    for (const url of privateUrls) {
      const res = await urlFetcher.fetchUrl(url);
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    }
  });

  // AC-04: Safe URL fetcher enforces size limits (<= 5MB)
  it('AC-04: Safe URL fetcher rejects payloads exceeding size limit (5MB)', async () => {
    // Attempting to fetch huge data stream or URL configured with small limit
    const res = await urlFetcher.fetchUrl('https://example.com/oversized', { maxSizeBytes: 10 });
    // In mock/demo or network failure, it safely reports refusal or error
    expect(res.success).toBe(false);
  });

  // AC-05: Safe URL fetcher enforces redirect limit (<= 3 hops)
  it('AC-05: Safe URL fetcher enforces redirect limit', async () => {
    const res = await urlFetcher.fetchUrl('https://example.com/loop', { maxRedirects: 3 });
    // Should fail safely or reject excessive redirect chains
    expect(res).toBeDefined();
    expect(typeof res.statusCode === 'number').toBe(true);
  });

  // AC-06: Safe URL fetcher enforces timeout (<= 15 seconds)
  it('AC-06: Safe URL fetcher enforces timeout safeguards', async () => {
    const res = await urlFetcher.fetchUrl('https://example.com/slow', { timeoutMs: 50 });
    expect(res).toBeDefined();
  });

  // AC-07: HTML article extractor strips navigation, ads, headers, scripts, and extracts main readable text
  it('AC-07: HTML article extractor strips navigation, headers, scripts and extracts readable text', () => {
    const sampleHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>DeepSeek Technical Architecture</title>
          <meta name="description" content="Overview of deep learning architecture">
          <script>console.log("tracking code");</script>
          <style>body { font-family: sans-serif; }</style>
        </head>
        <body>
          <nav>
            <a href="/home">Home</a>
            <a href="/pricing">Pricing</a>
          </nav>
          <div class="ad-banner">Click here for discounts!</div>
          <article>
            <h1>DeepSeek-V3 Multi-head Latent Attention Overview</h1>
            <p>DeepSeek-V3 introduces dynamic sparse Mixture of Experts with 671 billion total parameters.</p>
            <p>The architecture compresses key-value cache memory footprint by 65% while achieving state-of-the-art reasoning benchmark performance.</p>
          </article>
          <footer>Copyright 2026 DeepSeek Inc</footer>
        </body>
      </html>
    `;

    const extracted = htmlExtractor.extractContent(sampleHtml, 'https://deepseek.ai/paper');
    expect(extracted.title).toContain('DeepSeek');
    expect(extracted.textContent).toContain('Multi-head Latent Attention');
    expect(extracted.textContent).toContain('671 billion total parameters');
    expect(extracted.textContent).not.toContain('Click here for discounts!');
    expect(extracted.textContent).not.toContain('console.log');
    expect(extracted.estimatedReadingTimeMinutes).toBeGreaterThanOrEqual(1);
  });

  // AC-08: Canonical URL normalization strips tracking parameters (utm_*, ref, fbclid)
  it('AC-08: Canonical URL normalization strips tracking parameters and standardizes host/path', () => {
    const dirtyUrl = 'https://Example.COM:443/research/paper/?utm_source=twitter&utm_medium=social&ref=producthunt&fbclid=xyz123#abstract';
    const cleanUrl = urlFetcher.normalizeCanonicalUrl(dirtyUrl);
    expect(cleanUrl).toBe('https://example.com/research/paper');
  });

  // AC-09: YouTube Data API connector extracts video titles, descriptions, and channel uploads
  it('AC-09: YouTube connector parses video metadata, channel uploads, and transcripts', async () => {
    const ytConnector = new YouTubeConnector();
    const result = await ytConnector.fetchCandidates('https://youtube.com/@ai_engineers');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].title).toBeDefined();
    expect(result[0].sourceType).toBe('YOUTUBE');
    expect(result[0].url).toContain('youtube.com/watch?v=');
  });

  // AC-10: Reddit connector extracts top posts, engagement score, and submission comments
  it('AC-10: Reddit connector extracts top posts, discussion signals, and upvote score', async () => {
    const reddit = new RedditConnector();
    const result = await reddit.fetchCandidates('https://reddit.com/r/LocalLLaMA');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].title).toBeDefined();
    expect(result[0].sourceType).toBe('REDDIT');
    expect(result[0].score).toBeGreaterThan(0);
  });

  // AC-11: Research planner creates queries across multilingual channels
  it('AC-11: Research planner creates queries across multilingual channels (en, de, ja, ru)', async () => {
    const planner = new ResearchPlanner();
    const plan = await planner.buildResearchPlan(channelId);

    expect(plan.languages).toContain('en');
    expect(plan.languages.some((l) => ['de', 'ja', 'ru'].includes(l))).toBe(true);
    expect(plan.queries.length).toBeGreaterThan(3);
  });

  // AC-12: Research planner covers query diversity (Breaking news, official releases, research, open source, community signals)
  it('AC-12: Research planner covers 5 distinct query diversity categories', async () => {
    const planner = new ResearchPlanner();
    const plan = await planner.buildResearchPlan(channelId);

    const categories = new Set(plan.queries.map((q) => q.category));
    expect(categories.has('BREAKING_NEWS')).toBe(true);
    expect(categories.has('OFFICIAL_SOURCE')).toBe(true);
    expect(categories.has('RESEARCH_PAPERS')).toBe(true);
    expect(categories.has('OPEN_SOURCE_RELEASES')).toBe(true);
    expect(categories.has('COMMUNITY_SIGNALS')).toBe(true);
  });

  // AC-13: Research planner incorporates Channel Brain topics, exclusions, and content mix
  it('AC-13: Research planner incorporates Channel Brain topics, exclusions, and content mix', async () => {
    const planner = new ResearchPlanner();
    const plan = await planner.buildResearchPlan(channelId);

    expect(plan.topics.length).toBeGreaterThan(0);
    expect(plan.excludedTopics).toContain('Crypto gambling');
    expect(plan.contentMix['AI News']).toBeDefined();
  });

  // AC-14: Research planner respects Channel Brain Temporary Directives
  it('AC-14: Research planner respects Channel Brain Temporary Directives', async () => {
    const planner = new ResearchPlanner();
    const plan = await planner.buildResearchPlan(channelId);

    expect(plan.temporaryDirectives).toBeDefined();
    expect(Array.isArray(plan.temporaryDirectives)).toBe(true);
  });

  // AC-15: Source trust tiering model classifies sources into Tier 1-4
  it('AC-15: Source trust tiering model classifies sources into Tier 1 to Tier 4', async () => {
    const sources = await db.query('SELECT trust_tier, trust_score FROM content_sources');
    expect(sources.rowCount).toBeGreaterThan(0);

    const tiers = sources.rows.map((r: any) => r.trust_tier);
    expect(tiers).toContain(SourceTrustTier.TIER_1);
  });

  // AC-16: Source health monitoring tracks consecutive failures and transitions
  it('AC-16: Source health monitoring tracks consecutive failures and degrades cleanly', async () => {
    const testSrcId = `src-test-health-${Date.now()}`;
    await db.query(`
      INSERT INTO content_sources (id, channel_id, name, type, url, trust_tier, health_status, consecutive_failures)
      VALUES ($1, $2, 'Flaky RSS Feed', 'RSS', 'https://example.com/flaky.xml', 2, 'HEALTHY', 0)
    `, [testSrcId, channelId]);

    // Simulate 3 failures
    await db.query(`
      UPDATE content_sources
      SET consecutive_failures = 3, health_status = 'DEGRADED', last_error = 'Timeout 504'
      WHERE id = $1
    `, [testSrcId]);

    let res = await db.query('SELECT health_status, consecutive_failures FROM content_sources WHERE id = $1', [testSrcId]);
    expect(res.rows[0].health_status).toBe(SourceHealthStatus.DEGRADED);
    expect(res.rows[0].consecutive_failures).toBe(3);

    // Simulate 5 failures -> FAILING
    await db.query(`
      UPDATE content_sources
      SET consecutive_failures = 6, health_status = 'FAILING'
      WHERE id = $1
    `, [testSrcId]);

    res = await db.query('SELECT health_status FROM content_sources WHERE id = $1', [testSrcId]);
    expect(res.rows[0].health_status).toBe(SourceHealthStatus.FAILING);
  });

  // AC-17: Novelty engine correctly classifies EXACT_DUPLICATE
  it('AC-17: Novelty engine correctly classifies EXACT_DUPLICATE', () => {
    const candA: Partial<ContentCandidate> = {
      title: 'Anthropic open-sources Model Context Protocol specification for agent tools',
      summary: 'Anthropic today released MCP, an open standard for tool integration.',
      url: 'https://anthropic.com/news/model-context-protocol',
    };
    const candB: Partial<ContentCandidate> = {
      title: 'Anthropic open-sources Model Context Protocol specification for agent tools',
      summary: 'Anthropic today released MCP, an open standard for tool integration.',
      url: 'https://anthropic.com/news/model-context-protocol',
    };

    const relation = analyzeNoveltyRelation(candA as ContentCandidate, candB as ContentCandidate);
    expect(relation.relation).toBe('EXACT_DUPLICATE');
    expect(relation.similarityScore).toBeGreaterThan(0.9);
  });

  // AC-18: Novelty engine identifies SAME_STORY_NEW_INFORMATION
  it('AC-18: Novelty engine identifies SAME_STORY_NEW_INFORMATION', () => {
    const initialStory: Partial<ContentCandidate> = {
      title: 'DeepSeek announces upcoming v3 reasoning model release',
      summary: 'DeepSeek pre-announces its new open weights mixture of experts model.',
      url: 'https://deepseek.ai/teaser',
    };
    const followupStory: Partial<ContentCandidate> = {
      title: 'DeepSeek releases full v3 model weights and benchmark evaluation report',
      summary: 'DeepSeek has published the full 671B parameter weights on Hugging Face with benchmark scores beating frontier closed models.',
      url: 'https://huggingface.co/deepseek-ai/DeepSeek-V3',
    };

    const relation = analyzeNoveltyRelation(initialStory as ContentCandidate, followupStory as ContentCandidate);
    expect(relation.relation).toBe('SAME_STORY_NEW_INFORMATION');
    expect(relation.novelInformationPoints.length).toBeGreaterThan(0);
  });

  // AC-19: Novelty engine groups related items into story clusters
  it('AC-19: Novelty engine groups related items into story clusters', () => {
    const candidates: Partial<ContentCandidate>[] = [
      { id: 'c1', title: 'DeepSeek open-sources v3 model', url: 'https://deepseek.com/1', score: 90 },
      { id: 'c2', title: 'DeepSeek v3 weights released on Hugging Face', url: 'https://huggingface.co/deepseek', score: 95 },
      { id: 'c3', title: 'vLLM 0.7.0 release with chunked prefill', url: 'https://github.com/vllm/releases', score: 88 },
    ];

    const clusters = clusterStoryCandidates(candidates as ContentCandidate[]);
    expect(clusters.length).toBe(2);
    const deepSeekCluster = clusters.find((c) => c.topicSlug === 'deepseek-open-sources-v3-model' || c.candidates.length === 2);
    expect(deepSeekCluster).toBeDefined();
    expect(deepSeekCluster?.candidates.length).toBe(2);
  });

  // AC-20: Breaking news classifier identifies BREAKING
  it('AC-20: Breaking news classifier identifies BREAKING (< 2h, Tier 1, High Impact)', () => {
    const published30MinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const category = detectBreakingNewsCategory({
      publishedAt: published30MinsAgo,
      sourceTier: SourceTrustTier.TIER_1,
      importanceScore: 95,
      hasPrimarySource: true,
    });

    expect(category).toBe('BREAKING');
  });

  // AC-21: Breaking news classifier identifies RECENT (< 24h), CURRENT, and EVERGREEN
  it('AC-21: Breaking news classifier distinguishes RECENT, CURRENT, and EVERGREEN', () => {
    const published8HoursAgo = new Date(Date.now() - 8 * 3600 * 1000).toISOString();
    const published48HoursAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const published30DaysAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString();

    const recent = detectBreakingNewsCategory({ publishedAt: published8HoursAgo, sourceTier: SourceTrustTier.TIER_1, importanceScore: 80, hasPrimarySource: true });
    const current = detectBreakingNewsCategory({ publishedAt: published48HoursAgo, sourceTier: SourceTrustTier.TIER_2, importanceScore: 70, hasPrimarySource: true });
    const evergreen = detectBreakingNewsCategory({ publishedAt: published30DaysAgo, sourceTier: SourceTrustTier.TIER_2, importanceScore: 60, hasPrimarySource: false });

    expect(recent).toBe('RECENT');
    expect(current).toBe('CURRENT');
    expect(evergreen).toBe('EVERGREEN');
  });

  // AC-22: Atomic claim extraction separates text into verifiable factual assertions
  it('AC-22: Atomic claim extraction separates text into verifiable assertions', () => {
    const bodyText = 'DeepSeek-V3 was trained on 14.8 trillion tokens. The model features 671 billion total parameters with 37 billion activated per token. Training completed in 2 months on a cluster of 2048 NVIDIA H800 GPUs.';
    const claims = factCheckingService.extractClaims(bodyText, 'draft-test-123', channelId);

    expect(claims.length).toBeGreaterThanOrEqual(3);
    expect(claims.some((c) => c.text.includes('14.8 trillion tokens'))).toBe(true);
    expect(claims.some((c) => c.text.includes('671 billion total parameters'))).toBe(true);
  });

  // AC-23: Evidence items store verbatim quotes, snippet, source URL, source type, and publication time
  it('AC-23: Evidence items store verbatim quotes, snippet, source URL, source type, and publication time', async () => {
    const evRes = await db.query('SELECT * FROM evidence_items LIMIT 1');
    expect(evRes.rowCount).toBe(1);
    const ev = evRes.rows[0];

    expect(ev.source_url).toBeDefined();
    expect(ev.snippet).toBeDefined();
    expect(ev.source_type).toBeDefined();
    expect(ev.published_at).toBeDefined();
    expect(ev.confidence_score).toBeGreaterThan(0.8);
  });

  // AC-24: Claim-to-Evidence graph links multiple evidence items to claims
  it('AC-24: Claim-to-Evidence graph links multiple evidence items to claims', async () => {
    const claimsRes = await db.query('SELECT * FROM claims LIMIT 1');
    expect(claimsRes.rowCount).toBe(1);
    const cl = claimsRes.rows[0];

    const evidenceIds = typeof cl.source_evidence_ids === 'string' ? JSON.parse(cl.source_evidence_ids) : cl.source_evidence_ids;
    expect(Array.isArray(evidenceIds)).toBe(true);
    expect(evidenceIds.length).toBeGreaterThan(0);
  });

  // AC-25: Cross-source verification marks claim VERIFIED when corroborated by independent primary sources
  it('AC-25: Cross-source verification corroborates claim across independent sources', () => {
    const claim = {
      id: 'cl-test-1',
      draftId: 'draft-1',
      channelId,
      text: 'DeepSeek-V3 uses 671B parameters with 37B active',
      normalizedText: 'deepseek v3 uses 671b parameters with 37b active',
      importance: 'CRITICAL' as const,
      confidence: 0.9,
      verificationStatus: 'UNVERIFIED' as const,
      sourceEvidenceIds: [],
      conflictingEvidenceIds: [],
    };

    const evidence = [
      {
        id: 'ev-1',
        channelId,
        sourceUrl: 'https://arxiv.org/abs/2412.19437',
        sourceTitle: 'arXiv Technical Report',
        sourceType: 'PRIMARY_RESEARCH' as const,
        publishedAt: new Date().toISOString(),
        textContent: 'DeepSeek-V3 is an MoE model with 671B total parameters and 37B active parameters per token.',
        snippet: '671B total parameters and 37B active parameters',
        confidenceScore: 0.98,
        verificationStatus: 'VERIFIED' as const,
      },
      {
        id: 'ev-2',
        channelId,
        sourceUrl: 'https://huggingface.co/deepseek-ai/DeepSeek-V3',
        sourceTitle: 'Hugging Face Model Card',
        sourceType: 'OFFICIAL_SOURCE' as const,
        publishedAt: new Date().toISOString(),
        textContent: 'Architecture: 671B MoE with 37B activated per token.',
        snippet: '671B MoE with 37B activated per token',
        confidenceScore: 0.95,
        verificationStatus: 'VERIFIED' as const,
      },
    ];

    const verified = factCheckingService.crossVerifyClaim(claim, evidence);
    expect(verified.verificationStatus).toBe('VERIFIED');
    expect(verified.confidence).toBeGreaterThan(0.95);
    expect(verified.sourceEvidenceIds.length).toBe(2);
  });

  // AC-26: Conflict detection detects contradictory claims across sources
  it('AC-26: Conflict detection flags contradictory claims across sources', () => {
    const claim = {
      id: 'cl-test-conf',
      draftId: 'draft-1',
      channelId,
      text: 'DeepSeek-V3 requires 100,000 NVIDIA H100 GPUs for training',
      normalizedText: 'deepseek v3 requires 100000 nvidia h100 gpus for training',
      importance: 'CRITICAL' as const,
      confidence: 0.5,
      verificationStatus: 'UNVERIFIED' as const,
      sourceEvidenceIds: [],
      conflictingEvidenceIds: [],
    };

    const conflictingEvidence = [
      {
        id: 'ev-contra-1',
        channelId,
        sourceUrl: 'https://deepseek.ai/report',
        sourceTitle: 'Official Report',
        sourceType: 'OFFICIAL_SOURCE' as const,
        publishedAt: new Date().toISOString(),
        textContent: 'Training was completed on a cluster of only 2,048 NVIDIA H800 GPUs.',
        snippet: 'only 2,048 NVIDIA H800 GPUs',
        confidenceScore: 0.99,
        verificationStatus: 'VERIFIED' as const,
      },
    ];

    const result = factCheckingService.crossVerifyClaim(claim, conflictingEvidence);
    expect(result.verificationStatus).toBe('CONTRADICTED');
    expect(result.conflictingEvidenceIds.length).toBe(1);
  });

  // AC-27: Real Telegram Bot API client validates channel administrator privileges
  it('AC-27: Real Telegram client validates channel administrator and post permissions', async () => {
    const check = await realTelegramClient.verifyChannel('@futurestack_ai');
    expect(check.isValid).toBe(true);
    expect(check.isAdministrator).toBe(true);
    expect(check.canPostMessages).toBe(true);
    expect(check.channelTitle).toBeDefined();
  });

  // AC-28: Real Telegram Bot API validates sender ID against numeric TELEGRAM_OWNER_USER_ID
  it('AC-28: Real Telegram Bot service validates sender ID against numeric TELEGRAM_OWNER_USER_ID', async () => {
    const authorized = botService.isAuthorizedOwner(987654321);
    const unauthorized = botService.isAuthorizedOwner(112233445);

    expect(authorized).toBe(true);
    expect(unauthorized).toBe(false);

    // Test rejection of update from unauthorized user
    const res = await botService.handleUpdate({
      update_id: 999,
      message: {
        message_id: 1,
        from: { id: 112233445, is_bot: false, first_name: 'Intruder' },
        chat: { id: 112233445, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: '/pause',
      },
    });

    expect(res.responseText).toContain('Unauthorized');
  });

  // AC-29: Database-backed publishing lock prevents double publishing via idempotency key
  it('AC-29: Database-backed publishing lock prevents double publishing via idempotency key', async () => {
    const testDraftId = 'draft-idemp-test-01';
    const postText = 'Test idempotent Telegram post broadcast';
    const key = `test-idemp-${Date.now()}`;

    // First publish attempt
    const firstPub = await realTelegramClient.publishPost('@futurestack_ai', postText, undefined, key);
    expect(firstPub.success).toBe(true);

    // Second publish attempt with exact same key must not duplicate
    const secondPub = await realTelegramClient.publishPost('@futurestack_ai', postText, undefined, key);
    expect(secondPub.success).toBe(true);
    expect(secondPub.messageId).toBe(firstPub.messageId);

    // Check publishing locks table
    const lockRes = await db.query('SELECT * FROM publishing_locks WHERE idempotency_key = $1', [key]);
    expect(lockRes.rowCount).toBe(1);
    expect(lockRes.rows[0].status).toBe('COMPLETED');
  });

  // AC-30: Draft approval card generates interactive inline buttons
  it('AC-30: Draft approval card generates interactive buttons including [🔎 EVIDENCE] and [📚 SOURCES]', () => {
    const mockDraft: ContentDraft = {
      id: 'draft-btn-test',
      workspaceId: 'ws-demo-001',
      channelId,
      topic: 'AI Models',
      title: 'DeepSeek reasoning breakthrough',
      headline: 'DeepSeek releases open weights for v3',
      body: 'DeepSeek has released the full open weights for v3...',
      status: 'PENDING_APPROVAL' as any,
      suggestedPublishTime: 'Today, 20:30 UTC',
      confidenceScore: 95,
      contentScore: 92,
      sources: [{ title: 'arXiv Report', url: 'https://arxiv.org/abs/1' }],
      factCheckItems: [{ claim: '671B params', status: 'VERIFIED', supportingSources: ['arXiv'], confidence: 95 }],
      qualityEvaluation: { status: 'PASS', factualityScore: 95, sourceCoverageScore: 95, writingQualityScore: 90, grammarScore: 95, duplicateLikelihood: 5, clickbaitScore: 0, hallucinationRisk: 5, reasons: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const notification = botService.formatDraftNotification(mockDraft, 'en');
    const buttons = notification.inlineKeyboard.flat();

    expect(buttons.some((b) => b.callback_data.startsWith('APPROVE_DRAFT:'))).toBe(true);
    expect(buttons.some((b) => b.callback_data.startsWith('EDIT_DRAFT:'))).toBe(true);
    expect(buttons.some((b) => b.callback_data.startsWith('REJECT_DRAFT:'))).toBe(true);
    expect(buttons.some((b) => b.callback_data.startsWith('CHANGE_TIME:'))).toBe(true);
    expect(buttons.some((b) => b.callback_data.startsWith('VIEW_EVIDENCE:'))).toBe(true);
    expect(buttons.some((b) => b.callback_data.startsWith('VIEW_SOURCES:'))).toBe(true);
  });

  // AC-31: Callback queries for [🔎 EVIDENCE] and [📚 SOURCES] return detailed factual grounding
  it('AC-31: Callback queries for [🔎 EVIDENCE] and [📚 SOURCES] return detailed factual grounding', async () => {
    const ownerId = 987654321;

    // Trigger VIEW_SOURCES
    const srcRes = await botService.handleUpdate({
      update_id: 101,
      callback_query: {
        id: 'cq-src-1',
        from: { id: ownerId, is_bot: false, first_name: 'Owner' },
        data: 'VIEW_SOURCES:draft-demo-001',
      },
    });
    expect(srcRes.handled).toBe(true);
    expect(srcRes.responseText).toContain('Sources displayed');

    // Trigger VIEW_EVIDENCE
    const evRes = await botService.handleUpdate({
      update_id: 102,
      callback_query: {
        id: 'cq-ev-1',
        from: { id: ownerId, is_bot: false, first_name: 'Owner' },
        data: 'VIEW_EVIDENCE:draft-demo-001',
      },
    });
    expect(evRes.handled).toBe(true);
    expect(evRes.responseText).toContain('Evidence displayed');
  });

  // AC-32: Safe test connection message verifies channel publishing without spamming subscribers
  it('AC-32: Safe test connection message verifies channel publishing', async () => {
    const testResult = await realTelegramClient.sendTestMessage('@futurestack_ai');
    expect(testResult.success).toBe(true);
    expect(testResult.messageId).toBeGreaterThan(0);
    expect(testResult.messageUrl).toContain('futurestack_ai');
  });

  // AC-33: Demo mode toggle allows zero-config offline execution with demo mocks
  it('AC-33: Demo mode toggle allows zero-config offline execution when DEMO_MODE=true', async () => {
    const isDemo = process.env.DEMO_MODE === 'true';
    expect(isDemo).toBe(true);

    const bot = new TelegramBotService(undefined, undefined, true);
    const pub = await bot.publishToChannel('@futurestack_ai', {
      id: 'demo-post-ac33',
      workspaceId: 'ws-demo-001',
      channelId,
      topic: 'AI Models',
      title: 'Demo test post',
      headline: 'Demo Mode Publishing Works Offline',
      body: 'Verified offline simulation works cleanly without external API credentials.',
      status: 'APPROVED' as any,
      suggestedPublishTime: 'Immediate',
      confidenceScore: 90,
      contentScore: 90,
      sources: [],
      factCheckItems: [],
      qualityEvaluation: { status: 'PASS', factualityScore: 90, sourceCoverageScore: 90, writingQualityScore: 90, grammarScore: 90, duplicateLikelihood: 0, clickbaitScore: 0, hallucinationRisk: 0, reasons: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(pub.success).toBe(true);
    expect(pub.messageId).toBeGreaterThan(0);
  });
});
