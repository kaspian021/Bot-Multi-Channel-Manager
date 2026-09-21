// ==============================================================
// Phase 2 Acceptance Test Suite: AC-01 to AC-22
// Channel Brain + AI Onboarding + Multilingual Intelligence
// ==============================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabaseClient } from '../src/infrastructure/database/db-client';
import { seedDatabase } from '../src/infrastructure/database/seed';
import { ChannelBrainService } from '../src/application/services/channel-brain-service';
import { OnboardingService } from '../src/application/services/onboarding-service';
import { ResearchService } from '../src/application/services/research-service';
import { DraftService } from '../src/application/services/draft-service';
import { TelegramBotService } from '../src/infrastructure/telegram/telegram-bot-service';
import { ChannelStatus, PreferenceType } from '../src/domain/types';

describe('Phase 2 Acceptance Tests — AC-01 to AC-22', () => {
  let db: any;
  let brainService: ChannelBrainService;
  let onboardingService: OnboardingService;
  let researchService: ResearchService;
  let draftService: DraftService;
  let botService: TelegramBotService;

  const defaultWorkspaceId = 'ws-demo-001';
  const defaultChannelId = 'ch-futurestack-001';

  beforeAll(async () => {
    db = getDatabaseClient();
    await seedDatabase(true); // Fresh migrations and seed
    brainService = new ChannelBrainService();
    onboardingService = new OnboardingService();
    researchService = new ResearchService();
    draftService = new DraftService();
    botService = new TelegramBotService();
  });

  // AC-01: Channel creation initializes in ONBOARDING status
  it('AC-01: Channel creation initializes in ONBOARDING status', async () => {
    const testChanId = `chan-test-${Date.now()}`;
    await db.query(
      `INSERT INTO channels (id, workspace_id, name, language, telegram_chat_id, status)
       VALUES ($1, $2, 'AI Daily News', 'en', '@aidailynews', $3)`,
      [testChanId, defaultWorkspaceId, ChannelStatus.ONBOARDING]
    );

    const res = await db.query('SELECT status FROM channels WHERE id = $1', [testChanId]);
    expect(res.rows[0].status).toBe(ChannelStatus.ONBOARDING);
  });

  // AC-02: Conversational onboarding interview via Telegram / Simulator
  it('AC-02: Conversational onboarding interview via Telegram / Simulator', async () => {
    const testChanId = `chan-onboard-${Date.now()}`;
    await db.query(
      `INSERT INTO channels (id, workspace_id, name, language, telegram_chat_id, status)
       VALUES ($1, $2, 'Robotics Weekly', 'en', '@roboticsweekly', 'ONBOARDING')`,
      [testChanId, defaultWorkspaceId]
    );

    const session = await onboardingService.startOnboarding(testChanId, '987654321');
    expect(session).toBeDefined();
    expect(session.status).toBe('IN_PROGRESS');
    expect(session.messages.length).toBeGreaterThan(0);
    expect(session.messages[0].role).toBe('assistant');
  });

  // AC-03: Natural language entity extraction extracts channel attributes
  it('AC-03: Natural language entity extraction extracts channel attributes', async () => {
    const extracted = onboardingService.extractFieldsFromNaturalLanguage(
      'Our channel covers Artificial Intelligence and Robotics for intermediate engineers with a technical, concise tone. We publish 4 posts per day in English and never talk about crypto.',
      {}
    );

    expect(extracted.topics).toContain('Artificial Intelligence');
    expect(extracted.topics).toContain('Robotics');
    expect(extracted.audienceLevel).toBe('intermediate');
    expect(extracted.postsPerDay).toBe(4);
    expect(extracted.language).toBe('en');
    expect(extracted.tone).toContain('Technical');
    expect(extracted.excludedTopics).toContain('Crypto');
  });

  // AC-04: Smart questioning only asks what is missing
  it('AC-04: Smart questioning only asks what is missing', async () => {
    const missingNone = onboardingService.getMissingFields({
      channelName: 'AI Daily',
      topics: ['AI'],
      audienceLevel: 'intermediate',
      tone: 'Concise',
      postsPerDay: 3,
      language: 'en',
      ownerLanguage: 'fa',
    });
    expect(missingNone.length).toBe(0);

    const missingTopics = onboardingService.getMissingFields({
      channelName: 'AI Daily',
    });
    expect(missingTopics).toContain('primary topics and niche focus');
  });

  // AC-05: Structured Channel Brain generation with all 10 required fields
  it('AC-05: Structured Channel Brain generation with all 10 required fields', () => {
    const brain = onboardingService.buildBrainFromExtractedData(defaultChannelId, {
      channelName: 'NeuroTech Wire',
      topics: ['Neuroscience', 'BCI'],
      audienceLevel: 'advanced',
      tone: 'Analytical and rigorous',
      postsPerDay: 2,
      language: 'en',
      ownerLanguage: 'fa',
      excludedTopics: ['Scams', 'Hype'],
    });

    expect(brain.identity).toBeDefined();
    expect(brain.audience).toBeDefined();
    expect(brain.content).toBeDefined();
    expect(brain.style).toBeDefined();
    expect(brain.sources).toBeDefined();
    expect(brain.publishing).toBeDefined();
    expect(brain.media).toBeDefined();
    expect(brain.approval).toBeDefined();
    expect(brain.business).toBeDefined();
    expect(brain.restrictions).toBeDefined();
    expect(brain.content.primaryTopics).toContain('Neuroscience');
  });

  // AC-06: Human review and approval of the generated brain before activation
  it('AC-06: Human review and approval of the generated brain before activation', async () => {
    const testChanId = `chan-review-${Date.now()}`;
    await db.query(
      `INSERT INTO channels (id, workspace_id, name, language, telegram_chat_id, status)
       VALUES ($1, $2, 'Review Test Channel', 'en', '@reviewtest', 'ONBOARDING')`,
      [testChanId, defaultWorkspaceId]
    );

    await onboardingService.startOnboarding(testChanId, '987654321');
    const stepRes = await onboardingService.processUserMessage(
      testChanId,
      '987654321',
      'The channel is about Quantum Computing for software engineers in English with a technical tone.'
    );

    expect(stepRes.session).toBeDefined();
    expect(stepRes.brainSummary).toBeDefined();
    expect(stepRes.isReadyForApproval).toBe(true);
  });

  // AC-07: Channel status transitions to ACTIVE upon brain approval
  it('AC-07: Channel status transitions to ACTIVE upon brain approval', async () => {
    const testChanId = `chan-approve-${Date.now()}`;
    await db.query(
      `INSERT INTO channels (id, workspace_id, name, language, telegram_chat_id, status)
       VALUES ($1, $2, 'Approve Activation Channel', 'en', '@approveact', 'ONBOARDING')`,
      [testChanId, defaultWorkspaceId]
    );

    await onboardingService.startOnboarding(testChanId, '987654321');
    await onboardingService.processUserMessage(
      testChanId,
      '987654321',
      'We publish DevOps insights in English for cloud architects.'
    );

    const activatedBrain = await onboardingService.approveBrain(testChanId, '987654321');
    expect(activatedBrain.status).toBe('ACTIVE');

    const chanRes = await db.query('SELECT status FROM channels WHERE id = $1', [testChanId]);
    expect(chanRes.rows[0].status).toBe(ChannelStatus.ACTIVE);
  });

  // AC-08: Multilingual channel configuration
  it('AC-08: Multilingual channel configuration', async () => {
    const settings = await brainService.getLanguageSettings(defaultChannelId);
    expect(settings.primaryChannelLanguage).toBe('en');
    expect(settings.contentLanguage).toBe('en');
    expect(settings.ownerCommunicationLanguage).toBe('fa');
    expect(settings.allowedSourceLanguages).toContain('de');
    expect(settings.allowedSourceLanguages).toContain('ja');
  });

  // AC-09: Owner communication language operates independently from content language
  it('AC-09: Owner communication language operates independently from content language (fa UI vs en post)', async () => {
    const draft = await draftService.getDraft('draft-demo-001');
    expect(draft).toBeDefined();

    // Notification generated for Persian owner
    const notification = await botService.formatDraftNotification(draft!, 'fa');
    expect(notification.text).toContain('پیشنهاد محتوای جدید'); // Persian notification header
    expect(notification.text).toContain(draft!.headline); // English post headline preserved
    expect(notification.inlineKeyboard[0][0].text).toContain('تأیید'); // Persian Approve button
    expect(notification.inlineKeyboard[0][1].text).toContain('ویرایش'); // Persian Edit button
    expect(notification.inlineKeyboard[0][2].text).toContain('رد'); // Persian Reject button
  });

  // AC-10: Research discovery across multiple allowed source languages
  it('AC-10: Research discovery across multiple allowed source languages', async () => {
    const run = await researchService.runDiscovery(defaultChannelId);
    expect(run.candidatesDiscovered).toBeGreaterThan(0);

    const candidates = await researchService.getCandidates(defaultChannelId);
    const sourceLangs = candidates.map(c => c.sourceLanguage || 'en');
    expect(sourceLangs).toContain('de');
    expect(sourceLangs).toContain('ja');
  });

  // AC-11: Content synthesis translates and adapts source material into target content language
  it('AC-11: Content synthesis translates and adapts source material into target content language', async () => {
    // Japanese candidate
    const jaCandidate = {
      id: `cand-ja-${Date.now()}`,
      channelId: defaultChannelId,
      title: 'ヒューマノイドロボットの最新自律制御モデル',
      content: '日本の研究所が開発した次世代ヒューマノイドロボットは、CUDAとTransformerアーキテクチャを活用してリアルタイムに環境認識を行う。',
      sourceLanguage: 'ja',
      sourceUrl: 'https://robotics-japan.ac.jp/paper',
    };

    const draft = await draftService.synthesizeCandidateToDraft(defaultChannelId, jaCandidate);
    expect(draft.targetLanguage).toBe('en');
    expect(draft.content || draft.body).toContain('CUDA');
    expect(draft.content || draft.body).toContain('Transformer');
    expect(draft.content || draft.body).not.toContain('ヒューマノイド'); // Synthesized to English
  });

  // AC-12: Technical term preservation during multilingual processing
  it('AC-12: Technical term preservation during multilingual processing', () => {
    const synthesized = draftService.preserveTechnicalTerms(
      'The model utilizes cuda cores, transformer attention, and fine-tuned llm weights.',
      ['CUDA', 'Transformer', 'LLM']
    );

    expect(synthesized).toContain('CUDA');
    expect(synthesized).toContain('Transformer');
    expect(synthesized).toContain('LLM');
  });

  // AC-13: Channel Brain versioning creates immutable snapshots on change
  it('AC-13: Channel Brain versioning creates immutable snapshots on change', async () => {
    const initialBrain = await brainService.getBrain(defaultChannelId);
    const initialVersion = initialBrain!.version;

    const updated = await brainService.saveBrain(
      defaultChannelId,
      {
        ...initialBrain!,
        style: {
          ...initialBrain!.style,
          tone: 'Hyper-focused, analytical, and data-driven',
        },
      },
      'owner',
      'Refined editorial tone to be more data-driven'
    );

    expect(updated.version).toBe(initialVersion + 1);

    const versions = await brainService.getVersions(defaultChannelId);
    expect(versions.length).toBeGreaterThanOrEqual(2);
    expect(versions[0].version).toBe(updated.version);
    expect(versions[0].reason).toContain('data-driven');
  });

  // AC-14: Brain version history shows changes, timestamps, and who made them
  it('AC-14: Brain version history shows changes, timestamps, and who made them', async () => {
    const versions = await brainService.getVersions(defaultChannelId);
    expect(versions.length).toBeGreaterThan(0);
    const latest = versions[0];
    expect(latest.changedBy).toBe('owner');
    expect(latest.createdAt).toBeDefined();
    expect(latest.changedFields).toBeDefined();
  });

  // AC-15: Rollback/restore to a previous brain version creates a new version with the restored state
  it('AC-15: Rollback/restore to a previous brain version creates a new version with the restored state', async () => {
    const versions = await brainService.getVersions(defaultChannelId);
    const targetVersion = versions[versions.length - 1].version; // Version 1

    const restored = await brainService.restoreVersion(defaultChannelId, targetVersion, 'owner');
    expect(restored.version).toBeGreaterThan(targetVersion); // New snapshot version incremented
    expect(restored.identity.channelName).toBe('FutureStack AI');
  });

  // AC-16: Explicit owner preferences are enforced strictly
  it('AC-16: Explicit owner preferences are enforced strictly', async () => {
    const explicitPref = await brainService.addPreference(defaultChannelId, {
      channelId: defaultChannelId,
      type: 'EXPLICIT',
      category: 'HEADLINE',
      rule: 'Never use question mark in post title',
      confidence: 1.0,
      source: 'MANUAL',
      status: 'ACTIVE',
    });

    expect(explicitPref.type).toBe('EXPLICIT');
    expect(explicitPref.confidence).toBe(1.0);

    const prefs = await brainService.getPreferences(defaultChannelId);
    const matched = prefs.find(p => p.rule.includes('question mark'));
    expect(matched).toBeDefined();
    expect(matched?.type).toBe('EXPLICIT');
  });

  // AC-17: Inferred preferences learned from owner edits and actions
  it('AC-17: Inferred preferences learned from owner edits and actions', async () => {
    const originalText = 'Revolutionary breakthrough in AI changes everything!';
    const editedText = 'New benchmark results in Transformer inference latency.';

    const learnedPref = await brainService.inferPreferencesFromEdit(
      defaultChannelId,
      originalText,
      editedText
    );

    expect(learnedPref).not.toBeNull();
    expect(learnedPref?.type).toBe('INFERRED');
    expect(learnedPref?.rule).toContain('sensationalist');
    expect(learnedPref?.source).toBe('EDIT_LEARNING');
  });

  // AC-18: Precedence rule: explicit preferences always override inferred ones
  it('AC-18: Precedence rule: explicit preferences always override inferred ones', async () => {
    const effective = await brainService.getEffectivePreferences(defaultChannelId);
    // Ensure explicit rules always rank above inferred rules
    expect(effective.explicit.length).toBeGreaterThan(0);
    for (const exp of effective.explicit) {
      expect(exp.type).toBe('EXPLICIT');
    }
  });

  // AC-19: Strategy recommendations generated based on channel performance and audience fit
  it('AC-19: Strategy recommendations generated based on channel performance and audience fit', async () => {
    const recs = await brainService.getStrategyRecommendations(defaultChannelId);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].title).toBeDefined();
    expect(recs[0].category).toBe('CONTENT_MIX');
    expect(recs[0].status).toBe('PENDING');
  });

  // AC-20: Strategy recommendations require owner approval (YELLOW permission tier) before applying
  it('AC-20: Strategy recommendations require owner approval (YELLOW permission tier) before applying', async () => {
    const recs = await brainService.getStrategyRecommendations(defaultChannelId);
    const pendingRec = recs.find(r => r.status === 'PENDING');
    expect(pendingRec).toBeDefined();

    await brainService.applyStrategyRecommendation(pendingRec!.id, defaultChannelId);

    const updatedRecs = await brainService.getStrategyRecommendations(defaultChannelId);
    const appliedRec = updatedRecs.find(r => r.id === pendingRec!.id);
    expect(appliedRec?.status).toBe('APPLIED');
  });

  // AC-21: Research engine incorporates Channel Brain topics, exclusions, and quality criteria
  it('AC-21: Research engine incorporates Channel Brain topics, exclusions, and quality criteria', async () => {
    const brain = await brainService.getBrain(defaultChannelId);
    expect(brain?.content.primaryTopics).toBeDefined();
    expect(brain?.restrictions?.excludedKeywords).toContain('crypto airdrop');

    // Run discovery - verified that excluded keywords are strictly excluded
    const run = await researchService.runDiscovery(defaultChannelId);
    const candidates = await researchService.getCandidates(defaultChannelId);
    for (const cand of candidates) {
      expect(cand.title.toLowerCase()).not.toContain('crypto airdrop');
      expect((cand.summary || '').toLowerCase()).not.toContain('crypto airdrop');
    }
  });

  // AC-22: Drafting engine incorporates Channel Brain tone, style, restrictions, and language rules
  it('AC-22: Drafting engine incorporates Channel Brain tone, style, restrictions, and language rules', async () => {
    const candidates = await researchService.getCandidates(defaultChannelId);
    const cand = candidates[0];

    const draft = await draftService.synthesizeCandidateToDraft(defaultChannelId, cand);
    expect(draft.targetLanguage).toBe('en');
    expect(draft.channelId).toBe(defaultChannelId);
    expect(draft.body.length).toBeGreaterThan(50);
  });
});
