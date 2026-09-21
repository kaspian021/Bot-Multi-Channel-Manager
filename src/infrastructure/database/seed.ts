// ==============================================================
// Database Seed Data — Extended with Phase 2 Channel Brain
// ==============================================================

import { getDatabaseClient } from './db-client';
import { runMigrations } from './migrations';

export async function seedDatabase(force = false): Promise<void> {
  await runMigrations();
  const db = getDatabaseClient();

  // Check if already seeded
  const existing = await db.query('SELECT count(*) as count FROM workspaces');
  const count = parseInt(existing.rows[0]?.count || '0', 10);
  if (count > 0 && !force) {
    // Check if channel_brains table already has entries
    const brainCheck = await db.query('SELECT count(*) as count FROM channel_brains');
    const claimsCheck = await db.query('SELECT count(*) as count FROM claims');
    if (parseInt(brainCheck.rows[0]?.count || '0', 10) > 0 && parseInt(claimsCheck.rows[0]?.count || '0', 10) > 0) {
      return;
    }
  }

  const workspaceId = 'ws-demo-001';
  const channelId = 'ch-futurestack-001';
  const ownerUserId = process.env.TELEGRAM_OWNER_USER_ID || '987654321';

  // 1. Workspace
  await db.query(
    `INSERT INTO workspaces (id, name, slug, owner_user_id) 
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [workspaceId, 'Demo Workspace', 'demo-workspace', ownerUserId]
  );

  // 2. Channel: FutureStack AI
  await db.query(
    `INSERT INTO channels (
      id, workspace_id, name, telegram_chat_id, telegram_channel_username, 
      language, status, description, bio, posting_frequency, timezone
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (id) DO NOTHING`,
    [
      channelId,
      workspaceId,
      'FutureStack AI',
      '@futurestack_ai',
      '@futurestack_ai',
      'en',
      'ACTIVE',
      'Daily curated intelligence on cutting-edge AI models, developer tools, robotics, and open-source breakthroughs.',
      'The premier engineering-first channel for AI systems and infrastructure.',
      3,
      'UTC',
    ]
  );

  // 3. Channel Strategy
  await db.query(
    `INSERT INTO channel_strategies (
      channel_id, language, target_audience, tone, style, posting_frequency,
      preferred_posting_windows, minimum_score, minimum_confidence,
      hashtag_policy, emoji_policy, media_policy, preferred_topics, excluded_topics
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (channel_id) DO NOTHING`,
    [
      channelId,
      'en',
      'Software engineers, AI researchers, machine learning practitioners, founders',
      'expert, clear, concise, technically credible',
      'high-quality human technology editor',
      3,
      JSON.stringify(['09:00', '14:00', '20:00']),
      75,
      70,
      'minimal',
      'moderate',
      'ai_or_preview',
      JSON.stringify(['AI Models', 'Developer Tools', 'Open Source AI', 'Robotics']),
      JSON.stringify(['crypto gambling', 'NFTs', 'unverified hype']),
    ]
  );

  // ==============================================================
  // PHASE 2 SEED: CHANNEL BRAIN, LANGUAGE, PREFERENCES, RECOMMENDATIONS
  // ==============================================================

  const brainIdentity = {
    channelName: 'FutureStack AI',
    description: 'Daily curated intelligence on cutting-edge AI models, developer tools, robotics, and open-source breakthroughs.',
    niche: 'Artificial Intelligence & Developer Ecosystems',
    subNiches: ['Foundation Models', 'Autonomous Agents', 'AI IDEs', 'Local LLMs', 'Robotics'],
    positioning: 'Engineering-grade briefings for practicing software professionals and technical architects.',
    uniqueValueProposition: 'Signal-dense, hype-free coverage verified against primary technical sources.',
    channelGoals: ['Audience technical education', 'Daily developer workflow insights', 'Open-source acceleration'],
  };

  const brainAudience = {
    targetAudience: 'Software engineers, AI researchers, technical founders, and systems architects',
    audienceKnowledgeLevel: 'advanced',
    interests: ['Transformer architectures', 'GPU inference optimization', 'Compilers', 'Open weights', 'Agent protocols'],
    painPoints: ['Excessive marketing hype', 'Unverifiable claims', 'Slow inference runtimes', 'Vendor lock-in'],
    geographicFocus: 'Global developer community',
  };

  const brainContent = {
    primaryTopics: ['AI Models', 'AI Agents', 'AI Coding', 'Developer Tools', 'Open Source AI'],
    secondaryTopics: ['Robotics', 'Cloud Infrastructure', 'Cybersecurity'],
    excludedTopics: ['Crypto gambling', 'NFTs', 'Celebrity gossip', 'Unverified rumors', 'Generic hype'],
    preferredContentTypes: ['MODEL_RELEASE', 'TOOL_ANNOUNCEMENT', 'OPEN_SOURCE', 'RESEARCH_PAPER'],
    contentMix: { 'AI News': 30, 'Developer Tools': 25, 'Research': 20, 'Open Source': 15, 'Tutorials': 10 },
    technicalDepth: 'high',
    preferredPostLength: { minChars: 400, maxChars: 1200 },
  };

  const brainStyle = {
    tone: 'Expert, concise, modern, credible, non-corporate',
    writingStyle: 'High-quality human technology editor',
    headlineStyle: 'Direct and descriptive without exclamation marks',
    emojiPolicy: 'minimal',
    hashtagPolicy: 'minimal',
    ctaPolicy: 'read primary sources',
    formattingRules: ['Emoji headline', 'Bullet point takeaways', 'Technical context block', 'Direct source URL link'],
  };

  const brainSources = {
    preferredSources: ['arXiv cs.AI', 'Hugging Face Blog', 'GitHub Trending AI', 'OpenAI Research', 'DeepMind'],
    excludedSources: ['Speculative rumor tabloids', 'Unattributed aggregators'],
    trustedDomains: ['arxiv.org', 'github.com', 'huggingface.co', 'deepmind.google', 'openai.com'],
    preferredSourceTypes: ['WEB', 'RSS'],
    sourceLanguages: ['en', 'de', 'ja'],
    minimumSourceQuality: 85,
  };

  const brainPublishing = {
    postingFrequency: 3,
    timezone: 'UTC',
    preferredPublishingWindows: ['09:00', '14:00', '20:00'],
    weekendPolicy: 'normal',
    minimumSpacingHours: 3,
  };

  const brainMedia = {
    imagePolicy: 'mixed',
    videoPolicy: 'links_only',
    aiImageGenerationPolicy: 'Cybernetic blueprint aesthetic, obsidian and electric blue',
    screenshotPolicy: 'Permitted for benchmark tables and official diagrams',
    mediaTextLanguage: 'en',
  };

  const brainApproval = {
    allPostsRequireOwnerApproval: true,
    allowedAutonomousActions: ['research', 'source_deduplication', 'candidate_scoring', 'draft_generation', 'quality_reviews'],
    actionsRequiringOwnerApproval: ['publish_post', 'branding_changes', 'schedule_changes', 'sponsored_content'],
  };

  const brainBusiness = {
    growthObjective: 'Top-tier technical audience retention',
    monetizationObjective: 'Selective developer tool sponsorships',
    advertisingPolicy: 'Developer productivity tools only',
    affiliatePolicy: 'Strict disclosure required',
    sponsoredContentPolicy: 'Max 1 post per week with owner approval',
  };

  const brainRestrictions = {
    prohibitedTopics: ['Crypto gambling', 'NFTs', 'Celebrity gossip', 'Unverified rumors'],
    sensitiveTopicsRequiringApproval: ['Critical cybersecurity zero-days', 'Vendor lawsuits'],
    competitorMentions: 'Permitted neutrally with technical benchmarks only',
    excludedKeywords: ['crypto airdrop', 'free tokens', 'get rich quick', '100x gains'],
    embargoPolicy: 'Respect all stated embargo timestamps',
    copyrightPolicy: 'Fair use quotation with explicit link attribution',
  };

  // Seed Channel Brain
  await db.query(
    `INSERT INTO channel_brains (
      id, channel_id, version, status, identity_json, audience_json,
      content_json, style_json, sources_json, publishing_json, media_json,
      approval_json, business_json, restrictions_json
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (channel_id) DO NOTHING`,
    [
      `brain-${channelId}`,
      channelId,
      1,
      'ACTIVE',
      JSON.stringify(brainIdentity),
      JSON.stringify(brainAudience),
      JSON.stringify(brainContent),
      JSON.stringify(brainStyle),
      JSON.stringify(brainSources),
      JSON.stringify(brainPublishing),
      JSON.stringify(brainMedia),
      JSON.stringify(brainApproval),
      JSON.stringify(brainBusiness),
      JSON.stringify(brainRestrictions),
    ]
  );

  // Seed Initial Version Snapshot
  await db.query(
    `INSERT INTO channel_brain_versions (
      id, channel_id, brain_id, version, snapshot_json, changed_fields, changed_by, reason
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (id) DO NOTHING`,
    [
      `cbv-${channelId}-v1`,
      channelId,
      `brain-${channelId}`,
      1,
      JSON.stringify({
        id: `brain-${channelId}`,
        channelId,
        version: 1,
        status: 'ACTIVE',
        identity: brainIdentity,
        audience: brainAudience,
        content: brainContent,
        style: brainStyle,
        sources: brainSources,
        publishing: brainPublishing,
        media: brainMedia,
        approval: brainApproval,
        business: brainBusiness,
        restrictions: brainRestrictions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      JSON.stringify(['initial_creation']),
      'system',
      'Initial Channel Brain generated via Onboarding Workflow',
    ]
  );

  // Seed Channel Language Settings (Section 4 & 21: Owner communication in Persian, content in English)
  await db.query(
    `INSERT INTO channel_language_settings (
      channel_id, primary_channel_language, content_language, metadata_language,
      headline_language, hashtag_language, cta_language, media_text_language,
      owner_communication_language, allowed_source_languages, fallback_language,
      translation_policy, preserve_technical_terms
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (channel_id) DO NOTHING`,
    [
      channelId,
      'en',
      'en',
      'en',
      'en',
      'en',
      'en',
      'en',
      'fa', // Persian (Farsi) owner communication language
      JSON.stringify(['en', 'de', 'ja']), // Multilingual research
      'en',
      'SYNTHESIZE_TO_CONTENT_LANGUAGE',
      true,
    ]
  );

  // Seed Owner Preferences (Section 10: Explicit vs Inferred)
  await db.query(
    `INSERT INTO owner_preferences (id, channel_id, type, category, rule, confidence, source, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    [
      'pref-exp-01',
      channelId,
      'EXPLICIT',
      'STYLE',
      'Never use exclamation points or hyperbolic words like "mind-blowing" or "revolutionary"',
      1.0,
      'ONBOARDING',
      'ACTIVE',
    ]
  );

  await db.query(
    `INSERT INTO owner_preferences (id, channel_id, type, category, rule, confidence, source, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    [
      'pref-exp-02',
      channelId,
      'EXPLICIT',
      'TOPIC',
      'Reject speculative rumors; only publish verified benchmark or codebase releases',
      1.0,
      'ONBOARDING',
      'ACTIVE',
    ]
  );

  await db.query(
    `INSERT INTO owner_preferences (id, channel_id, type, category, rule, confidence, source, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    [
      'pref-inf-01',
      channelId,
      'INFERRED',
      'LENGTH',
      'Owner prefers high conciseness (< 800 characters) based on past edit behavior',
      0.82,
      'EDIT_LEARNING',
      'ACTIVE',
    ]
  );

  // Seed AI Strategy Recommendation (Section 18)
  await db.query(
    `INSERT INTO strategy_recommendations (id, channel_id, title, category, current_value, recommended_value, reason, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    [
      'strat-rec-01',
      channelId,
      'Increase Developer Tools Content Mix',
      'CONTENT_MIX',
      'Developer Tools: 20%',
      'Developer Tools: 30%',
      'Recent open-source dev tool posts generated 42% higher retention and bookmarking from subscribers.',
      'PENDING',
    ]
  );

  // 4. Topics
  const topics = [
    { slug: 'ai-models', name: 'AI Models', desc: 'Foundation models, reasoning architectures, multimodal LLMs', keywords: ['llm', 'transformer', 'reasoning', 'weights'], imp: 10 },
    { slug: 'ai-agents', name: 'AI Agents', desc: 'Autonomous workflows, tool calling, multi-agent frameworks', keywords: ['agents', 'mcp', 'function calling', 'autonomy'], imp: 9 },
    { slug: 'ai-coding', name: 'AI Coding', desc: 'Code generation, AI IDEs, automated testing, copilot tools', keywords: ['coding', 'copilot', 'ide', 'refactoring'], imp: 9 },
    { slug: 'ai-research', name: 'AI Research', desc: 'arXiv breakthroughs, architectural innovations, safety alignment', keywords: ['paper', 'arxiv', 'benchmark', 'attention'], imp: 8 },
    { slug: 'developer-tools', name: 'Developer Tools', desc: 'CLI utilities, debugging, compilers, developer productivity', keywords: ['devtools', 'cli', 'compiler', 'sdk'], imp: 8 },
    { slug: 'open-source-ai', name: 'Open Source AI', desc: 'Hugging Face models, open weights, local deployment, Ollama', keywords: ['open source', 'huggingface', 'ollama', 'vllm'], imp: 9 },
    { slug: 'robotics', name: 'Robotics', desc: 'Embodied AI, humanoid systems, physical reinforcement learning', keywords: ['robotics', 'humanoid', 'actuators', 'spatial'], imp: 7 },
    { slug: 'cybersecurity', name: 'Cybersecurity', desc: 'AI safety, adversarial attacks, secure runtime, prompt injection', keywords: ['security', 'vulnerability', 'injection', 'audit'], imp: 7 },
    { slug: 'cloud', name: 'Cloud & Infrastructure', desc: 'GPU clusters, distributed inference, Kubernetes, edge computing', keywords: ['gpu', 'cuda', 'h100', 'inference', 'cluster'], imp: 7 },
  ];

  for (const t of topics) {
    await db.query(
      `INSERT INTO topics (id, channel_id, slug, name, description, keywords, importance, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (channel_id, slug) DO NOTHING`,
      [
        `top-${t.slug}`,
        channelId,
        t.slug,
        t.name,
        t.desc,
        JSON.stringify(t.keywords),
        t.imp,
        true,
      ]
    );
  }

  // 5. Sources
  const sources = [
    { id: 'src-arxiv-ai', name: 'arXiv CS.AI & Computation', type: 'RSS', url: 'https://arxiv.org/rss/cs.AI', priority: 9, trust: 95 },
    { id: 'src-huggingface-blog', name: 'Hugging Face Blog', type: 'WEB', url: 'https://huggingface.co/blog', priority: 9, trust: 92 },
    { id: 'src-openai-news', name: 'OpenAI Research & News', type: 'WEB', url: 'https://openai.com/news', priority: 10, trust: 96 },
    { id: 'src-google-deepmind', name: 'Google DeepMind Research', type: 'WEB', url: 'https://deepmind.google/discover/blog', priority: 10, trust: 95 },
    { id: 'src-github-trending-ai', name: 'GitHub Trending AI Repositories', type: 'WEB', url: 'https://github.com/trending?since=daily', priority: 8, trust: 88 },
    { id: 'src-youtube-tech', name: 'YouTube AI Engineering Talks', type: 'YOUTUBE', url: 'https://youtube.com/@ai_engineers', priority: 7, trust: 85 },
    { id: 'src-reddit-localllama', name: 'Reddit LocalLLaMA Community', type: 'REDDIT', url: 'https://reddit.com/r/LocalLLaMA', priority: 7, trust: 80 },
  ];

  for (const s of sources) {
    await db.query(
      `INSERT INTO content_sources (id, channel_id, name, type, url, priority, trust_score, tags, polling_interval_minutes, language)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [
        s.id,
        channelId,
        s.name,
        s.type,
        s.url,
        s.priority,
        s.trust,
        JSON.stringify(['tech', 'ai']),
        180,
        'en',
      ]
    );
  }

  // 6. Prompt Templates
  const prompts = [
    {
      key: 'research_system',
      name: 'Research Discovery System',
      system: 'You are an elite technology research intelligence system. Extract high-signal, factual engineering breakthroughs, releases, and tools.',
      template: 'Analyze the following web source for channel {{channel_name}}. Identify key factual claims, source credibility, and novelty.',
      vars: ['channel_name', 'topic'],
    },
    {
      key: 'fact_check_system',
      name: 'Fact Checking Engine',
      system: 'You are a rigorous technical fact-checker. Extract atomic claims and verify them against multiple authoritative sources. Reject hallucinations.',
      template: 'Fact check these claims: {{claims}}. Check against supporting sources: {{sources}}.',
      vars: ['claims', 'sources'],
    },
    {
      key: 'writer_system',
      name: 'Content Writer Engine',
      system: 'You are a senior technology editor writing English posts for a top-tier Telegram channel. Tone: concise, expert, informative, no clickbait or overhype.',
      template: 'Draft a post based on topic {{topic}} and verified claims {{claims}}. Follow the standard formatting guidelines.',
      vars: ['topic', 'claims', 'sources'],
    },
    {
      key: 'editor_system',
      name: 'Natural Language Revision Editor',
      system: 'You are a precise editorial assistant. Revise the draft according to owner instructions while maintaining strict factual integrity.',
      template: 'Existing draft: {{draft}}\nOwner instruction: {{instruction}}\nPreserve facts and revise cleanly.',
      vars: ['draft', 'instruction'],
    },
    {
      key: 'quality_review_system',
      name: 'Automated Quality Gate Review',
      system: 'You are the quality assurance gatekeeper. Evaluate technical depth, factuality, grammar, Telegram formatting, and length.',
      template: 'Evaluate draft: {{draft}}. Return pass/warn/fail status with specific metrics.',
      vars: ['draft'],
    },
  ];

  for (const p of prompts) {
    await db.query(
      `INSERT INTO prompt_templates (id, key, version, name, system_prompt, user_prompt_template, variables, description)
       VALUES ($1, $2, 1, $3, $4, $5, $6, $7)
       ON CONFLICT (key) DO NOTHING`,
      [
        `prompt-${p.key}`,
        p.key,
        p.name,
        p.system,
        p.template,
        JSON.stringify(p.vars),
        'Core prompt template for ' + p.name,
      ]
    );
  }

  // 7. Sample Drafts
  const draft1Id = 'draft-demo-001';
  const draft2Id = 'draft-demo-002';
  const draft3Id = 'draft-demo-003';

  await db.query(
    `INSERT INTO content_drafts (
      id, workspace_id, channel_id, topic, title, headline, body,
      explanation, why_it_matters, technical_context, what_to_watch,
      content_type, confidence_score, content_score, status, suggested_publish_time,
      sources, fact_check_items, quality_evaluation
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    ON CONFLICT (id) DO NOTHING`,
    [
      draft1Id,
      workspaceId,
      channelId,
      'Open Source AI',
      'DeepSeek releases open weights for v3 reasoning architecture',
      'DeepSeek open-sources v3 reasoning weights with multi-token prediction',
      'DeepSeek has released the full open weights and technical report for its v3 architecture, featuring 671B total parameters with 37B activated per token via dynamic sparse Mixture of Experts.',
      'DeepSeek open-sources v3 architecture featuring dynamic sparse Mixture of Experts and native multi-token prediction.',
      JSON.stringify([
        'Full weights licensed under open permissive terms for self-hosting',
        'Achieves parity with proprietary frontier models on major coding benchmarks',
        'Demonstrates extreme training efficiency via FP8 mixed precision pipeline',
      ]),
      'The architecture utilizes Multi-head Latent Attention (MLA) to compress key-value cache footprint by 65%, enabling 128k context windows on standard server nodes.',
      'Community quantization efforts (vLLM, Ollama, SGLang) are rolling out 4-bit and FP8 serving kernels over the next 48 hours.',
      'OPEN_SOURCE',
      94,
      92,
      'PENDING_APPROVAL',
      'Today, 20:30 UTC',
      JSON.stringify([
        { title: 'DeepSeek-V3 Technical Report', url: 'https://github.com/deepseek-ai/DeepSeek-V3' },
        { title: 'Hugging Face Model Card', url: 'https://huggingface.co/deepseek-ai/DeepSeek-V3' },
      ]),
      JSON.stringify([
        { claim: 'DeepSeek-V3 uses 671B total parameters with 37B active', status: 'VERIFIED', supportingSources: ['DeepSeek Technical Report'], confidence: 98 },
        { claim: 'MLA reduces KV cache memory footprint by 65%', status: 'VERIFIED', supportingSources: ['DeepSeek Technical Report'], confidence: 95 },
      ]),
      JSON.stringify({
        status: 'PASS',
        factualityScore: 96,
        sourceCoverageScore: 100,
        writingQualityScore: 94,
        grammarScore: 98,
        duplicateLikelihood: 5,
        clickbaitScore: 0,
        hallucinationRisk: 5,
        reasons: ['High technical accuracy', 'Multiple verified source links'],
      }),
    ]
  );

  await db.query(
    `INSERT INTO content_drafts (
      id, workspace_id, channel_id, topic, title, headline, body,
      explanation, why_it_matters, technical_context, what_to_watch,
      content_type, confidence_score, content_score, status, suggested_publish_time,
      sources, fact_check_items, quality_evaluation
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    ON CONFLICT (id) DO NOTHING`,
    [
      draft2Id,
      workspaceId,
      channelId,
      'AI Coding',
      'Anthropic releases Model Context Protocol specification for agent tool interoperability',
      'Model Context Protocol standardizes agentic tool and data integration',
      'Anthropic has open-sourced the Model Context Protocol (MCP), an open standard enabling AI assistants to securely connect with local developer environments, enterprise data repositories, and developer tools.',
      'Anthropic open-sources MCP standard to simplify connecting AI models to developer environments.',
      JSON.stringify([
        'Replaces bespoke API adapters with a universal client-server protocol',
        'Already supported by GitHub, Zed editor, Postgres, and Brave Search',
        'Provides local-first security boundaries for sensitive codebases',
      ]),
      'MCP relies on JSON-RPC 2.0 over standard I/O and Server-Sent Events (SSE), standardizing resources, prompts, and tools.',
      'Watch for adoption across major IDEs like VS Code, JetBrains, and terminal-based coding agents.',
      'TOOL_ANNOUNCEMENT',
      91,
      89,
      'APPROVED',
      'Tomorrow, 09:00 UTC',
      JSON.stringify([
        { title: 'Model Context Protocol Documentation', url: 'https://modelcontextprotocol.io' },
        { title: 'Anthropic Engineering Blog', url: 'https://anthropic.com/news/model-context-protocol' },
      ]),
      JSON.stringify([
        { claim: 'MCP uses JSON-RPC 2.0 protocol over Stdio and SSE', status: 'VERIFIED', supportingSources: ['modelcontextprotocol.io'], confidence: 95 },
      ]),
      JSON.stringify({
        status: 'PASS',
        factualityScore: 95,
        sourceCoverageScore: 100,
        writingQualityScore: 92,
        grammarScore: 98,
        duplicateLikelihood: 10,
        clickbaitScore: 0,
        hallucinationRisk: 8,
        reasons: ['Clear developer impact', 'Official documentation verified'],
      }),
    ]
  );

  await db.query(
    `INSERT INTO content_drafts (
      id, workspace_id, channel_id, topic, title, headline, body,
      explanation, why_it_matters, technical_context, what_to_watch,
      content_type, confidence_score, content_score, status, suggested_publish_time,
      sources, fact_check_items, quality_evaluation
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    ON CONFLICT (id) DO NOTHING`,
    [
      draft3Id,
      workspaceId,
      channelId,
      'Cloud & Infrastructure',
      'vLLM team releases v0.7.0 with chunked prefill and native FP8 support',
      'vLLM 0.7.0 brings 2.4x throughput boost with chunked prefill',
      'The open-source vLLM project has released version 0.7.0, introducing native chunked prefill scheduling and automated FP8 KV cache quantization for modern GPU architectures.',
      'vLLM 0.7.0 release enhances throughput for high-concurrency LLM inference.',
      JSON.stringify([
        'Reduces time-to-first-token (TTFT) latency under heavy batching loads',
        'Cuts memory footprint on NVIDIA Ada and Hopper hardware architectures',
        'Includes native support for multimodal reasoning models',
      ]),
      'Chunked prefill interleaves prefill computations with decoding steps, preventing compute stall bubbles on high-concurrency clusters.',
      'Integration into Kubernetes-based serving frameworks (vLLM-operator, KServe) scheduled for next week.',
      'OPEN_SOURCE',
      88,
      86,
      'DRAFTED',
      'Tomorrow, 14:00 UTC',
      JSON.stringify([
        { title: 'vLLM Release Notes v0.7.0', url: 'https://github.com/vllm-project/vllm/releases' },
      ]),
      JSON.stringify([]),
      JSON.stringify({
        status: 'PASS',
        factualityScore: 90,
        sourceCoverageScore: 90,
        writingQualityScore: 88,
        grammarScore: 95,
        duplicateLikelihood: 0,
        clickbaitScore: 0,
        hallucinationRisk: 10,
        reasons: ['Verified GitHub release notes'],
      }),
    ]
  );

  // 8. Scheduled Posts (at least 2)
  const scheduledTime1 = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
  const scheduledTime2 = new Date(Date.now() + 14 * 3600 * 1000).toISOString();

  await db.query(
    `INSERT INTO scheduled_posts (id, workspace_id, channel_id, draft_id, scheduled_for, status, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO NOTHING`,
    ['sched-001', workspaceId, channelId, draft2Id, scheduledTime1, 'PENDING', 'idemp-sched-001']
  );

  await db.query(
    `INSERT INTO scheduled_posts (id, workspace_id, channel_id, draft_id, scheduled_for, status, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO NOTHING`,
    ['sched-002', workspaceId, channelId, draft3Id, scheduledTime2, 'PENDING', 'idemp-sched-002']
  );

  // 9. Audit Logs
  const logs = [
    { actor: 'SYSTEM', action: 'SYSTEM_INITIALIZED', type: 'SYSTEM', id: 'sys-001', meta: { mode: 'DEMO_MODE', version: '2.0.0' } },
    { actor: 'AI_WORKER', action: 'CHANNEL_BRAIN_ACTIVATED', type: 'CHANNEL_BRAIN', id: `brain-${channelId}`, meta: { version: 1 } },
    { actor: 'AI_WORKER', action: 'RESEARCH_DISCOVERY_COMPLETED', type: 'RESEARCH_RUN', id: 'run-init-001', meta: { candidatesFound: 3, durationMs: 420 } },
    { actor: 'AI_WORKER', action: 'CANDIDATE_QUALIFIED', type: 'CANDIDATE', id: 'cand-demo-001', meta: { score: 92, topic: 'Open Source AI' } },
    { actor: 'AI_WORKER', action: 'DRAFT_GENERATED', type: 'DRAFT', id: draft1Id, meta: { title: 'DeepSeek-V3 reasoning weights', qualityGate: 'PASS' } },
    { actor: 'AI_WORKER', action: 'APPROVAL_REQUEST_SENT_TELEGRAM', type: 'DRAFT', id: draft1Id, meta: { recipientOwnerId: ownerUserId } },
    { actor: 'OWNER', action: 'DRAFT_APPROVED', type: 'DRAFT', id: draft2Id, meta: { approvedBy: ownerUserId, scheduleAction: 'KEEP_TIME' } },
    { actor: 'AI_WORKER', action: 'POST_SCHEDULED', type: 'SCHEDULED_POST', id: 'sched-001', meta: { scheduledFor: scheduledTime1 } },
  ];

  for (let i = 0; i < logs.length; i++) {
    const l = logs[i];
    await db.query(
      `INSERT INTO audit_logs (id, workspace_id, channel_id, actor_type, actor_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [
        `audit-${i + 1}`,
        workspaceId,
        channelId,
        l.actor,
        l.actor === 'OWNER' ? ownerUserId : 'worker-01',
        l.action,
        l.type,
        l.id,
        JSON.stringify(l.meta),
      ]
    );
  }

  // ==============================================================
  // PHASE 3 SEED: EVIDENCE ITEMS, CLAIMS, TRUST TIERS, HEALTH
  // ==============================================================
  await db.query(`
    UPDATE content_sources
    SET 
      trust_tier = CASE 
        WHEN type IN ('WEB', 'RSS') AND priority >= 9 THEN 1
        WHEN type IN ('YOUTUBE', 'REDDIT') THEN 3
        ELSE 2
      END,
      health_status = 'HEALTHY',
      consecutive_failures = 0
  `);

  // Seed sample Evidence Items
  const ev1Id = 'ev-demo-001';
  const ev2Id = 'ev-demo-002';

  await db.query(`
    INSERT INTO evidence_items (
      id, channel_id, source_id, source_url, source_title, source_type,
      published_at, text_content, snippet, confidence_score, verification_status
    ) VALUES 
    ($1, $2, 'src-arxiv-ai', 'https://github.com/deepseek-ai/DeepSeek-V3', 'DeepSeek-V3 Technical Report', 'OFFICIAL_SOURCE',
     CURRENT_TIMESTAMP, 'DeepSeek-V3 incorporates 671 billion total parameters with 37 billion active parameters per token.',
     '671B total parameters with 37B active parameters per token', 0.98, 'VERIFIED'),
    ($3, $2, 'src-openai-news', 'https://modelcontextprotocol.io', 'Model Context Protocol Documentation', 'PRIMARY_RESEARCH',
     CURRENT_TIMESTAMP, 'The Model Context Protocol standardizes JSON-RPC 2.0 communication between client hosts and agent tools.',
     'Standardizes JSON-RPC 2.0 communication between client hosts and agent tools', 0.96, 'VERIFIED')
    ON CONFLICT (id) DO NOTHING
  `, [ev1Id, channelId, ev2Id]);

  // Seed sample Claims
  const cl1Id = 'claim-demo-001';
  const cl2Id = 'claim-demo-002';

  await db.query(`
    INSERT INTO claims (
      id, draft_id, channel_id, text, normalized_text, importance,
      confidence, verification_status, source_evidence_ids
    ) VALUES
    ($1, $2, $3, 'DeepSeek-V3 uses 671B total parameters with 37B active', 'deepseek v3 uses 671b total parameters with 37b active',
     'CRITICAL', 0.98, 'VERIFIED', $4),
    ($5, 'draft-demo-002', $3, 'MCP uses JSON-RPC 2.0 protocol over Stdio and SSE', 'mcp uses json rpc 2.0 protocol over stdio and sse',
     'CRITICAL', 0.96, 'VERIFIED', $6)
    ON CONFLICT (id) DO NOTHING
  `, [
    cl1Id, draft1Id, channelId, JSON.stringify([ev1Id]),
    cl2Id, JSON.stringify([ev2Id])
  ]);
}
