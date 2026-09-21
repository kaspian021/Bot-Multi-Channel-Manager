-- ==============================================================
-- PostgreSQL Database Schema — AI Multi-Channel Telegram Manager
-- ==============================================================

CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_user_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    telegram_chat_id TEXT,
    telegram_channel_username TEXT,
    language TEXT NOT NULL DEFAULT 'en',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    description TEXT,
    bio TEXT,
    profile_image_url TEXT,
    posting_frequency INTEGER NOT NULL DEFAULT 3,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS channel_strategies (
    channel_id TEXT PRIMARY KEY REFERENCES channels(id) ON DELETE CASCADE,
    language TEXT NOT NULL DEFAULT 'en',
    target_audience TEXT,
    tone TEXT DEFAULT 'expert, clear, concise',
    style TEXT DEFAULT 'modern technology editor',
    posting_frequency INTEGER DEFAULT 3,
    preferred_posting_windows TEXT NOT NULL DEFAULT '["09:00","14:00","20:00"]',
    minimum_score INTEGER DEFAULT 75,
    minimum_confidence INTEGER DEFAULT 70,
    hashtag_policy TEXT DEFAULT 'minimal',
    emoji_policy TEXT DEFAULT 'moderate',
    media_policy TEXT DEFAULT 'ai_or_preview',
    preferred_topics TEXT DEFAULT '[]',
    excluded_topics TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS channel_brand_proposals (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    proposed_name TEXT NOT NULL,
    proposed_description TEXT NOT NULL,
    positioning TEXT NOT NULL,
    profile_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    keywords TEXT NOT NULL DEFAULT '[]',
    excluded_keywords TEXT NOT NULL DEFAULT '[]',
    importance INTEGER NOT NULL DEFAULT 8,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_topic_channel_slug UNIQUE (channel_id, slug)
);

CREATE TABLE IF NOT EXISTS content_sources (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    priority INTEGER NOT NULL DEFAULT 5,
    trust_score INTEGER NOT NULL DEFAULT 80,
    tags TEXT NOT NULL DEFAULT '[]',
    polling_interval_minutes INTEGER NOT NULL DEFAULT 180,
    language TEXT NOT NULL DEFAULT 'en',
    last_successful_fetch TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS research_runs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'RUNNING',
    candidates_found INTEGER NOT NULL DEFAULT 0,
    provider TEXT NOT NULL,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_candidates (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    research_run_id TEXT,
    source_id TEXT,
    title TEXT NOT NULL,
    canonical_url TEXT NOT NULL,
    normalized_url TEXT NOT NULL,
    author TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    content_type TEXT NOT NULL DEFAULT 'NEWS',
    summary TEXT NOT NULL,
    source_language TEXT NOT NULL DEFAULT 'en',
    extracted_claims TEXT NOT NULL DEFAULT '[]',
    score_json TEXT NOT NULL DEFAULT '{}',
    is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
    duplicate_of_candidate_id TEXT,
    duplicate_decision_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE content_candidates ADD COLUMN IF NOT EXISTS source_language TEXT NOT NULL DEFAULT 'en';

CREATE TABLE IF NOT EXISTS content_drafts (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    candidate_id TEXT,
    topic TEXT NOT NULL,
    title TEXT NOT NULL,
    headline TEXT NOT NULL,
    body TEXT NOT NULL,
    explanation TEXT,
    why_it_matters TEXT NOT NULL DEFAULT '[]',
    technical_context TEXT,
    what_to_watch TEXT,
    content_type TEXT NOT NULL DEFAULT 'NEWS',
    confidence_score INTEGER NOT NULL DEFAULT 85,
    content_score INTEGER NOT NULL DEFAULT 85,
    status TEXT NOT NULL DEFAULT 'DRAFTED',
    suggested_publish_time TEXT NOT NULL,
    media_url TEXT,
    media_prompt TEXT,
    sources TEXT NOT NULL DEFAULT '[]',
    fact_check_items TEXT NOT NULL DEFAULT '[]',
    quality_evaluation TEXT DEFAULT '{}',
    telegram_message_id INTEGER,
    rejection_reason TEXT,
    revision_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scheduled_posts (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    draft_id TEXT NOT NULL REFERENCES content_drafts(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    idempotency_key TEXT NOT NULL UNIQUE,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS published_posts (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    draft_id TEXT NOT NULL REFERENCES content_drafts(id) ON DELETE CASCADE,
    scheduled_post_id TEXT,
    telegram_message_id INTEGER NOT NULL,
    telegram_chat_id TEXT NOT NULL,
    published_text TEXT NOT NULL,
    media_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    channel_id TEXT,
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prompt_templates (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    version INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,
    variables TEXT NOT NULL DEFAULT '[]',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Future Advertising Domain Tables (Section 55)
CREATE TABLE IF NOT EXISTS advertisements (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    sponsor_name TEXT NOT NULL,
    contact_info TEXT NOT NULL,
    ad_copy TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    target_date TIMESTAMP WITH TIME ZONE,
    price_cents INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- PHASE 2: CHANNEL BRAIN, ONBOARDING & MULTILINGUAL TABLES
-- ==============================================================

CREATE TABLE IF NOT EXISTS channel_brains (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    identity_json TEXT NOT NULL DEFAULT '{}',
    audience_json TEXT NOT NULL DEFAULT '{}',
    content_json TEXT NOT NULL DEFAULT '{}',
    style_json TEXT NOT NULL DEFAULT '{}',
    sources_json TEXT NOT NULL DEFAULT '{}',
    publishing_json TEXT NOT NULL DEFAULT '{}',
    media_json TEXT NOT NULL DEFAULT '{}',
    approval_json TEXT NOT NULL DEFAULT '{}',
    business_json TEXT NOT NULL DEFAULT '{}',
    restrictions_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_channel_brains_channel UNIQUE (channel_id)
);

ALTER TABLE channel_brains ADD COLUMN IF NOT EXISTS restrictions_json TEXT NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS channel_brain_versions (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    brain_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    snapshot_json TEXT NOT NULL,
    changed_fields TEXT NOT NULL DEFAULT '[]',
    changed_by TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS channel_language_settings (
    channel_id TEXT PRIMARY KEY REFERENCES channels(id) ON DELETE CASCADE,
    primary_channel_language TEXT NOT NULL DEFAULT 'en',
    content_language TEXT NOT NULL DEFAULT 'en',
    metadata_language TEXT NOT NULL DEFAULT 'en',
    headline_language TEXT NOT NULL DEFAULT 'en',
    hashtag_language TEXT NOT NULL DEFAULT 'en',
    cta_language TEXT NOT NULL DEFAULT 'en',
    media_text_language TEXT NOT NULL DEFAULT 'en',
    owner_communication_language TEXT NOT NULL DEFAULT 'en',
    allowed_source_languages TEXT NOT NULL DEFAULT '["en"]',
    fallback_language TEXT NOT NULL DEFAULT 'en',
    translation_policy TEXT NOT NULL DEFAULT 'SYNTHESIZE_TO_CONTENT_LANGUAGE',
    preserve_technical_terms BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS owner_preferences (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    rule TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1.0,
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS strategy_recommendations (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    current_value TEXT NOT NULL,
    recommended_value TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS channel_onboarding_sessions (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    owner_user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    step INTEGER NOT NULL DEFAULT 1,
    messages_json TEXT NOT NULL DEFAULT '[]',
    extracted_data_json TEXT NOT NULL DEFAULT '{}',
    proposed_brain_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance & Query Indexes (Section 42 & Phase 2)
CREATE INDEX IF NOT EXISTS idx_channels_workspace ON channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_channels_status ON channels(status);
CREATE INDEX IF NOT EXISTS idx_candidates_channel ON content_candidates(channel_id);
CREATE INDEX IF NOT EXISTS idx_candidates_normalized_url ON content_candidates(normalized_url);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON content_candidates(created_at);
CREATE INDEX IF NOT EXISTS idx_drafts_channel_status ON content_drafts(channel_id, status);
CREATE INDEX IF NOT EXISTS idx_drafts_created_at ON content_drafts(created_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_published_posts_channel ON published_posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_channel ON audit_logs(workspace_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_channel_brain_versions ON channel_brain_versions(channel_id, version);
CREATE INDEX IF NOT EXISTS idx_owner_preferences_channel ON owner_preferences(channel_id, status);
CREATE INDEX IF NOT EXISTS idx_strategy_recommendations_channel ON strategy_recommendations(channel_id, status);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_channel ON channel_onboarding_sessions(channel_id, status);
